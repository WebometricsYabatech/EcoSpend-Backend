import prisma from '../lib/prisma.js'

const adminOnly = async (req, res, next) => {
  try {
    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(email => email.trim())
      .filter(Boolean)

    if (adminEmails.length === 0) {
      return res.status(500).json({ message: 'Server misconfiguration: ADMIN_EMAILS is missing' })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { email: true }
    })

    if (!user || !adminEmails.includes(user.email)) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' })
    }

    return next()
  } catch (error) {
    return res.status(500).json({ message: 'Server Error', error: error.message })
  }
}

export default adminOnly
