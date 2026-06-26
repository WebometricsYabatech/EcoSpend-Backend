import jwt from 'jsonwebtoken'

const protect = (req, res, next) => {
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: 'Server misconfiguration: JWT_SECRET is missing' })
  }

  const auth = req.headers.authorization
  const token = auth?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'No token, unauthorized' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    return next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

export default protect

