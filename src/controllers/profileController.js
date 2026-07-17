import prisma from '../lib/prisma.js'
import bcrypt from 'bcryptjs'

// GET profile
export const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        fullname: true,
        email: true,
        budget: true,
        createdAt: true
      }
    })

    return res.status(200).json({ user })
  } catch (error) {
    console.error('GET PROFILE ERROR:', error)
    return res.status(500).json({ message: 'Server Error', error: error.message })
  }
}

// UPDATE profile
export const updateProfile = async (req, res) => {
  try {
    const { fullname, email } = req.body

    if (!fullname && !email) {
      return res.status(400).json({ message: 'Provide at least one field to update' })
    }

    // Check if new email is already taken by another user
    if (email) {
      const existingUser = await prisma.user.findUnique({ where: { email } })
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(409).json({ message: 'Email already in use by another account' })
      }
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(fullname && { fullname }),
        ...(email && { email })
      },
      select: {
        id: true,
        fullname: true,
        email: true,
        budget: true,
        createdAt: true
      }
    })

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: updated
    })
  } catch (error) {
    console.error('UPDATE PROFILE ERROR:', error)
    return res.status(500).json({ message: 'Server Error', error: error.message })
  }
}

// CHANGE PASSWORD
export const changePassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All password fields are required' })
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    })

    return res.status(200).json({ message: 'Password changed successfully' })
  } catch (error) {
    console.error('CHANGE PASSWORD ERROR:', error)
    return res.status(500).json({ message: 'Server Error', error: error.message })
  }
}