import prisma from '../lib/prisma.js'

// ================= GET RECEIPT HISTORY =================
export const getReceiptHistory = async (req, res) => {
  try {
    const userId = req.user.id
    const { page = 1, limit = 10 } = req.query

    // Get all scanned expenses ordered by createdAt
    const allScannedExpenses = await prisma.expense.findMany({
      where: { userId, isManual: false },
      orderBy: { createdAt: 'desc' }
    })

    // Group items into receipts by createdAt proximity (5 seconds = one receipt)
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

    // Format each receipt group
const receipts = receiptGroups.map((group, index) => {
  // Find first item that actually has a score and tip
  const scoredItem = group.find(e => e.sustainabilityScore && e.sustainabilityScore > 0)
  const tippedItem = group.find(e => e.sustainabilityTip)

  return {
    receiptId: `receipt-${group[0].createdAt.getTime()}`,
    storeName: group[0].storeName || 'Unknown Store',
    date: group[0].date,
    scannedAt: group[0].createdAt,
    category: group[0].category,
    itemCount: group.length,
    totalAmount: Math.round(group.reduce((sum, e) => sum + e.amount, 0) * 100) / 100,
    sustainabilityScore: scoredItem
      ? Math.round((scoredItem.sustainabilityScore / 10) * 100)
      : null,
    sustainabilityTip: tippedItem ? tippedItem.sustainabilityTip : null,
    items: group.map(e => ({
      id: e.id,
      name: e.description,
      price: e.amount,
      sustainabilityScore: e.sustainabilityScore
        ? Math.round((e.sustainabilityScore / 10) * 100)
        : null,
      sustainabilityTip: e.sustainabilityTip || null
    }))
  }
})

    // Pagination
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

// ================= DELETE RECEIPT =================
export const deleteReceipt = async (req, res) => {
  try {
    const { id } = req.params

    // Check receipt exists and belongs to this user
    const expense = await prisma.expense.findUnique({
      where: { id }
    })

    if (!expense) {
      return res.status(404).json({ message: 'Receipt not found' })
    }

    if (expense.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this receipt' })
    }

    await prisma.expense.delete({ where: { id } })

    return res.status(200).json({ message: 'Receipt deleted successfully' })
  } catch (error) {
    console.error('DELETE RECEIPT ERROR:', error)
    return res.status(500).json({ message: 'Server Error', error: error.message })
  }
}