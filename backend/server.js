require('dotenv').config()
const express = require('express')
const cors = require('cors')
const app = express()

app.use(cors({ origin: '*', credentials: true }))
app.use(express.json())

// ── Routes ────────────────────────────────────────────────────
app.use('/auth',       require('./routes/auth'))
app.use('/workflows',  require('./workflows/route'))
app.use('/steps',      require('./routes/steps'))
app.use('/rules',      require('./routes/rules'))
app.use('/executions', require('./executions/route'))
app.use('/stats',      require('./stats/route'))

// ── Health ────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({
  ok: true, service: 'FlowForge API v2',
  timestamp: new Date().toISOString(),
  env: {
    supabase_url: process.env.SUPABASE_URL ? '✅ set' : '❌ missing',
    supabase_key: process.env.SUPABASE_ANON_KEY ? '✅ set' : '❌ missing',
    service_key:  process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ set' : '⚠ missing (using anon)',
    jwt_secret:   process.env.JWT_SECRET ? '✅ set' : '⚠ using default (change in production!)',
  }
}))

app.get('/health', async (req, res) => {
  try {
    const { getServiceClient } = require('./supabase')
    const db = getServiceClient()
    const { error } = await db.from('users').select('id', { count: 'exact', head: true })
    if (error?.code === '42P01') {
      return res.status(503).json({
        ok: false, db: 'tables missing',
        action: 'Run schema.sql in your Supabase SQL editor'
      })
    }
    res.json({ ok: !error, db: error ? `error: ${error.message}` : 'connected' })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// 404 handler
app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }))

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err.message)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`✅ FlowForge API running at http://localhost:${PORT}`)
  console.log(`   Health check: http://localhost:${PORT}/health`)
  if (!process.env.SUPABASE_URL)    console.warn('⚠  SUPABASE_URL not set in .env')
  if (!process.env.SUPABASE_ANON_KEY) console.warn('⚠  SUPABASE_ANON_KEY not set in .env')
})
