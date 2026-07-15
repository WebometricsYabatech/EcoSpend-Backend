import express from 'express'
import protect from '../middleware/auth.js'
import upload from '../middleware/upload.js'
import {
  getProfile,
  updateProfile,
  uploadAvatar
} from '../controllers/userController.js'

const router = express.Router()

router.use(protect)

router.get('/profile', getProfile)
router.put('/profile', updateProfile)
router.post('/avatar', upload.single('avatar'), uploadAvatar)

export default router