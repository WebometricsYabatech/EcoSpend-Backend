import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// CREATE - Add expense (manual or from AI scan)
export const addExpense = async (req, res) => {
  const { amount, category, storeName, description, sustainabilityScore, receiptUrl, isManual, date } = req.body

  try {
    const expense = await prisma.expense.create({
      data: {
        userId: req.user.id,
        amount: parseFloat(amount),
        category,
        storeName,
        description,
        sustainabilityScore: sustainabilityScore ? parseInt(sustainabilityScore) : null,
        receiptUrl,
        isManual: isManual ?? true,
        date: date ? new Date(date) : new Date()
      }
    })
    res.status(201).json({ message: 'Expense added', expense })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// READ - Get all expenses for logged in user
export const getExpenses = async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      where: { userId: req.user.id },
      orderBy: { date: 'desc' }
    })
    res.status(200).json({ expenses })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// READ - Get single expense
export const getExpenseById = async (req, res) => {
  const { id } = req.params

  try {
    const expense = await prisma.expense.findUnique({ where: { id } })

    if (!expense || expense.userId !== req.user.id) {
      return res.status(404).json({ message: 'Expense not found' })
    }

    res.status(200).json({ expense })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// UPDATE - Edit an expense
export const updateExpense = async (req, res) => {
  const { id } = req.params
  const { amount, category, storeName, description, sustainabilityScore, date } = req.body

  try {
    const existing = await prisma.expense.findUnique({ where: { id } })

    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ message: 'Expense not found' })
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        amount: amount !== undefined ? parseFloat(amount) : existing.amount,
        category: category ?? existing.category,
        storeName: storeName ?? existing.storeName,
        description: description ?? existing.description,
        sustainabilityScore: sustainabilityScore !== undefined ? parseInt(sustainabilityScore) : existing.sustainabilityScore,
        date: date ? new Date(date) : existing.date
      }
    })

    res.status(200).json({ message: 'Expense updated', expense })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// DELETE - Remove an expense
export const deleteExpense = async (req, res) => {
  const { id } = req.params

  try {
    const existing = await prisma.expense.findUnique({ where: { id } })

    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ message: 'Expense not found' })
    }

    await prisma.expense.delete({ where: { id } })

    res.status(200).json({ message: 'Expense deleted' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// REPORT - Spending by store, grouped by month/year
export const getStoreReport = async (req, res) => {
  const { storeName, year, month } = req.query

  try {
    const where = { userId: req.user.id }

    if (storeName) where.storeName = storeName

    if (year) {
      const startDate = new Date(`${year}-${month ? month.padStart(2, '0') : '01'}-01`)
      const endDate = month
        ? new Date(new Date(startDate).setMonth(startDate.getMonth() + 1))
        : new Date(`${parseInt(year) + 1}-01-01`)

      where.date = { gte: startDate, lt: endDate }
    }

    const expenses = await prisma.expense.findMany({ where })

    const total = expenses.reduce((sum, e) => sum + e.amount, 0)

    res.status(200).json({
      storeName: storeName || 'All stores',
      period: year ? (month ? `${year}-${month}` : year) : 'All time',
      totalSpent: total,
      count: expenses.length,
      expenses
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}