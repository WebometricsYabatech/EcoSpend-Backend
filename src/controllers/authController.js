import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma.js'


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