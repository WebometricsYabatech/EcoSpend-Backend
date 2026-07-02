import prisma from '../lib/prisma.js'

// ================= SET / UPDATE BUDGET =================
export const setBudget = async (req, res) => {
  try {
    const { amount } = req.body

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Please provide a valid budget amount' })
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { budget: parseFloat(amount) }
    })

    return res.status(200).json({
      message: 'Budget updated successfully',
      budget: user.budget
    })
  } catch (error) {
    console.error('SET BUDGET ERROR:', error)
    return res.status(500).json({ message: 'Server Error', error: error.message })
  }
}

// ================= GET BUDGET + SPENDING SUMMARY =================
export const getBudget = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    })

    // Get total spent this month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const expenses = await prisma.expense.findMany({
      where: {
        userId: req.user.id,
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    })

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0)
    const remaining = (user.budget || 0) - totalSpent
    const percentageUsed = user.budget
      ? Math.round((totalSpent / user.budget) * 100)
      : 0

    return res.status(200).json({
      budget: user.budget || 0,
      totalSpent,
      remaining: remaining < 0 ? 0 : remaining,
      percentageUsed,
      isExceeded: totalSpent > (user.budget || 0)
    })
  } catch (error) {
    console.error('GET BUDGET ERROR:', error)
    return res.status(500).json({ message: 'Server Error', error: error.message })
  }
}