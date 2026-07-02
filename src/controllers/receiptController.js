import prisma from '../lib/prisma.js'

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