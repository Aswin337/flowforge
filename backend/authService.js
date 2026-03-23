const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { v4: uuid } = require('uuid')
const { getServiceClient } = require('./supabase')

const SECRET = process.env.JWT_SECRET || 'flowforge-dev-secret'

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' })
}

async function register({ name, email, password, role = 'user' }) {
  const db = getServiceClient()

  // Check duplicate
  const { data: existing, error: checkErr } = await db
    .from('users').select('id').eq('email', email).maybeSingle()

  if (checkErr) {
    // Table doesn't exist
    if (checkErr.code === '42P01' || checkErr.message?.includes('does not exist')) {
      throw Object.assign(new Error('Database not set up. Please run schema.sql in your Supabase SQL editor.'), { status: 503 })
    }
    throw checkErr
  }
  if (existing) throw Object.assign(new Error('Email already registered'), { status: 409 })

  const hash = await bcrypt.hash(password, 10)
  const { data: user, error } = await db
    .from('users')
    .insert({ id: uuid(), name, email, password_hash: hash, role })
    .select('id,name,email,role,created_at')
    .single()

  if (error) {
    if (error.code === '42P01') throw Object.assign(new Error('Database not set up. Please run schema.sql in Supabase.'), { status: 503 })
    if (error.code === '23505') throw Object.assign(new Error('Email already registered'), { status: 409 })
    throw error
  }

  return {
    user,
    token: signToken({ id: user.id, email: user.email, role: user.role, name: user.name })
  }
}

async function login({ email, password }) {
  const db = getServiceClient()
  const { data: user, error } = await db
    .from('users').select('*').eq('email', email).maybeSingle()

  if (error) {
    if (error.code === '42P01') throw Object.assign(new Error('Database not set up. Please run schema.sql in Supabase.'), { status: 503 })
    throw error
  }
  if (!user) throw Object.assign(new Error('Invalid email or password'), { status: 401 })

  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) throw Object.assign(new Error('Invalid email or password'), { status: 401 })

  const { password_hash, ...safe } = user
  return {
    user: safe,
    token: signToken({ id: user.id, email: user.email, role: user.role, name: user.name })
  }
}

async function getMe(userId) {
  const db = getServiceClient()
  const { data, error } = await db
    .from('users').select('id,name,email,role,created_at').eq('id', userId).single()
  if (error || !data) throw Object.assign(new Error('User not found'), { status: 404 })
  return data
}

module.exports = { register, login, getMe }
