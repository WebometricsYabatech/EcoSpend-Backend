import express from 'express'
import { getReceiptHistory, deleteReceipt } from '../controllers/receiptController.js'
import protect from '../middleware/auth.js'

const router = express.Router()

router.get('/history', protect, getReceiptHistory)
router.delete('/:id', protect, deleteReceipt)

export default router
