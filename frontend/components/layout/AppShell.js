'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import useAuthStore from '../../store/authStore'

const NAV = [
  { href: '/dashboard',  label: 'Dashboard',   icon: '▦' },
  { href: '/workflows',  label: 'Workflows',    icon: '⚡' },
  { href: '/executions', label: 'Executions',   icon: '▶' },
]

export default function AppShell({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, token, initialized, init, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => { init() }, [])

  useEffect(() => {
    if (initialized && !token) router.replace('/auth')
  }, [initialized, token])

  if (!initialized || !user) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0f0f13', color:'#6366f1', fontFamily:'Inter,sans-serif' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>⚡</div>
          <div>Loading…</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'#0f0f13' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? '220px' : '60px',
        background: '#16161d',
        borderRight: '1px solid #2a2a35',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s',
        flexShrink: 0,
        overflow: 'hidden'
      }}>
        {/* Logo */}
        <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid #2a2a35', display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <div style={{ width:32, height:32, background:'#6366f1', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', flexShrink:0 }}>⚡</div>
          {sidebarOpen && <span style={{ fontWeight:700, fontSize:'1rem', color:'#e2e2f0', whiteSpace:'nowrap' }}>FlowForge</span>}
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'0.75rem 0.5rem', display:'flex', flexDirection:'column', gap:'2px' }}>
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={href} href={href} style={{
                display:'flex', alignItems:'center', gap:'0.75rem',
                padding:'0.6rem 0.75rem', borderRadius:'0.5rem',
                textDecoration:'none', transition:'all 0.15s',
                background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: active ? '#818cf8' : '#6b6b80',
                fontWeight: active ? 600 : 400,
                fontSize: '0.875rem',
                whiteSpace: 'nowrap'
              }}>
                <span style={{ fontSize:'1rem', flexShrink:0 }}>{icon}</span>
                {sidebarOpen && label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div style={{ padding:'0.75rem', borderTop:'1px solid #2a2a35' }}>
          {sidebarOpen ? (
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <div style={{ width:30, height:30, background:'#6366f1', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.75rem', fontWeight:700, color:'white', flexShrink:0 }}>
                {user.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'0.75rem', fontWeight:600, color:'#e2e2f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.name}</div>
                <div style={{ fontSize:'0.65rem', color:'#6b6b80' }}>{user.role}</div>
              </div>
              <button onClick={() => { logout(); router.replace('/auth') }} style={{ background:'none', border:'none', color:'#6b6b80', cursor:'pointer', fontSize:'0.8rem', padding:'0.25rem' }} title="Logout">✕</button>
            </div>
          ) : (
            <button onClick={() => { logout(); router.replace('/auth') }} style={{ width:'100%', background:'none', border:'none', color:'#6b6b80', cursor:'pointer', fontSize:'1rem' }}>✕</button>
          )}
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex:1, overflow:'auto', display:'flex', flexDirection:'column' }}>
        {/* Topbar */}
        <div style={{ height:52, borderBottom:'1px solid #2a2a35', display:'flex', alignItems:'center', padding:'0 1.5rem', gap:'1rem', background:'#16161d', flexShrink:0 }}>
          <button onClick={() => setSidebarOpen(p => !p)} style={{ background:'none', border:'none', color:'#6b6b80', cursor:'pointer', fontSize:'1.1rem', padding:'0.25rem' }}>☰</button>
          <span style={{ fontSize:'0.8rem', color:'#6b6b80' }}>
            {NAV.find(n => pathname === n.href || pathname.startsWith(n.href + '/'))?.label || 'FlowForge'}
          </span>
        </div>
        <div style={{ flex:1, overflow:'auto' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
