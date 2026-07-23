import prisma from '../lib/prisma.js'
import cloudinary from '../middleware/cloudinary.js'

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

// UPDATE profile (fullname and/or budget)
export const updateProfile = async (req, res) => {
  const { fullname, budget } = req.body

  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        fullname: fullname ?? undefined,
        budget: budget ? parseFloat(budget) : undefined
      },
      select: {
        id: true,
        fullname: true,
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

    // Build a data URI from the in-memory buffer (multer uses memoryStorage)
    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'ecospend/avatars',
      transformation: [
        { width: 300, height: 300, crop: 'fill', gravity: 'face' }
      ]
    })

    // Save Cloudinary URL to database
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl: result.secure_url },
      select: {
        id: true,
        fullname: true,
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