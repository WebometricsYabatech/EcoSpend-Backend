import { PrismaClient } from '@prisma/client'
import cloudinary from '../middleware/cloudinary.js'
import fs from 'fs'

const prisma = new PrismaClient()

// GET profile
export const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        budget: true,
        avatarUrl: true,
        createdAt: true
      }
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.status(200).json({ user })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// UPDATE profile (name and/or budget)
export const updateProfile = async (req, res) => {
  const { name, budget } = req.body

  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name ?? undefined,
        budget: budget ? parseFloat(budget) : undefined
      },
      select: {
        id: true,
        name: true,
        email: true,
        budget: true,
        avatarUrl: true,
        createdAt: true
      }
    })

    res.status(200).json({ message: 'Profile updated', user })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// UPLOAD avatar
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' })
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'spendwise/avatars',
      transformation: [
        { width: 300, height: 300, crop: 'fill', gravity: 'face' }
      ]
    })

    // Delete temp file after upload
    fs.unlinkSync(req.file.path)

    // Save Cloudinary URL to database
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl: result.secure_url },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true
      }
    })

    res.status(200).json({
      message: 'Avatar updated successfully',
      avatarUrl: result.secure_url,
      user
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}