const { createClient } = require('@supabase/supabase-js')

const url  = process.env.SUPABASE_URL || ''
const anon = process.env.SUPABASE_ANON_KEY || ''

if (!url || !anon) {
  console.warn('[Supabase] Missing SUPABASE_URL / SUPABASE_ANON_KEY in .env')
}

let _anon = null
function getClient() {
  if (!_anon) _anon = createClient(url, anon, { auth: { persistSession: false } })
  return _anon
}

let _service = null
function getServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return getClient()
  if (!_service) _service = createClient(url, key, { auth: { persistSession: false } })
  return _service
}

module.exports = { getClient, getServiceClient }
