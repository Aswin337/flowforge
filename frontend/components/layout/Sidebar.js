'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const NAV = [
  { href: '/dashboard',   icon: '⬡', label: 'Dashboard' },
  { href: '/workflows',   icon: '⚙', label: 'Workflows' },
  { href: '/executions',  icon: '▶', label: 'Executions' },
]

export default function Sidebar() {
  const path = usePathname()
  const router = useRouter()

  function logout() {
    localStorage.removeItem('ff_token')
    localStorage.removeItem('ff_user')
    router.push('/auth')
  }

  const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('ff_user') || 'null') : null

  return (
    <aside className="w-56 h-screen flex flex-col border-r shrink-0" style={{background:'var(--card)',borderColor:'var(--border)'}}>
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{borderColor:'var(--border)'}}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{background:'linear-gradient(135deg,#6366f1,#818cf8)'}}>⚡</div>
          <span className="font-bold text-base">FlowForge</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, icon, label }) => {
          const active = path === href || path.startsWith(href + '/')
          return (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={active
                ? {background:'rgba(99,102,241,0.15)',color:'var(--brand-light)',borderLeft:'2px solid var(--brand)'}
                : {color:'var(--muted)'}}>
              <span className="text-base w-5 text-center">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t" style={{borderColor:'var(--border)'}}>
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg mb-1" style={{background:'var(--card2)'}}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{background:'var(--brand)',color:'white'}}>
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate">{user?.name || 'User'}</div>
            <div className="text-xs capitalize" style={{color:'var(--muted)'}}>{user?.role || 'user'}</div>
          </div>
        </div>
        <button onClick={logout} className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all"
          style={{color:'var(--muted)'}}
          onMouseEnter={e => e.target.style.color='#f87171'}
          onMouseLeave={e => e.target.style.color='var(--muted)'}>
          ↩ Sign Out
        </button>
      </div>
    </aside>
  )
}
