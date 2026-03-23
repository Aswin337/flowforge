'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppShell from '../../../components/layout/AppShell'
import { getWorkflow, getExecutions, executeWorkflow } from '../../../lib/api'

const STATUS_COLORS = { completed:'#22c55e', running:'#3b82f6', failed:'#ef4444', pending:'#f59e0b', waiting:'#a855f7', cancelled:'#6b7280' }

export default function WorkflowDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [wf, setWf] = useState(null)
  const [executions, setExecutions] = useState([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    try {
      const [w, execs] = await Promise.all([getWorkflow(id), getExecutions(id)])
      setWf(w); setExecutions(execs || [])
    } finally { setLoading(false) }
  }

  async function handleRun() {
    setRunning(true)
    try {
      const { execution_id } = await executeWorkflow(id, {})
      router.push(`/executions/${execution_id}`)
    } finally { setRunning(false) }
  }

  if (loading) return <AppShell><div style={{ padding:'2rem', color:'#6b6b80' }}>Loading…</div></AppShell>
  if (!wf) return <AppShell><div style={{ padding:'2rem', color:'#ef4444' }}>Workflow not found</div></AppShell>

  return (
    <AppShell>
      <div style={{ padding:'2rem', maxWidth:1100, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'2rem' }}>
          <button onClick={() => router.back()} style={{ background:'none', border:'none', color:'#6b6b80', cursor:'pointer', fontSize:'1.2rem' }}>←</button>
          <div style={{ flex:1 }}>
            <h1 style={{ fontSize:'1.4rem', fontWeight:800, color:'#e2e2f0', margin:0 }}>{wf.name}</h1>
            <p style={{ color:'#6b6b80', fontSize:'0.8rem', marginTop:2 }}>{wf.description || 'No description'}</p>
          </div>
          <button onClick={() => router.push(`/builder/${id}`)} className="btn-ghost">Open Builder</button>
          <button onClick={handleRun} className="btn-primary" disabled={running || !wf.is_active}>
            {running ? '⏳ Starting…' : '▶ Run Now'}
          </button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:'1.5rem' }}>
          {/* Steps */}
          <div>
            <h2 style={{ fontSize:'0.875rem', fontWeight:700, color:'#e2e2f0', marginBottom:'1rem' }}>Steps ({wf.steps?.length || 0})</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
              {(wf.steps || []).length === 0 ? (
                <div style={{ background:'#16161d', border:'1px solid #2a2a35', borderRadius:10, padding:'1.5rem', textAlign:'center', color:'#6b6b80', fontSize:'0.8rem' }}>
                  No steps. Open the builder to add steps.
                </div>
              ) : (
                (wf.steps || []).map((step, i) => (
                  <div key={step.id} style={{ background:'#16161d', border:'1px solid #2a2a35', borderRadius:10, padding:'0.875rem 1rem', display:'flex', alignItems:'center', gap:'0.75rem' }}>
                    <div style={{ width:26, height:26, background:'rgba(99,102,241,0.15)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem', fontWeight:700, color:'#818cf8', flexShrink:0 }}>{i+1}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'0.85rem', fontWeight:600, color:'#e2e2f0' }}>{step.name}</div>
                      <div style={{ fontSize:'0.7rem', color:'#6b6b80', textTransform:'capitalize' }}>{step.step_type}</div>
                    </div>
                    {step.id === wf.start_step_id && <span style={{ fontSize:'0.65rem', color:'#22c55e', fontWeight:700, background:'rgba(34,197,94,0.1)', padding:'0.1rem 0.4rem', borderRadius:4 }}>START</span>}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Executions */}
          <div>
            <h2 style={{ fontSize:'0.875rem', fontWeight:700, color:'#e2e2f0', marginBottom:'1rem' }}>Recent Executions ({executions.length})</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
              {executions.length === 0 ? (
                <div style={{ background:'#16161d', border:'1px solid #2a2a35', borderRadius:10, padding:'2rem', textAlign:'center', color:'#6b6b80', fontSize:'0.8rem' }}>
                  No executions yet. Click Run Now to start one.
                </div>
              ) : (
                executions.map(ex => (
                  <div key={ex.id} onClick={() => router.push(`/executions/${ex.id}`)} style={{ background:'#16161d', border:'1px solid #2a2a35', borderRadius:10, padding:'0.875rem 1rem', cursor:'pointer', display:'flex', alignItems:'center', gap:'1rem', transition:'border-color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor='#3f3f50'}
                    onMouseLeave={e => e.currentTarget.style.borderColor='#2a2a35'}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background: STATUS_COLORS[ex.status] || '#6b7280', flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#e2e2f0' }}>{ex.id.slice(0,8)}…</div>
                      <div style={{ fontSize:'0.7rem', color:'#6b6b80' }}>{ex.created_at ? new Date(ex.created_at).toLocaleString() : ''}</div>
                    </div>
                    <span style={{ fontSize:'0.7rem', fontWeight:700, color: STATUS_COLORS[ex.status], textTransform:'capitalize' }}>{ex.status}</span>
                    <span style={{ color:'#6b6b80', fontSize:'0.8rem' }}>→</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
