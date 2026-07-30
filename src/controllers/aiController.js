import Groq from 'groq-sdk'
import axios from 'axios'
import FormData from 'form-data'
import prisma from '../lib/prisma.js'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export const scanReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No receipt image uploaded' })
    }

    // Step 1 — Send image to OCR.space API
    const formData = new FormData()
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    })
    formData.append('apikey', process.env.OCR_SPACE_API_KEY)
    formData.append('language', 'eng')
    formData.append('isOverlayRequired', 'false')

    const ocrResponse = await axios.post(
      'https://api.ocr.space/parse/image',
      formData,
      { headers: formData.getHeaders(), timeout: 20000 }
    )

    const parsedText = ocrResponse.data?.ParsedResults?.[0]?.ParsedText
    //console.log('OCR EXRACTED TEXT:', parsedText)

    if (!parsedText || parsedText.trim().length === 0) {
      return res.status(400).json({ message: 'Could not extract text from receipt' })
    }

    // Step 2 — Send extracted text to Groq to structure as JSON
    const groqResponse = await groq.chat.completions.create({
  model: 'openai/gpt-oss-20b',
  messages: [
    {
      role: 'user',
      content: `You are a receipt parser for a sustainable spending tracker app.
Below is raw text extracted from a receipt image using OCR.
The text may be messy or misaligned because receipts have items on the left and prices on the right.
Carefully match each item name with its corresponding price.
Return ONLY valid JSON, no extra text, no markdown backticks:
{
  "storeName": "name of the store or vendor, use Unknown if not visible",
  "date": "date on the receipt in YYYY-MM-DD format, use today's date if not visible",
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
- Every item must have a price greater than 0 if a price exists anywhere on the receipt
- totalAmount should be the final total shown on the receipt, not a sum you calculate
- sustainabilityScore is 1 to 10 (10 = very sustainable)
- If an item truly has no price, use 0.00

Raw receipt text:
${parsedText}`
    }
  ],
  max_tokens: 2000
})
    const responseText = groqResponse.choices[0].message.content
//console.log('GROQ RAW RESPONSE:', responseText) // temporary debug

// Clean markdown fences
let cleanedText = responseText.replace(/```json|```/g, '').trim()

// If JSON is incomplete, try to close it
if (!cleanedText.endsWith('}')) {
  cleanedText = cleanedText + '}'
}

let extractedData
try {
  extractedData = JSON.parse(cleanedText)
} catch (parseError) {
  console.error('JSON PARSE ERROR:', parseError.message)
  console.error('RAW TEXT:', cleanedText)
  return res.status(500).json({
    message: 'AI returned invalid response, please try again',
    error: parseError.message
  })
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

    // Prevent duplicate submissions within 10 seconds
    const tenSecondsAgo = new Date(Date.now() - 10000)
    const recentExpenses = await prisma.expense.count({
      where: {
        userId: req.user.id,
        isManual: false,
        createdAt: { gte: tenSecondsAgo }
      }
    })

    if (recentExpenses > 0) {
      return res.status(409).json({ message: 'Receipt already saved. Please wait before submitting again.' })
    }

    const expenses = await Promise.all(
      items.map(item =>
        prisma.expense.create({
          data: {
            userId: req.user.id,
            amount: parseFloat(item.price),
            category: category || 'Food',
            description: item.name,
            sustainabilityScore: sustainabilityScore || null,
            sustainabilityTip: sustainabilityTip || null,
            storeName: req.body.store || null,
            receiptUrl: req.body.receiptImage || null,
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