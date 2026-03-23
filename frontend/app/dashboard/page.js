'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '../../components/layout/AppShell'
import { getWorkflows, getStats, executeWorkflow, deleteWorkflow } from '../../lib/api'
import useAuthStore from '../../store/authStore'

const STATUS_COLORS = { completed:'#22c55e', running:'#3b82f6', failed:'#ef4444', pending:'#f59e0b', waiting:'#a855f7', cancelled:'#6b7280' }

function StatCard({ label, value, sub, color = '#6366f1', icon }) {
  return (
    <div style={{ background:'#16161d', border:'1px solid #2a2a35', borderRadius:12, padding:'1.25rem 1.5rem' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.75rem' }}>
        <span style={{ fontSize:'0.7rem', color:'#6b6b80', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>{label}</span>
        <span style={{ fontSize:'1.2rem' }}>{icon}</span>
      </div>
      <div style={{ fontSize:'2.25rem', fontWeight:800, color, lineHeight:1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize:'0.75rem', color:'#6b6b80', marginTop:'0.5rem' }}>{sub}</div>}
    </div>
  )
}

function WorkflowCard({ wf, onDelete, onRun }) {
  const router = useRouter()
  const [running, setRunning] = useState(false)

  async function run(e) {
    e.stopPropagation()
    setRunning(true)
    try {
      const { execution_id } = await onRun(wf.id)
      router.push(`/executions/${execution_id}`)
    } finally { setRunning(false) }
  }

  return (
    <div onClick={() => router.push(`/workflows/${wf.id}`)} style={{ background:'#16161d', border:'1px solid #2a2a35', borderRadius:12, padding:'1.25rem', cursor:'pointer', transition:'all 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor='#6366f1'}
      onMouseLeave={e => e.currentTarget.style.borderColor='#2a2a35'}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'0.75rem' }}>
        <div style={{ width:36, height:36, background:'rgba(99,102,241,0.15)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem' }}>⚡</div>
        <div style={{ display:'flex', gap:'0.4rem', alignItems:'center' }}>
          <span style={{ fontSize:'0.65rem', fontWeight:700, padding:'0.2rem 0.5rem', borderRadius:999, textTransform:'uppercase', letterSpacing:'0.05em',
            background: wf.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(107,114,128,0.15)',
            color: wf.is_active ? '#22c55e' : '#6b7280',
            border: `1px solid ${wf.is_active ? 'rgba(34,197,94,0.3)' : 'rgba(107,114,128,0.3)'}` }}>
            {wf.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
      <h3 style={{ fontSize:'0.95rem', fontWeight:700, color:'#e2e2f0', marginBottom:'0.4rem' }}>{wf.name}</h3>
      <p style={{ fontSize:'0.8rem', color:'#6b6b80', marginBottom:'1rem', lineHeight:1.5 }}>{wf.description || 'No description'}</p>
      <div style={{ display:'flex', gap:'0.5rem' }}>
        <button onClick={run} disabled={running || !wf.is_active} className="btn-primary" style={{ flex:1, justifyContent:'center', padding:'0.4rem', fontSize:'0.8rem' }}>
          {running ? '⏳' : '▶'} {running ? 'Starting…' : 'Run'}
        </button>
        <button onClick={e => { e.stopPropagation(); router.push(`/builder/${wf.id}`) }} className="btn-ghost" style={{ padding:'0.4rem 0.75rem', fontSize:'0.8rem' }}>Edit</button>
        <button onClick={e => { e.stopPropagation(); onDelete(wf.id) }} style={{ background:'none', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', padding:'0.4rem 0.6rem', borderRadius:'0.5rem', cursor:'pointer', fontSize:'0.8rem' }}>✕</button>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [workflows, setWorkflows] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [wfs, st] = await Promise.all([getWorkflows(), getStats()])
      setWorkflows(Array.isArray(wfs) ? wfs : [])
      setStats(st)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const { createWorkflow } = await import('../../lib/api')
      const wf = await createWorkflow({ name: newName.trim(), description: newDesc.trim() })
      setShowCreate(false); setNewName(''); setNewDesc('')
      router.push(`/builder/${wf.id}`)
    } catch (err) { setError(err.message) }
    finally { setCreating(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this workflow?')) return
    try { await deleteWorkflow(id); setWorkflows(p => p.filter(w => w.id !== id)) }
    catch (err) { setError(err.message) }
  }

  const execStats = stats?.executions?.by_status || {}

  return (
    <AppShell>
      <div style={{ padding:'2rem', maxWidth:1400, margin:'0 auto' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'2rem' }}>
          <div>
            <h1 style={{ fontSize:'1.5rem', fontWeight:800, color:'#e2e2f0', margin:0 }}>Dashboard</h1>
            <p style={{ color:'#6b6b80', fontSize:'0.85rem', marginTop:'0.2rem' }}>Welcome back, {user?.name}</p>
          </div>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>+ New Workflow</button>
        </div>

        {error && (
          <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, padding:'0.75rem 1rem', marginBottom:'1.5rem', fontSize:'0.85rem', color:'#f87171', display:'flex', justifyContent:'space-between' }}>
            {error}<button onClick={() => setError('')} style={{ background:'none', border:'none', color:'#f87171', cursor:'pointer' }}>✕</button>
          </div>
        )}

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'1rem', marginBottom:'2rem' }}>
          <StatCard label="Total Workflows" value={stats?.workflows?.total ?? '—'} sub={`${stats?.workflows?.active ?? 0} active`} color="#6366f1" icon="⚡" />
          <StatCard label="Total Executions" value={stats?.executions?.total ?? '—'} color="#3b82f6" icon="▶" />
          <StatCard label="Completed" value={execStats.completed ?? 0} color="#22c55e" icon="✅" />
          <StatCard label="Failed" value={execStats.failed ?? 0} color="#ef4444" icon="❌" />
          <StatCard label="Running" value={execStats.running ?? 0} color="#f59e0b" icon="⏳" />
        </div>

        {/* Workflows */}
        <div style={{ marginBottom:'1rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <h2 style={{ fontSize:'1rem', fontWeight:700, color:'#e2e2f0' }}>Workflows</h2>
          <Link href="/workflows" style={{ fontSize:'0.8rem', color:'#6366f1', textDecoration:'none' }}>View all →</Link>
        </div>

        {loading ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'1rem' }}>
            {[1,2,3].map(i => <div key={i} style={{ background:'#16161d', border:'1px solid #2a2a35', borderRadius:12, height:180, animation:'pulse 1.5s ease-in-out infinite' }} />)}
          </div>
        ) : workflows.length === 0 ? (
          <div style={{ textAlign:'center', padding:'4rem 1rem', background:'#16161d', border:'1px solid #2a2a35', borderRadius:12 }}>
            <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>⚡</div>
            <h3 style={{ color:'#e2e2f0', fontWeight:700, marginBottom:'0.5rem' }}>No workflows yet</h3>
            <p style={{ color:'#6b6b80', fontSize:'0.875rem', marginBottom:'1.5rem' }}>Create your first workflow to get started</p>
            <button className="btn-primary" onClick={() => setShowCreate(true)}>+ Create Workflow</button>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'1rem' }}>
            {workflows.slice(0,9).map(wf => (
              <WorkflowCard key={wf.id} wf={wf} onDelete={handleDelete} onRun={(id) => executeWorkflow(id, {})} />
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreate && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }} onClick={() => setShowCreate(false)}>
            <div style={{ background:'#16161d', border:'1px solid #2a2a35', borderRadius:16, padding:'2rem', width:440, maxWidth:'calc(100vw - 2rem)' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize:'1.1rem', fontWeight:700, color:'#e2e2f0', marginBottom:'1.5rem' }}>Create Workflow</h2>
              <form onSubmit={handleCreate} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                <div>
                  <label style={{ fontSize:'0.75rem', color:'#6b6b80', fontWeight:600, display:'block', marginBottom:'0.4rem', textTransform:'uppercase' }}>Name *</label>
                  <input className="input-base" placeholder="Expense Approval" value={newName} onChange={e => setNewName(e.target.value)} required autoFocus />
                </div>
                <div>
                  <label style={{ fontSize:'0.75rem', color:'#6b6b80', fontWeight:600, display:'block', marginBottom:'0.4rem', textTransform:'uppercase' }}>Description</label>
                  <textarea className="input-base" placeholder="What does this workflow do?" value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} style={{ resize:'vertical' }} />
                </div>
                <div style={{ display:'flex', gap:'0.5rem', justifyContent:'flex-end', marginTop:'0.5rem' }}>
                  <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={creating}>{creating ? 'Creating…' : '→ Create & Open Builder'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
