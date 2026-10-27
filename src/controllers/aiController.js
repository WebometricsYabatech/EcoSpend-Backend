import Groq from 'groq-sdk'
import axios from 'axios'
import FormData from 'form-data'
import prisma from '../lib/prisma.js'
import cloudinary from '../middleware/cloudinary.js'
import { sendBudgetAlertEmail } from '../utils/email.js'

const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    return null
  }

  return new Groq({ apiKey })
}

const round2 = (value) => Math.round(value * 100) / 100

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

// ================= SCAN RECEIPT =================
export const scanReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No receipt image uploaded' })
    }

    // ── Upload receipt to Cloudinary for preview ──
    let receiptUrl = null
    try {
      const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
      const uploadResult = await cloudinary.uploader.upload(dataUri, {
        folder: 'ecospend/receipts',
        resource_type: 'auto'
      })
      receiptUrl = uploadResult.secure_url
    } catch (uploadError) {
      console.error('Cloudinary upload error:', uploadError.message)
    }

    // ── Send to OCR.space for text extraction ──
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
      { headers: formData.getHeaders(), timeout: 55000 }
    )

    const parsedText = ocrResponse.data?.ParsedResults?.[0]?.ParsedText

    if (!parsedText || parsedText.trim().length === 0) {
      return res.status(400).json({ message: 'Could not extract text from receipt' })
    }

    const groqClient = getGroqClient()

    if (!groqClient) {
      return res.status(500).json({
        message: 'Groq API key is not configured. Please add GROQ_API_KEY to the environment.'
      })
    }

    // ── Send extracted text to Groq with fallback models ──
    const prompt = `You are an expert receipt analyst for a sustainable spending tracker app.
Below is raw text extracted from a receipt using OCR. Analyse it carefully.

Your job is to:
1. Extract every purchased item and its exact price
2. Determine the correct spending category based on the store type and items
3. Calculate an honest sustainability score based on what was actually purchased

Financial field rules:
- subtotal is the pre-tax total; tax is the total tax charged; totalAmount is the final total paid.
- Use null (not 0) for any financial field that is not visible on the receipt.
- currency is the receipt's 3-letter ISO currency code (e.g. NGN, USD, GBP); use null only when truly unknown.
- confidence is a number from 0 to 1 estimating how certain you are about the extracted merchant, date, subtotal, tax, total and currency (1 = very confident, 0 = guessing).

Return ONLY valid JSON with no extra text, no markdown, no backticks:
{
  "storeName": "exact store name from receipt, or null if not visible",
  "date": "date printed on the receipt in YYYY-MM-DD format, or null if not visible",
  "currency": null,
  "subtotal": null,
  "tax": null,
  "totalAmount": 0.00,
  "items": [
    {
      "name": "exact item name as written on receipt",
      "price": 0.00
    }
  ],
  "category": "choose the MOST ACCURATE category from this list based on what was purchased: Groceries, Food & Dining, Transport, Utilities, Clothing, Electronics, Health, Entertainment, Other",
  "confidence": 0.0,
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

    const models = ['openai/gpt-oss-20b', 'llama-3.1-8b-instant']
    let groqResponse

    for (const model of models) {
      try {
        groqResponse = await groqClient.chat.completions.create({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000
        })
        console.log(`Used model: ${model}`)
        break
      } catch (err) {
        console.error(`Model ${model} failed:`, err.message)
        if (model === models[models.length - 1]) throw err
      }
    }

    const responseText = groqResponse.choices[0].message.content

    let cleanedText = responseText.replace(/```json|```/g, '').trim()

    // Extract JSON object if wrapped in other text
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(500).json({
        message: 'AI returned invalid response, please try again'
      })
    }
    cleanedText = jsonMatch[0]

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
      receiptUrl,
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
    const {
      items, category, totalAmount, total, subtotal, tax, currency,
      sustainabilityScore, sustainabilityTip, confidence,
      storeName, store, date, receiptDate,
      receiptImage, receiptImageUrl, receiptUrl
    } = req.body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No items provided' })
    }

    // Canonical field handling — accept legacy aliases until the frontend contract is aligned.
    const merchant = storeName || store || null
    const receiptTotal = toNumber(totalAmount ?? total)
    const sub = toNumber(subtotal)
    const taxAmount = toNumber(tax)
    const currencyCode = currency || 'NGN'
    const confidenceValue = toNumber(confidence)
    const receiptDateValue = receiptDate || date || null
    const imageUrl = receiptImage || receiptImageUrl || receiptUrl || null

    // FR-01: validate arithmetic when subtotal, tax and total are all present.
    if (sub !== null && taxAmount !== null && receiptTotal !== null) {
      const computedTotal = round2(sub + taxAmount)
      if (Math.abs(computedTotal - round2(receiptTotal)) >= 0.01) {
        return res.status(400).json({
          message: 'Receipt totals do not add up. Please correct subtotal, tax or total before saving.',
          validation: {
            arithmeticMismatch: true,
            subtotal: sub,
            tax: taxAmount,
            total: receiptTotal,
            computedTotal
          }
        })
      }
    }

    // FR-06: detect likely duplicates (merchant + total + receipt date) and require explicit override.
    const duplicateWhere = { userId: req.user.id, isManual: false }
    if (merchant) duplicateWhere.storeName = merchant
    if (receiptTotal !== null) duplicateWhere.receiptTotal = receiptTotal
    if (receiptDateValue) duplicateWhere.date = new Date(receiptDateValue)

    const hasDuplicateSignal = merchant || receiptTotal !== null || receiptDateValue
    const duplicate = hasDuplicateSignal
      ? await prisma.expense.findFirst({ where: duplicateWhere })
      : null

    if (duplicate && req.body.force !== true) {
      return res.status(409).json({
        message: 'This receipt appears to be a duplicate.',
        duplicate: true,
        duplicateReceiptId: duplicate.id
      })
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

    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    const resolvedCurrency = currencyCode || user?.currency || 'NGN'
    const resolvedScore = sustainabilityScore && parseInt(sustainabilityScore) > 0
      ? parseInt(sustainabilityScore)
      : null

    // ── Save all items as expenses ──
    const expenses = await Promise.all(
      items.map((item, index) =>
        prisma.expense.create({
          data: {
            userId: req.user.id,
            amount: round2(toNumber(item.price) ?? 0),
            category: category || 'Other',
            description: item.name,
            sustainabilityScore: resolvedScore,
            sustainabilityTip: sustainabilityTip || null,
            storeName: merchant,
            receiptUrl: imageUrl,
            receiptTotal: index === 0 ? receiptTotal : null,
            subtotal: index === 0 ? sub : null,
            tax: index === 0 ? taxAmount : null,
            currency: resolvedCurrency,
            confidence: index === 0 ? confidenceValue : null,
            isManual: false,
            date: receiptDateValue ? new Date(receiptDateValue) : new Date()
          }
        })
      )
    )

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
    const isNearBudget = user.budget && totalSpent >= user.budget * 0.8

    console.log('USER OBJECT:', user)
    console.log('USER EMAIL:', user?.email)

    if (isOverBudget || isNearBudget) {
      await sendBudgetAlertEmail(user, totalSpent, user.budget)
    }

    return res.status(201).json({
      message: 'Receipt saved successfully',
      savedCount: expenses.length,
      sustainabilityTip,
      budgetAlert: isOverBudget
        ? `Warning: You have exceeded your monthly budget of ${user.budget}`
        : isNearBudget
          ? `Notice: You are approaching your monthly budget of ${user.budget}`
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