import express from 'express'
import { getProfile, updateProfile, changePassword } from '../controllers/profileController.js'
import protect from '../middleware/auth.js'
import prisma from '../lib/prisma.js'

const router = express.Router()

router.get('/', protect, getProfile)
router.put('/', protect, updateProfile)
router.put('/change-password', protect, changePassword)
router.put('/currency', protect, async (req, res) => {
  try {
    const { currency } = req.body
    const supported = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR']

    if (!currency || !supported.includes(currency)) {
      return res.status(400).json({
        message: 'Invalid currency',
        supported
      })
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { currency },
      select: { id: true, currency: true }
    })

    return res.status(200).json({
      message: 'Currency updated successfully',
      currency: user.currency
    })
  } catch (error) {
    return res.status(500).json({ message: 'Server Error', error: error.message })
  }
})

export default router
