import express from 'express'
import passport from 'passport'
import jwt from 'jsonwebtoken'
import { register, login, logout, deleteAccount } from '../controllers/authController.js'
import protect from '../middleware/auth.js'

const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.post('/logout', protect, logout)
router.delete('/account', protect, deleteAccount)

// ── Google OAuth ──
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
)

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed` }),
  (req, res) => {
    // Generate JWT token
    const token = jwt.sign(
      { id: req.user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Save token to user
    // Redirect to frontend with token
    res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?token=${token}&userId=${req.user.id}`
    )
  }
)

export default router