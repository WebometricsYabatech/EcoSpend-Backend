import expenseRoutes from './routes/expenses.js'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import aiRoutes from './routes/ai.js'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/ai', aiRoutes)
app.use('/uploads', express.static('uploads'))

app.get('/', (req, res) => {
  res.send('Spendwise API is running')
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))