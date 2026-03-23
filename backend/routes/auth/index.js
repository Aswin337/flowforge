const express = require('express')
const router = express.Router()
const { register, login, getMe } = require('../../authService')
const { auth } = require('../../middleware/auth')

function handleErr(err, res) {
  // Log full error for debugging
  console.error('[Auth Error]:', err?.message || err?.code || JSON.stringify(err))
  
  const status = err?.status || err?.code === '42P01' ? 500 : (err?.status || 500)
  let message = err?.message || 'Internal server error'

  // Supabase-specific errors
  if (err?.code === '42P01') message = 'Database table "users" not found. Please run schema.sql in Supabase first.'
  if (err?.code === '23505') message = 'Email already registered.'
  if (err?.message?.includes('users')) message = 'Database not set up. Run schema.sql in Supabase SQL editor first.'

  return res.status(err?.status || 500).json({ error: message })
}

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' })
    if (!email?.trim()) return res.status(400).json({ error: 'Email is required' })
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
    const result = await register({ name: name.trim(), email: email.trim().toLowerCase(), password, role })
    return res.status(201).json(result)
  } catch (err) { handleErr(err, res) }
})

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })
    const result = await login({ email: email.trim().toLowerCase(), password })
    return res.json(result)
  } catch (err) { handleErr(err, res) }
})

// POST /auth/logout
router.post('/logout', (req, res) => res.json({ ok: true }))

// GET /auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await getMe(req.user.id)
    return res.json(user)
  } catch (err) { handleErr(err, res) }
})

module.exports = router
