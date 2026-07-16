import * as mindee from 'mindee'
import prisma from '../lib/prisma.js'

const mindeeClient = new mindee.Client({ apiKey: process.env.MINDEE_API_KEY })

// ================= SCAN RECEIPT =================
export const scanReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No receipt image uploaded' })
    }

    // Correct method for Mindee v5
    const inputSource = mindeeClient.docFromBuffer(
      req.file.buffer,
      req.file.originalname
    )

    // Mindee v5 uses enqueueAndParse for async polling
    const apiResponse = await mindeeClient.enqueueAndParse(
      mindee.product.ReceiptV5,
      inputSource
    )

    const receipt = apiResponse.document.inference.prediction

    // Extract line items
    const items = receipt.lineItems?.map(item => ({
      name: item.description || 'Unknown item',
      price: item.totalAmount || item.unitPrice || 0
    })) || []

    if (items.length === 0) {
      items.push({
        name: 'Total purchase',
        price: receipt.totalNet?.value || receipt.totalAmount?.value || 0
      })
    }

    // Category mapping
    const categoryMap = {
      food: 'Food & Dining',
      groceries: 'Groceries',
      transport: 'Transport',
      utilities: 'Utilities',
      clothing: 'Clothing',
      electronics: 'Electronics',
      health: 'Health',
      entertainment: 'Entertainment'
    }

    const rawCategory = receipt.category?.value?.toLowerCase() || ''
    const category = categoryMap[rawCategory] || 'Other'

    const extractedData = {
      storeName: receipt.supplierName?.value || 'Unknown store',
      date: receipt.date?.value || new Date().toISOString().split('T')[0],
      items,
      category,
      totalAmount: receipt.totalAmount?.value || 0,
      sustainabilityScore: 5,
      sustainabilityTip: 'Consider buying local and seasonal products to reduce your carbon footprint.'
    }

    return res.status(200).json({
      message: 'Receipt scanned successfully',
      extractedData
    })

  } catch (error) {
    console.error('SCAN RECEIPT ERROR:', error)
    return res.status(500).json({
      message: 'Failed to scan receipt',
      error: error.message
    })
  }
}

// ================= CONFIRM & SAVE RECEIPT =================
export const confirmReceipt = async (req, res) => {
  try {
    const { items, category, totalAmount, sustainabilityScore, sustainabilityTip } = req.body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No items provided' })
    }

    const expenses = await Promise.all(
      items.map(item =>
        prisma.expense.create({
          data: {
            userId: req.user.id,
            amount: parseFloat(item.price),
            category: category || 'Other',
            description: item.name,
            sustainabilityScore: sustainabilityScore || null,
            isManual: false,
            date: new Date()
          }
        })
      )
    )

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    })

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const allExpenses = await prisma.expense.findMany({
      where: {
        userId: req.user.id,
        date: { gte: startOfMonth }
      }
    })

    const totalSpent = allExpenses.reduce((sum, e) => sum + e.amount, 0)
    const isOverBudget = user.budget && totalSpent > user.budget

    return res.status(201).json({
      message: 'Receipt saved successfully',
      savedCount: expenses.length,
      sustainabilityTip,
      budgetAlert: isOverBudget
        ? `Warning: You have exceeded your monthly budget of ${user.budget}`
        : null
    })

  } catch (error) {
    console.error('CONFIRM RECEIPT ERROR:', error)
    return res.status(500).json({
      message: 'Failed to save receipt',
      error: error.message
    })
  }
}