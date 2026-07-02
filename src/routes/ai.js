import express from 'express'
import protect from '../middleware/auth.js'
import upload from '../middleware/upload.js'
import { scanReceipt, confirmReceipt } from '../controllers/aiController.js'

const router = express.Router()

router.use(protect)

router.post('/scan-receipt', upload.single('receipt'), scanReceipt)
router.post('/confirm-receipt', confirmReceipt)

export default router