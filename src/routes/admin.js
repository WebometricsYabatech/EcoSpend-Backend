import express from 'express'
import { getAdminDashboard } from '../controllers/adminController.js'
import protect from '../middleware/auth.js'
import adminOnly from '../middleware/admin.js'

const router = express.Router()

router.get('/dashboard', protect, adminOnly, getAdminDashboard)

export default router
