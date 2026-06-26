import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
// import { fileURLToPath } from 'url'
import expenseRoutes from './routes/expenses.js'
import authRoutes from './routes/auth.js'
import aiRoutes from './routes/ai.js'

dotenv.config()

const app = express()

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
  const isWildcard = allowedOrigins.includes("*")

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true) // non-browser clients
    if (isWildcard) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    return callback(null, false)
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
}

app.use(cors(corsOptions))
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  return next()
})

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/ai', aiRoutes)

// Uploads: serve the same absolute directory multer writes to
// const __filename = fileURLToPath(import.meta.url)
// const __dirname = path.dirname(__filename)

// Keep logic in sync with src/middleware/upload.js
const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR, 'receipts')
  : path.resolve('/tmp/uploads/receipts')


app.use('/uploads', express.static(uploadsDir))

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

