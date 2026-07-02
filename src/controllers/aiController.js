import { GoogleGenerativeAI } from '@google/generative-ai'
import prisma from '../lib/prisma.js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// ================= SCAN RECEIPT =================
export const scanReceipt = async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        message: 'Server misconfiguration: GEMINI_API_KEY is missing' 
      })
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No receipt image uploaded' })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // Use buffer directly from memory storage — no file path needed
    const imagePart = {
      inlineData: {
        data: req.file.buffer.toString('base64'),
        mimeType: req.file.mimetype
      }
    }

    const prompt = `
You are a receipt scanning assistant for a sustainable spending tracker app.
Analyze this receipt image and extract the following information.
Respond ONLY with valid JSON in this exact format, no extra text, no markdown:

{
  "items": [
    {
      "name": "item name",
      "price": 0.00
    }
  ],
  "category": "one of: Groceries, Food & Dining, Transport, Utilities, Clothing, Electronics, Health, Entertainment, Other",
  "totalAmount": 0.00,
  "sustainabilityScore": 0,
  "sustainabilityTip": "one short sentence tip for more sustainable choices"
}

Rules:
- sustainabilityScore is a number from 1 to 10 (10 = very sustainable)
- If you cannot read an item clearly, include your best guess anyway
- totalAmount should be the sum of all item prices
`

    const result = await model.generateContent([prompt, imagePart])
    const responseText = result.response.text()

    // Strip markdown fences if Gemini wraps response
    const cleanedText = responseText.replace(/```json|```/g, '').trim()
    const extractedData = JSON.parse(cleanedText)

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

    // Save each item as a separate expense
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

    // Check if total spending exceeds budget
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
