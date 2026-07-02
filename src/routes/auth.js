import express from 'express'
import { register, login, logout, deleteAccount } from '../controllers/authController.js'
import protect from '../middleware/auth.js'

const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.post('/logout', protect, logout)
router.delete('/account', protect, deleteAccount)

export default router