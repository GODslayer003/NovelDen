import jwt from 'jsonwebtoken'
import { readDB } from '../config/db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'novel-den-secret-2025'

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null
    return next()
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const db = readDB()
    const user = db.users.find(u => u.id === decoded.id)
    if (user) {
      req.user = { id: user.id, name: user.name, email: user.email, role: user.role }
    } else {
      req.user = null
    }
  } catch (err) {
    req.user = null
  }
  next()
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' })
  }
  next()
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin permissions required.' })
  }
  next()
}
