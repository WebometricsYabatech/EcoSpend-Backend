import prisma from '../lib/prisma.js'

export const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // All expenses this month
    const thisMonthExpenses = await prisma.expense.findMany({
      where: { userId, date: { gte: startOfMonth } }
    })

    // All expenses last month
    const lastMonthExpenses = await prisma.expense.findMany({
      where: { userId, date: { gte: startOfLastMonth, lte: endOfLastMonth } }
    })

    // User budget
    const user = await prisma.user.findUnique({ where: { id: userId } })

    // Totals
    const totalThisMonth = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0)
    const totalLastMonth = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0)

    // Spending by category this month
    const byCategory = thisMonthExpenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount
      return acc
    }, {})

    const categoryBreakdown = Object.entries(byCategory).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalThisMonth > 0
        ? Math.round((amount / totalThisMonth) * 100)
        : 0
    })).sort((a, b) => b.amount - a.amount)

    // Daily spending this month (for chart)
    const dailySpending = thisMonthExpenses.reduce((acc, e) => {
      const day = new Date(e.date).toISOString().split('T')[0]
      acc[day] = (acc[day] || 0) + e.amount
      return acc
    }, {})

    const dailyChart = Object.entries(dailySpending).map(([date, amount]) => ({
      date,
      amount
    })).sort((a, b) => new Date(a.date) - new Date(b.date))

    // Month comparison
    const monthChange = totalLastMonth > 0
      ? Math.round(((totalThisMonth - totalLastMonth) / totalLastMonth) * 100)
      : 0

    // Top 3 spending categories
    const topCategories = categoryBreakdown.slice(0, 3)

    // Recent 5 expenses grouped by receipt
    // Items saved within 5 seconds of each other = one receipt
    const allRecentExpenses = await prisma.expense.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    // Group into receipts by createdAt proximity
    const receiptGroups = []
    let currentGroup = []
    let lastTime = null

    for (const expense of allRecentExpenses) {
      const currentTime = new Date(expense.createdAt).getTime()
      if (!lastTime || lastTime - currentTime <= 5000) {
        currentGroup.push(expense)
      } else {
        if (currentGroup.length > 0) receiptGroups.push(currentGroup)
        currentGroup = [expense]
      }
      lastTime = currentTime
    }
    if (currentGroup.length > 0) receiptGroups.push(currentGroup)

    // Take 5 most recent receipt groups and summarise each
    const recentReceipts = receiptGroups.slice(0, 5).map(group => ({
      date: group[0].date,
      storeName: group[0].storeName || 'Unknown Store',
      itemCount: group.length,
      totalAmount: group.reduce((sum, e) => sum + e.amount, 0),
      category: group[0].category,
      isManual: group[0].isManual
    }))

    // Count unique receipt scans
    const scannedExpenses = await prisma.expense.findMany({
      where: { userId, isManual: false },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true }
    })

    let receiptScans = 0
    let lastScanTimestamp = null
    for (const expense of scannedExpenses) {
      const diff = lastScanTimestamp
        ? new Date(expense.createdAt) - new Date(lastScanTimestamp)
        : null
      if (!lastScanTimestamp || diff > 5000) {
        receiptScans++
        lastScanTimestamp = expense.createdAt
      }
    }

    // Average sustainability score
    const scoredExpenses = thisMonthExpenses.filter(e => e.sustainabilityScore)
    const avgSustainability = scoredExpenses.length > 0
      ? Math.round(scoredExpenses.reduce((sum, e) => sum + e.sustainabilityScore, 0) / scoredExpenses.length)
      : null

    return res.status(200).json({
      overview: {
        totalThisMonth,
        totalLastMonth,
        monthChange,
        budget: user.budget || 0,
        remaining: user.budget ? Math.max(0, user.budget - totalThisMonth) : null,
        percentageUsed: user.budget
          ? Math.round((totalThisMonth / user.budget) * 100)
          : null,
        isOverBudget: user.budget ? totalThisMonth > user.budget : false,
        receiptScans
      },
      categoryBreakdown,
      topCategories,
      dailyChart,
      recentReceipts,
      avgSustainabilityScore: avgSustainability
    })

  } catch (error) {
    console.error('DASHBOARD ERROR:', error)
    return res.status(500).json({ message: 'Server Error', error: error.message })
  }
}