import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import swaggerDocument from './swagger.js'
// import path from 'path' // not needed since we removed disk storage

import expenseRoutes from './routes/expenses.js'
import authRoutes from './routes/auth.js'
import aiRoutes from './routes/ai.js'
import receiptRoutes from './routes/receipts.js'
import budgetRoutes from './routes/budget.js'
import dashboardRoutes from './routes/dashboard.js'
import categoryRoutes from './routes/categories.js'
import profileRoutes from './routes/profile.js'
import transactionRoutes from './routes/transactions.js'
import userRoutes from './routes/user.js'
import adminRoutes from './routes/admin.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const app = express()

// ✅ Open CORS — allows all origins (safe for now, tighten after demo)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    return callback(null, false)
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const swaggerHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>EcoSpend API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" />
    <style>
      body { margin: 0; background: #f5f7fb; }
      #swagger-ui { max-width: 1100px; margin: 20px auto; }
      .topbar { display: none; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        SwaggerUIBundle({
          url: '/api-docs.json',
          dom_id: '#swagger-ui',
          deepLinking: true,
          persistAuthorization: true,
          presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
          layout: 'BaseLayout',
          theme: 'agate'
        })
      }
    </script>
  </body>
</html>`

app.get('/api-docs', (req, res) => {
  res.type('html').send(swaggerHtml)
})

app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.send(swaggerDocument)
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/receipts', receiptRoutes)
app.use('/api/budget', budgetRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/user', userRoutes)
app.use('/api/admin', adminRoutes)

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