'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiLogin, apiRegister } from '../../lib/api'
import useAuthStore from '../../store/authStore'

export default function AuthPage() {
  const router = useRouter()
  const { setAuth, token, init } = useAuthStore()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [errorType, setErrorType] = useState('')
  const [loading, setLoading] = useState(false)
  const [backendStatus, setBackendStatus] = useState('checking') // 'checking' | 'up' | 'down'

  useEffect(() => { init() }, [])
  useEffect(() => { if (token) router.replace('/dashboard') }, [token])

  // Ping backend on load and every 3s
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch('http://localhost:5000/', { method: 'GET' })
        setBackendStatus(r.ok ? 'up' : 'error')
      } catch {
        setBackendStatus('down')
      }
    }
    check()
    const interval = setInterval(check, 3000)
    return () => clearInterval(interval)
  }, [])

  const update = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError(''); setErrorType(''); setLoading(true)
    try {
      const fn = mode === 'login' ? apiLogin : apiRegister
      const { user, token: t } = await fn(form)
      setAuth(user, t)
      router.replace('/dashboard')
    } catch (err) {
      const msg = err.message || ''
      if (msg === 'NETWORK_ERROR') {
        setErrorType('network'); setError('network')
      } else if (msg.includes('not set up') || msg.includes('schema') || msg.includes('table') || msg.includes('503')) {
        setErrorType('db'); setError(msg)
      } else {
        setErrorType('auth'); setError(msg)
      }
    } finally { setLoading(false) }
  }

  const C = {
    page:  { minHeight:'100vh', background:'#0f0f13', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif' },
    wrap:  { width:'100%', maxWidth:420, position:'relative', zIndex:1 },
    card:  { background:'#16161d', border:'1px solid #2a2a35', borderRadius:18, padding:'2rem' },
    tabs:  { display:'flex', gap:'0.3rem', marginBottom:'2rem', background:'#0f0f13', borderRadius:12, padding:'4px' },
    tab:   (a) => ({ flex:1, padding:'0.5rem', borderRadius:9, border:'none', cursor:'pointer', background: a ? '#6366f1' : 'transparent', color: a ? 'white' : '#6b6b80', fontWeight: a ? 700 : 400, fontSize:'0.85rem', transition:'all 0.15s', fontFamily:'inherit' }),
    label: { fontSize:'0.72rem', color:'#6b6b80', fontWeight:700, display:'block', marginBottom:'0.35rem', textTransform:'uppercase', letterSpacing:'0.08em' },
    input: { width:'100%', padding:'0.65rem 0.9rem', background:'#0f0f13', border:'1px solid #2a2a35', borderRadius:9, color:'#f0f0f8', fontSize:'0.9rem', outline:'none', fontFamily:'inherit', boxSizing:'border-box', transition:'border-color 0.15s' },
    btn:   (dis) => ({ width:'100%', padding:'0.75rem', background: dis ? '#3a3a5c' : '#6366f1', color:'white', border:'none', borderRadius:10, fontSize:'0.92rem', fontWeight:700, cursor: dis ? 'not-allowed' : 'pointer', transition:'background 0.15s', marginTop:'0.25rem', fontFamily:'inherit' }),
  }

  const statusDot = { checking: '#6b6b80', up: '#22c55e', down: '#ef4444', error: '#f59e0b' }
  const statusText = { checking: 'Checking backend…', up: 'Backend connected ✓', down: 'Backend offline — run: cd ff2\\backend && node server.js', error: 'Backend error' }

  return (
    <div style={C.page}>
      <div style={{ position:'fixed', inset:0, pointerEvents:'none' }}>
        <div style={{ position:'absolute', top:'10%', left:'15%', width:700, height:700, background:'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 60%)', borderRadius:'50%' }}/>
      </div>

      <div style={C.wrap}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <div style={{ width:56, height:56, background:'linear-gradient(135deg,#6366f1,#4f46e5)', borderRadius:18, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'1.6rem', marginBottom:'0.75rem', boxShadow:'0 8px 24px rgba(99,102,241,0.3)' }}>⚡</div>
          <h1 style={{ fontSize:'1.9rem', fontWeight:800, color:'#f0f0f8', margin:0, letterSpacing:'-0.02em' }}>FlowForge</h1>
          <p style={{ color:'#6b6b80', fontSize:'0.875rem', marginTop:'0.3rem' }}>Workflow Automation Platform</p>
        </div>

        {/* Backend status bar */}
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', padding:'0.6rem 0.875rem', background:'#16161d', border:'1px solid #2a2a35', borderRadius:10, marginBottom:'1rem' }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background: statusDot[backendStatus], flexShrink:0,
            boxShadow: backendStatus === 'up' ? '0 0 6px #22c55e' : backendStatus === 'down' ? '0 0 6px #ef4444' : 'none' }}/>
          <span style={{ fontSize:'0.78rem', color: backendStatus === 'up' ? '#4ade80' : backendStatus === 'down' ? '#f87171' : '#6b6b80' }}>
            {statusText[backendStatus]}
          </span>
        </div>

        <div style={C.card}>
          <div style={C.tabs}>
            {['login','register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setErrorType('') }} style={C.tab(mode===m)}>
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:'1.1rem' }}>
            {mode === 'register' && (
              <div>
                <label style={C.label}>Full Name</label>
                <input style={C.input} type="text" placeholder="John Doe" value={form.name} onChange={update('name')} required
                  onFocus={e=>e.target.style.borderColor='#6366f1'} onBlur={e=>e.target.style.borderColor='#2a2a35'}/>
              </div>
            )}
            <div>
              <label style={C.label}>Email</label>
              <input style={C.input} type="email" placeholder="you@example.com" value={form.email} onChange={update('email')} required
                onFocus={e=>e.target.style.borderColor='#6366f1'} onBlur={e=>e.target.style.borderColor='#2a2a35'}/>
            </div>
            <div>
              <label style={C.label}>Password</label>
              <input style={C.input} type="password" placeholder="••••••••" value={form.password} onChange={update('password')} required minLength={6}
                onFocus={e=>e.target.style.borderColor='#6366f1'} onBlur={e=>e.target.style.borderColor='#2a2a35'}/>
            </div>

            {/* Error messages */}
            {errorType === 'network' && (
              <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:9, padding:'0.875rem', fontSize:'0.82rem' }}>
                <div style={{ color:'#f87171', fontWeight:700, marginBottom:'0.35rem' }}>⚠ Backend not reachable</div>
                <div style={{ color:'#9b9baa', lineHeight:1.7 }}>
                  Open a new terminal and run:<br/>
                  <code style={{ background:'#0f0f13', color:'#818cf8', padding:'0.2rem 0.5rem', borderRadius:5, display:'inline-block', marginTop:'0.25rem' }}>cd ff2\backend</code><br/>
                  <code style={{ background:'#0f0f13', color:'#818cf8', padding:'0.2rem 0.5rem', borderRadius:5, display:'inline-block', marginTop:'0.2rem' }}>node server.js</code>
                </div>
              </div>
            )}
            {errorType === 'db' && (
              <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:9, padding:'0.875rem', fontSize:'0.82rem' }}>
                <div style={{ color:'#fbbf24', fontWeight:700, marginBottom:'0.35rem' }}>⚠ Database tables missing</div>
                <div style={{ color:'#9b9baa', lineHeight:1.7 }}>
                  Go to your{' '}
                  <a href="https://supabase.com/dashboard/project/cigufklxwwiyohfijex/sql" target="_blank" rel="noreferrer"
                    style={{ color:'#6366f1' }}>Supabase SQL Editor</a>
                  , paste the contents of <code style={{ color:'#818cf8' }}>backend/schema.sql</code> and click Run.
                </div>
              </div>
            )}
            {(errorType === 'auth' || errorType === 'general') && (
              <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:9, padding:'0.75rem', fontSize:'0.82rem', color:'#f87171' }}>
                {error}
              </div>
            )}

            <button type="submit" style={C.btn(loading || backendStatus !== 'up')} disabled={loading || backendStatus !== 'up'}>
              {loading ? '⏳ Please wait…'
               : backendStatus === 'checking' ? '⏳ Checking connection…'
               : backendStatus === 'down' ? '⚠ Start backend first'
               : mode === 'login' ? '→ Sign In' : '→ Create Account'}
            </button>
          </form>

          {mode === 'login' && (
            <div style={{ marginTop:'1.25rem', padding:'0.875rem', background:'rgba(99,102,241,0.07)', border:'1px solid rgba(99,102,241,0.15)', borderRadius:10 }}>
              <div style={{ fontSize:'0.72rem', color:'#818cf8', fontWeight:700, marginBottom:'0.4rem', textTransform:'uppercase', letterSpacing:'0.06em' }}>Demo Credentials</div>
              <div style={{ fontSize:'0.8rem', color:'#6b6b80', lineHeight:1.8 }}>
                Email: <strong style={{ color:'#e2e2f0' }}>admin@flowforge.dev</strong><br/>
                Password: <strong style={{ color:'#e2e2f0' }}>admin123</strong>
              </div>
              <div style={{ fontSize:'0.72rem', color:'#4a4a5a', marginTop:'0.35rem' }}>Requires schema.sql to be run in Supabase first</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
