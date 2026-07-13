import express from 'express'
import { getTransactions, getTransaction, updateTransaction } from '../controllers/transactionController.js'
import protect from '../middleware/auth.js'

const router = express.Router()

router.get('/', protect, getTransactions)
router.get('/:id', protect, getTransaction)
router.put('/:id', protect, updateTransaction)

export default router