import prisma from '../lib/prisma.js'

// GET all expenses with search & filter
export const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id
    const {
      search,
      category,
      from,
      to,
      minAmount,
      maxAmount,
      page = 1,
      limit = 10,
      sortBy = 'date',
      order = 'desc'
    } = req.query

    const filters = { userId }

    // Filter by category
    if (category) {
      filters.category = category
    }

    // Filter by date range
    if (from || to) {
      filters.date = {}
      if (from) filters.date.gte = new Date(from)
      if (to) filters.date.lte = new Date(to)
    }

    // Filter by amount range
    if (minAmount || maxAmount) {
      filters.amount = {}
      if (minAmount) filters.amount.gte = parseFloat(minAmount)
      if (maxAmount) filters.amount.lte = parseFloat(maxAmount)
    }

    // Search by description
    if (search) {
      filters.description = {
        contains: search,
        mode: 'insensitive'
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)

    // Get total count for pagination
    const totalCount = await prisma.expense.count({ where: filters })

    const transactions = await prisma.expense.findMany({
      where: filters,
      orderBy: { [sortBy]: order },
      skip,
      take: parseInt(limit)
    })

    const totalPages = Math.ceil(totalCount / parseInt(limit))

    return res.status(200).json({
      transactions,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    })
  } catch (error) {
    console.error('GET TRANSACTIONS ERROR:', error)
    return res.status(500).json({ message: 'Server Error', error: error.message })
  }
}

// GET single transaction
export const getTransaction = async (req, res) => {
  try {
    const { id } = req.params

    const transaction = await prisma.expense.findUnique({ where: { id } })

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' })
    }

    if (transaction.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    return res.status(200).json({ transaction })
  } catch (error) {
    console.error('GET TRANSACTION ERROR:', error)
    return res.status(500).json({ message: 'Server Error', error: error.message })
  }
}

// UPDATE transaction
export const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params
    const { amount, category, description, date } = req.body

    const transaction = await prisma.expense.findUnique({ where: { id } })

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' })
    }

    if (transaction.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        ...(amount && { amount: parseFloat(amount) }),
        ...(category && { category }),
        ...(description && { description }),
        ...(date && { date: new Date(date) })
      }
    })

    return res.status(200).json({
      message: 'Transaction updated successfully',
      transaction: updated
    })
  } catch (error) {
    console.error('UPDATE TRANSACTION ERROR:', error)
    return res.status(500).json({ message: 'Server Error', error: error.message })
  }
}