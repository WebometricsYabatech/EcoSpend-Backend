import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Convert image file to format Gemini accepts
const fileToGenerativePart = (filePath, mimeType) => {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString('base64'),
      mimeType
    }
  }
}

export const scanReceipt = async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res
        .status(500)
        .json({ message: 'Server misconfiguration: GEMINI_API_KEY is missing' })
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No receipt image uploaded' })
    }

    const filePath = req.file.path
    const mimeType = req.file.mimetype

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `
You are a receipt scanning assistant for a sustainable spending tracker app.
Analyze this receipt image and extract the following information.
Respond ONLY with valid JSON in this exact format, no extra text:

{
  "storeName": "string - name of the store",
  "date": "YYYY-MM-DD - date on the receipt, use today's date if not visible",
  "amount": number - total amount paid (just the number, no currency symbol),
  "category": "string - one of: Groceries, Food & Dining, Transport, Utilities, Clothing, Electronics, Health, Entertainment, Other",
  "sustainabilityScore": number - rate 1 to 10 how sustainable this purchase is (10 = very sustainable, 1 = not sustainable),
  "sustainabilityTip": "string - a short 1 sentence tip for more sustainable choices related to this purchase"
}
`

    const imagePart = fileToGenerativePart(filePath, mimeType)

    const result = await model.generateContent([prompt, imagePart])
    const responseText = result.response.text()

    // Clean up response in case Gemini wraps it in markdown code blocks
    const cleanedText = responseText.replace(/```json|```/g, '').trim()

    const extractedData = JSON.parse(cleanedText)

    res.status(200).json({
      message: 'Receipt scanned successfully',
      receiptUrl: filePath,
      extractedData
    })

  } catch (error) {
    res.status(500).json({ message: 'Failed to scan receipt', error: error.message })
  }
}