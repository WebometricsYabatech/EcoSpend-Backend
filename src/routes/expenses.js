import express from 'express'
import protect from '../middleware/auth.js'
import {
  addExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getStoreReport
} from '../controllers/expenseController.js'

const router = express.Router()

// All routes below require login
router.use(protect)

router.post('/', addExpense)
router.get('/', getExpenses)
router.get('/report', getStoreReport)
router.get('/:id', getExpenseById)
router.put('/:id', updateExpense)
router.delete('/:id', deleteExpense)

export default router