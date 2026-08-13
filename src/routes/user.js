import express from 'express'
import protect from '../middleware/auth.js'
import upload from '../middleware/upload.js'
import { uploadAvatar } from '../controllers/userController.js'

const router = express.Router()

router.use(protect)

router.post('/avatar', upload.single('avatar'), uploadAvatar)

export default router
