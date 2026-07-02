import express from 'express'
import { deleteReceipt } from '../controllers/receiptController.js'
import protect from '../middleware/auth.js'

const router = express.Router()

router.delete('/:id', protect, deleteReceipt)

export default router