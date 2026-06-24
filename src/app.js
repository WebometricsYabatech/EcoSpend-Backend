import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import expenseRoutes from './routes/expenses.js'
import authRoutes from './routes/auth.js'
import aiRoutes from './routes/ai.js'

dotenv.config()

const app = express()

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }

    return callback(new Error('Origin not allowed by CORS'))
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
}

app.use(cors(corsOptions))
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }

  return next()
})
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/ai', aiRoutes)
app.use('/uploads', express.static('uploads'))

app.get('/', (req, res) => {
  res.send('Ecospend API is running')
})

export default app