import express from 'express'
import { setBudget, getBudget } from '../controllers/budgetController.js'
import protect from '../middleware/auth.js'

const router = express.Router()

router.get('/', protect, getBudget)
router.put('/', protect, setBudget)

export default router