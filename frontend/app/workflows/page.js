'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '../../components/layout/AppShell'
import { getWorkflows, deleteWorkflow, executeWorkflow } from '../../lib/api'

const STATUS_DOT = { true: '#22c55e', false: '#6b7280' }

export default function WorkflowsPage() {
  const router = useRouter()
  const [workflows, setWorkflows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setWorkflows((await getWorkflows()) || []) }
    finally { setLoading(false) }
  }

  const filtered = workflows.filter(w => {
    const matchSearch = w.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || (filter === 'active' ? w.is_active : !w.is_active)
    return matchSearch && matchFilter
  })

  async function handleDelete(id) {
    if (!confirm('Delete this workflow?')) return
    await deleteWorkflow(id)
    setWorkflows(p => p.filter(w => w.id !== id))
  }

  async function handleRun(id) {
    const { execution_id } = await executeWorkflow(id, {})
    router.push(`/executions/${execution_id}`)
  }

  return (
    <AppShell>
      <div style={{ padding:'2rem', maxWidth:1200, margin:'0 auto' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
          <h1 style={{ fontSize:'1.5rem', fontWeight:800, color:'#e2e2f0' }}>Workflows</h1>
          <button className="btn-primary" onClick={() => router.push('/dashboard')}>+ New Workflow</button>
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:'1rem', marginBottom:'1.5rem', alignItems:'center', flexWrap:'wrap' }}>
          <input className="input-base" placeholder="Search workflows…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth:300 }} />
          <div style={{ display:'flex', gap:'0.5rem' }}>
            {['all','active','inactive'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding:'0.4rem 0.875rem', borderRadius:8, border:'1px solid', cursor:'pointer',
                borderColor: filter === f ? '#6366f1' : '#2a2a35',
                background: filter === f ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: filter === f ? '#818cf8' : '#6b6b80',
                fontSize:'0.8rem', fontWeight: filter === f ? 600 : 400, textTransform:'capitalize'
              }}>{f}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ background:'#16161d', border:'1px solid #2a2a35', borderRadius:12, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid #2a2a35' }}>
                {['Workflow','Status','Version','Steps','Created','Actions'].map(h => (
                  <th key={h} style={{ padding:'0.875rem 1rem', textAlign:'left', fontSize:'0.7rem', fontWeight:700, color:'#6b6b80', textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1,2,3].map(i => (
                  <tr key={i}>
                    {[1,2,3,4,5,6].map(j => (
                      <td key={j} style={{ padding:'0.875rem 1rem' }}>
                        <div style={{ height:14, background:'#2a2a35', borderRadius:4, width: j === 1 ? '70%' : '40%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding:'3rem', textAlign:'center', color:'#6b6b80', fontSize:'0.875rem' }}>No workflows found</td></tr>
              ) : (
                filtered.map(wf => (
                  <tr key={wf.id} style={{ borderBottom:'1px solid #1e1e28', cursor:'pointer', transition:'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background='#1e1e28'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}
                    onClick={() => router.push(`/workflows/${wf.id}`)}>
                    <td style={{ padding:'0.875rem 1rem' }}>
                      <div style={{ fontWeight:600, color:'#e2e2f0', fontSize:'0.875rem' }}>{wf.name}</div>
                      <div style={{ fontSize:'0.75rem', color:'#6b6b80', marginTop:2 }}>{wf.description || '—'}</div>
                    </td>
                    <td style={{ padding:'0.875rem 1rem' }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:'0.35rem', fontSize:'0.75rem', fontWeight:600 }}>
                        <span style={{ width:7, height:7, borderRadius:'50%', background: STATUS_DOT[wf.is_active], display:'inline-block' }} />
                        <span style={{ color: wf.is_active ? '#22c55e' : '#6b7280' }}>{wf.is_active ? 'Active' : 'Inactive'}</span>
                      </span>
                    </td>
                    <td style={{ padding:'0.875rem 1rem', color:'#6b6b80', fontSize:'0.8rem' }}>v{wf.version || 1}</td>
                    <td style={{ padding:'0.875rem 1rem', color:'#6b6b80', fontSize:'0.8rem' }}>{wf.steps?.length ?? '—'}</td>
                    <td style={{ padding:'0.875rem 1rem', color:'#6b6b80', fontSize:'0.75rem' }}>{wf.created_at ? new Date(wf.created_at).toLocaleDateString() : '—'}</td>
                    <td style={{ padding:'0.875rem 1rem' }}>
                      <div style={{ display:'flex', gap:'0.5rem' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => router.push(`/builder/${wf.id}`)} className="btn-ghost" style={{ padding:'0.3rem 0.6rem', fontSize:'0.75rem' }}>Edit</button>
                        <button onClick={() => handleRun(wf.id)} className="btn-primary" style={{ padding:'0.3rem 0.6rem', fontSize:'0.75rem' }} disabled={!wf.is_active}>Run</button>
                        <button onClick={() => handleDelete(wf.id)} style={{ background:'none', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', padding:'0.3rem 0.5rem', borderRadius:6, cursor:'pointer', fontSize:'0.75rem' }}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}
