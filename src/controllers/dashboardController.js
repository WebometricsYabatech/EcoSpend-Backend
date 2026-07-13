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

    // Recent 5 expenses
    const recentExpenses = await prisma.expense.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 5
    })

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
        isOverBudget: user.budget ? totalThisMonth > user.budget : false
      },
      categoryBreakdown,
      topCategories,
      dailyChart,
      recentExpenses,
      avgSustainabilityScore: avgSustainability
    })

  } catch (error) {
    console.error('DASHBOARD ERROR:', error)
    return res.status(500).json({ message: 'Server Error', error: error.message })
  }
}