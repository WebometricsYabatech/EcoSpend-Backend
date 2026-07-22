import Tesseract from 'tesseract.js'
import Groq from 'groq-sdk'
import prisma from '../lib/prisma.js'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// ================= SCAN RECEIPT =================
export const scanReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No receipt image uploaded' })
    }

    // Step 1: Extract raw text from image using Tesseract OCR
    const { data: { text } } = await Tesseract.recognize(
      req.file.buffer,
      'eng',
      { logger: () => {} } // suppress logs
    )

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'Could not extract text from receipt image' })
    }

    // Step 2: Send extracted text to Groq text model to structure it
    const response = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [
        {
          role: 'user',
          content: `You are a receipt parser for a sustainable spending tracker app.
Below is raw text extracted from a receipt image using OCR.
Parse it and return ONLY valid JSON, no extra text, no markdown backticks:
{
  "storeName": "store name or Unknown if not visible",
  "date": "YYYY-MM-DD or null if not visible",
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
sustainabilityScore is a number from 1 to 10 (10 = very sustainable).
If you cannot identify a price for an item, use 0.00.

Raw receipt text:
${text}`
        }
      ],
      max_tokens: 1000
    })

    const responseText = response.choices[0].message.content
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