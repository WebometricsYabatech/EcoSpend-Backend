import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
// import path from 'path' // not needed since we removed disk storage

import expenseRoutes from './routes/expenses.js'
import authRoutes from './routes/auth.js'
import aiRoutes from './routes/ai.js'
import receiptRoutes from './routes/receipts.js'
import budgetRoutes from './routes/budget.js'

dotenv.config()

const app = express()

// ✅ Open CORS — allows all origins (safe for now, tighten after demo)
app.use(cors({
  origin: [
    'http://localhost:5174',
    'https://eco-spend-frontend.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/receipts', receiptRoutes)
app.use('/api/budget', budgetRoutes)

app.get('/', (req, res) => {
  res.send('Ecospend API is running')
})

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' })
})

// Centralized error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.statusCode || err.status || 500
  const message = err.message || 'Internal server error'

  if (process.env.NODE_ENV !== 'production') {
    return res.status(status).json({ message, error: err.stack || err })
  }

  return res.status(status).json({ message })
})

export default app