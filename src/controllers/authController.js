import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma.js'
import { sendWelcomeEmail } from '../utils/email.js'
import crypto from 'crypto'
import { sendEmail } from '../utils/email.js'

// REGISTER
export const register = async (req, res) => {
  const { fullname, email, password } = req.body

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: { fullname, email, password: hashedPassword }
    })

    // Send welcome email
    await sendWelcomeEmail(user)

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    })

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: user.id, fullname: user.fullname, email: user.email }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// LOGIN
export const login = async (req, res) => {
  const { email, password } = req.body

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    })

    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user.id, fullname: user.fullname, email: user.email }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ================= FORGOT PASSWORD =================
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ message: 'Email is required' })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      // Don't reveal if email exists or not
      return res.status(200).json({ message: 'If this email exists you will receive a reset link shortly' })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    await prisma.user.update({
      where: { email },
      data: { resetToken, resetTokenExpiry }
    })

    // Send reset email
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`

    await sendEmail({
      to: email,
      subject: 'Reset your EcoSpend password',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1A7F64; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Password Reset 🔐</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #1F3864;">Hi ${user.fullname},</h2>
            <p style="color: #444; line-height: 1.6;">
              We received a request to reset your password. Click the button below to reset it.
              This link expires in 15 minutes.
            </p>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${resetLink}" 
                 style="background: #1A7F64; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 6px; font-weight: bold;">
                Reset Password
              </a>
            </div>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">
              If you did not request this, please ignore this email. Your password will not change.
            </p>
          </div>
          <div style="padding: 20px; text-align: center; color: #999; font-size: 12px;">
            © 2026 EcoSpend. Sustainable Finance.
          </div>
        </div>
      `
    })

    return res.status(200).json({ message: 'If this email exists you will receive a reset link shortly' })

  } catch (error) {
    console.error('FORGOT PASSWORD ERROR:', error)
    return res.status(500).json({ message: 'Server Error', error: error.message })
  }
}

// ================= RESET PASSWORD =================
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() }
      }
    })

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    })

    return res.status(200).json({ message: 'Password reset successfully' })

  } catch (error) {
    console.error('RESET PASSWORD ERROR:', error)
    return res.status(500).json({ message: 'Server Error', error: error.message })
  }
}

// ================= LOGOUT =================
// JWT logout is typically client-side (delete token).
// This backend currently does not store refresh tokens, so we just return success.
export const logout = async (req, res) => {
  try {
    return res.status(200).json({ message: 'Logout successful' })
  } catch (error) {
    console.error('LOGOUT ERROR:', error)
    return res.status(500).json({ message: 'Server Error', error: error.message })
  }
}


// ================= DELETE ACCOUNT =================
export const deleteAccount = async (req, res) => {
  try {
    // Delete all user expenses first (foreign key constraint)
    await prisma.expense.deleteMany({
      where: { userId: req.user.id }
    })

    // Then delete the user
    await prisma.user.delete({
      where: { id: req.user.id }
    })

    return res.status(200).json({ message: 'Account deleted successfully' })
  } catch (error) {
    console.error('DELETE ACCOUNT ERROR:', error)
    return res.status(500).json({ message: 'Server Error', error: error.message })
  }
}

