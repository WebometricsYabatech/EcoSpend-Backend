import prisma from '../lib/prisma.js'

export const getAdminDashboard = async (req, res) => {
  try {
    // Total users
    const totalUsers = await prisma.user.count()

    // New users this month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const newUsersThisMonth = await prisma.user.count({
      where: { createdAt: { gte: startOfMonth } }
    })

    // Total expenses across all users
    const totalExpenses = await prisma.expense.count()

    // Total amount spent across all users
    const totalSpentResult = await prisma.expense.aggregate({
      _sum: { amount: true }
    })
    const totalAmountSpent = totalSpentResult._sum.amount || 0

    // Expenses this month
    const expensesThisMonth = await prisma.expense.findMany({
      where: { date: { gte: startOfMonth } }
    })
    const totalSpentThisMonth = expensesThisMonth.reduce((sum, e) => sum + e.amount, 0)

    // Top spending categories across all users
    const allExpenses = await prisma.expense.findMany({
      select: { category: true, amount: true }
    })
    const categoryTotals = allExpenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount
      return acc
    }, {})
    const topCategories = Object.entries(categoryTotals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

    // Average sustainability score
    const scoredExpenses = await prisma.expense.findMany({
      where: { sustainabilityScore: { not: null } },
      select: { sustainabilityScore: true }
    })
    const avgSustainability = scoredExpenses.length > 0
      ? Math.round(scoredExpenses.reduce((sum, e) => sum + e.sustainabilityScore, 0) / scoredExpenses.length)
      : null

    // Most active users (top 5 by expense count)
    const userExpenseCounts = await prisma.expense.groupBy({
      by: ['userId'],
      _count: { id: true },
      _sum: { amount: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    })

    const topUsers = await Promise.all(
      userExpenseCounts.map(async (u) => {
        const user = await prisma.user.findUnique({
          where: { id: u.userId },
          select: { fullname: true, email: true }
        })
        return {
          fullname: user?.fullname || 'Unknown',
          email: user?.email || 'Unknown',
          expenseCount: u._count.id,
          totalSpent: u._sum.amount
        }
      })
    )

    // Receipt scans count (isManual = false means AI scanned)
    const receiptScans = await prisma.expense.count({
      where: { isManual: false }
    })

    return res.status(200).json({
      overview: {
        totalUsers,
        newUsersThisMonth,
        totalExpenses,
        totalAmountSpent,
        totalSpentThisMonth,
        receiptScans,
        avgSustainabilityScore: avgSustainability
      },
      topCategories,
      topUsers
    })

  } catch (error) {
    console.error('ADMIN DASHBOARD ERROR:', error)
    return res.status(500).json({ message: 'Server Error', error: error.message })
  }
}