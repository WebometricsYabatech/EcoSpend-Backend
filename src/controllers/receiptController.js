import prisma from '../lib/prisma.js'

// ================= GET RECEIPT HISTORY =================
export const getReceiptHistory = async (req, res) => {
  try {
    const userId = req.user.id
    const { page = 1, limit = 10 } = req.query

    const allScannedExpenses = await prisma.expense.findMany({
      where: { userId, isManual: false },
      orderBy: { createdAt: 'desc' }
    })

    const receiptGroups = []
    let currentGroup = []
    let lastTime = null

    for (const expense of allScannedExpenses) {
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

    const receipts = receiptGroups.map((group) => {
      const scoredItem = group.find(e => e.sustainabilityScore && e.sustainabilityScore > 0)
      const tippedItem = group.find(e => e.sustainabilityTip)
      const totalAmount = group[0].receiptTotal ||
        Math.round(group.reduce((sum, e) => sum + e.amount, 0) * 100) / 100

      return {
        receiptId: `receipt-${group[0].createdAt.getTime()}`,
        storeName: group[0].storeName || 'Unknown Store',
        date: group[0].date,
        scannedAt: group[0].createdAt,
        category: group[0].category,
        itemCount: group.length,
        totalAmount,
        receiptUrl: group[0].receiptUrl || null,
        sustainabilityScore: scoredItem
          ? Math.round((scoredItem.sustainabilityScore / 10) * 100)
          : null,
        sustainabilityTip: tippedItem ? tippedItem.sustainabilityTip : null,
        items: group.map(e => ({
          id: e.id,
          name: e.description,
          price: e.amount,
          receiptUrl: e.receiptUrl || null,
          sustainabilityScore: e.sustainabilityScore
            ? Math.round((e.sustainabilityScore / 10) * 100)
            : null,
          sustainabilityTip: e.sustainabilityTip || null
        }))
      }
    })

    const total = receipts.length
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const paginated = receipts.slice(skip, skip + parseInt(limit))
    const totalPages = Math.ceil(total / parseInt(limit))

    return res.status(200).json({
      receipts: paginated,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    })

  } catch (error) {
    console.error('GET RECEIPT HISTORY ERROR:', error)
    return res.status(500).json({ message: 'Server Error', error: error.message })
  }
}

// ================= DELETE ONE RECEIPT (and all its items) =================
export const deleteReceipt = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const expense = await prisma.expense.findUnique({ where: { id } })

    if (!expense) {
      return res.status(404).json({ message: 'Receipt not found' })
    }

    if (expense.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    // Find all items in the same receipt group (within 5 seconds)
    const receiptTime = new Date(expense.createdAt).getTime()
    const allExpenses = await prisma.expense.findMany({
      where: { userId, isManual: false }
    })

    const groupIds = allExpenses
      .filter(e => Math.abs(new Date(e.createdAt).getTime() - receiptTime) <= 5000)
      .map(e => e.id)

    await prisma.expense.deleteMany({
      where: { id: { in: groupIds }, userId }
    })

    return res.status(200).json({
      message: 'Receipt deleted successfully',
      deletedCount: groupIds.length
    })

  } catch (error) {
    console.error('DELETE RECEIPT ERROR:', error)
    return res.status(500).json({ message: 'Server Error', error: error.message })
  }
}

// ================= DELETE ALL RECEIPTS =================
export const deleteAllReceipts = async (req, res) => {
  try {
    const deleted = await prisma.expense.deleteMany({
      where: {
        userId: req.user.id,
        isManual: false
      }
    })

    return res.status(200).json({
      message: 'All receipts deleted successfully',
      deletedCount: deleted.count
    })

  } catch (error) {
    console.error('DELETE ALL RECEIPTS ERROR:', error)
    return res.status(500).json({ message: 'Server Error', error: error.message })
  }
}