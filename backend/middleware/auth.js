const jwt = require('jsonwebtoken')
const SECRET = process.env.JWT_SECRET || 'flowforge-dev-secret'

function auth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized — Bearer token required' })
  }
  try {
    req.user = jwt.verify(header.slice(7), SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    try { req.user = jwt.verify(header.slice(7), SECRET) } catch {}
  }
  next()
}

module.exports = { auth, adminOnly, optionalAuth }
