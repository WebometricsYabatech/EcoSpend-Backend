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

    const formData = new FormData()
    const isPDF = req.file.mimetype === 'application/pdf'

    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    })
    formData.append('apikey', process.env.OCR_SPACE_API_KEY)
    formData.append('language', 'eng')
    formData.append('isOverlayRequired', 'false')
    formData.append('filetype', isPDF ? 'PDF' : 'Auto')
    formData.append('detectOrientation', 'true')
    formData.append('scale', 'true')

    const ocrResponse = await axios.post(
      'https://api.ocr.space/parse/image',
      formData,
      { headers: formData.getHeaders(), timeout: 20000 }
    )

    const parsedText = ocrResponse.data?.ParsedResults?.[0]?.ParsedText

    if (!parsedText || parsedText.trim().length === 0) {
      return res.status(400).json({ message: 'Could not extract text from receipt' })
    }

    const groqResponse = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [
        {
          role: 'user',
          content: `You are an expert receipt analyst for a sustainable spending tracker app.
Below is raw text extracted from a receipt using OCR. Analyse it carefully.

Your job is to:
1. Extract every purchased item and its exact price
2. Determine the correct spending category based on the store type and items
3. Calculate an honest sustainability score based on what was actually purchased

Return ONLY valid JSON with no extra text, no markdown, no backticks:
{
  "storeName": "exact store name from receipt or Unknown if not visible",
  "date": "date in YYYY-MM-DD format or todays date if not visible",
  "items": [
    {
      "name": "exact item name as written on receipt",
      "price": 0.00
    }
  ],
  "category": "choose the MOST ACCURATE category from this list based on what was purchased: Groceries, Food & Dining, Transport, Utilities, Clothing, Electronics, Health, Entertainment, Other",
  "totalAmount": 0.00,
  "sustainabilityScore": 0,
  "sustainabilityTip": "one specific actionable tip based on what was actually purchased"
}

Category selection rules — follow these strictly:
- Groceries: supermarkets, food items bought to cook at home, fresh produce
- Food & Dining: restaurants, cafes, fast food, takeaway, ready-to-eat food
- Transport: fuel, bus tickets, ride hailing, car parts, parking
- Utilities: electricity, water, internet, phone bills
- Clothing: clothes, shoes, bags, accessories
- Electronics: phones, laptops, gadgets, cables, accessories
- Health: pharmacy, hospital, gym, medical supplies
- Entertainment: cinema, games, events, subscriptions
- Other: anything that does not clearly fit the above

Sustainability score rules — be honest and specific, do NOT default to 5:
- Score 8-10: fresh produce, local products, reusable items, plant-based food
- Score 6-7: mixed shopping with some healthy or eco-friendly choices
- Score 4-5: processed foods, convenience items, fast food
- Score 2-3: fuel purchases, single-use plastics, heavily packaged goods
- Score 1: luxury items, excessive consumption, environmentally harmful products

Raw receipt text:
${parsedText}`
        }
      ],
      max_tokens: 2000
    })

    const responseText = groqResponse.choices[0].message.content

    let cleanedText = responseText.replace(/```json|```/g, '').trim()

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

    // ── Auto-save custom category if not in default list ──
    const defaultCategories = [
      'Groceries', 'Food & Dining', 'Transport', 'Utilities',
      'Clothing', 'Electronics', 'Health', 'Entertainment', 'Other'
    ]

    if (category && !defaultCategories.includes(category)) {
      const existingCategory = await prisma.category.findFirst({
        where: { userId: req.user.id, name: category }
      })

      if (!existingCategory) {
        await prisma.category.create({
          data: {
            name: category,
            userId: req.user.id
          }
        })
      }
    }

    // ── Save all items as expenses ──
    const expenses = await Promise.all(
      items.map(item =>
        prisma.expense.create({
          data: {
            userId: req.user.id,
            amount: parseFloat(item.price),
            category: category || 'Other',
            description: item.name,
            sustainabilityScore: sustainabilityScore ? parseInt(sustainabilityScore) : 5,
            sustainabilityTip: sustainabilityTip || 'Consider eco-friendly alternatives for a greener lifestyle.',
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