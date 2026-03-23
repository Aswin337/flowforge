'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '../../components/layout/AppShell'

const STATUS_COLORS = { completed:'#22c55e', running:'#3b82f6', failed:'#ef4444', pending:'#f59e0b', waiting:'#a855f7', cancelled:'#6b7280' }

async function fetchAllExecutions() {
  const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
  const token = typeof window !== 'undefined' ? localStorage.getItem('ff_token') : null
  const res = await fetch(`${BASE}/executions`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  })
  if (!res.ok) throw new Error('Failed to load executions')
  return res.json()
}

export default function ExecutionsPage() {
  const router = useRouter()
  const [executions, setExecutions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await fetchAllExecutions()
      setExecutions(Array.isArray(data) ? data : [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const filtered = filter === 'all' ? executions : executions.filter(e => e.status === filter)

  return (
    <AppShell>
      <div style={{ padding:'2rem', maxWidth:1100, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
          <h1 style={{ fontSize:'1.5rem', fontWeight:800, color:'#e2e2f0' }}>Executions</h1>
          <button onClick={load} className="btn-ghost" style={{ fontSize:'0.8rem' }}>↻ Refresh</button>
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
          {['all','running','completed','failed','waiting','cancelled'].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding:'0.35rem 0.75rem', borderRadius:8, border:'1px solid', cursor:'pointer', fontSize:'0.75rem', fontWeight: filter === s ? 600 : 400,
              borderColor: filter === s ? (STATUS_COLORS[s] || '#6366f1') : '#2a2a35',
              background: filter === s ? `${STATUS_COLORS[s] || '#6366f1'}18` : 'transparent',
              color: filter === s ? (STATUS_COLORS[s] || '#818cf8') : '#6b6b80',
              textTransform:'capitalize'
            }}>{s}</button>
          ))}
        </div>

        <div style={{ background:'#16161d', border:'1px solid #2a2a35', borderRadius:12, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid #2a2a35' }}>
                {['ID','Workflow','Status','Started','Duration',''].map(h => (
                  <th key={h} style={{ padding:'0.75rem 1rem', textAlign:'left', fontSize:'0.7rem', fontWeight:700, color:'#6b6b80', textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1,2,3].map(i => <tr key={i}>{[1,2,3,4,5,6].map(j => <td key={j} style={{ padding:'0.75rem 1rem' }}><div style={{ height:12, background:'#2a2a35', borderRadius:4 }} /></td>)}</tr>)
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding:'3rem', textAlign:'center', color:'#6b6b80', fontSize:'0.875rem' }}>No executions found</td></tr>
              ) : (
                filtered.map(ex => {
                  const dur = ex.ended_at && ex.created_at ? Math.round((new Date(ex.ended_at) - new Date(ex.created_at)) / 1000) : null
                  return (
                    <tr key={ex.id} onClick={() => router.push(`/executions/${ex.id}`)} style={{ borderBottom:'1px solid #1e1e28', cursor:'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background='#1e1e28'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'0.75rem 1rem', fontFamily:'monospace', fontSize:'0.8rem', color:'#6b6b80' }}>{ex.id.slice(0,8)}…</td>
                      <td style={{ padding:'0.75rem 1rem', fontFamily:'monospace', fontSize:'0.8rem', color:'#6b6b80' }}>{ex.workflow_id?.slice(0,8)}…</td>
                      <td style={{ padding:'0.75rem 1rem' }}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:'0.35rem', fontSize:'0.75rem', fontWeight:700, color: STATUS_COLORS[ex.status] || '#6b7280', textTransform:'capitalize' }}>
                          <span style={{ width:7, height:7, borderRadius:'50%', background: STATUS_COLORS[ex.status] }} />{ex.status}
                        </span>
                      </td>
                      <td style={{ padding:'0.75rem 1rem', fontSize:'0.75rem', color:'#6b6b80' }}>{ex.created_at ? new Date(ex.created_at).toLocaleString() : '—'}</td>
                      <td style={{ padding:'0.75rem 1rem', fontSize:'0.75rem', color:'#6b6b80' }}>{dur != null ? `${dur}s` : '—'}</td>
                      <td style={{ padding:'0.75rem 1rem' }}><span style={{ color:'#6b6b80' }}>→</span></td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}
