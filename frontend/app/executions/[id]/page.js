'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppShell from '../../../components/layout/AppShell'
import { getExecution, approveExecution, cancelExecution, retryExecution } from '../../../lib/api'

const STATUS_COLORS = { completed:'#22c55e', running:'#3b82f6', failed:'#ef4444', pending:'#f59e0b', waiting:'#a855f7', cancelled:'#6b7280' }
const LEVEL_COLORS = { info:'#6b6b80', success:'#22c55e', error:'#ef4444', warn:'#f59e0b' }

function LogLine({ entry }) {
  const t = entry.created_at ? new Date(entry.created_at).toLocaleTimeString() : ''
  return (
    <div style={{ display:'flex', gap:'0.75rem', padding:'0.25rem 0', fontSize:'0.8rem', fontFamily:'monospace', borderBottom:'1px solid #1a1a22', lineHeight:1.6 }}>
      <span style={{ color:'#3f3f50', flexShrink:0, fontSize:'0.7rem' }}>{t}</span>
      <span style={{ color: LEVEL_COLORS[entry.level] || '#6b6b80', flexShrink:0, fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', width:52 }}>{entry.level}</span>
      <span style={{ color: entry.level === 'error' ? '#f87171' : entry.level === 'success' ? '#4ade80' : '#a0a0b8' }}>{entry.message}</span>
    </div>
  )
}

export default function ExecutionDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [exec, setExec] = useState(null)
  const [loading, setLoading] = useState(true)
  const [polling, setPolling] = useState(false)
  const [approving, setApproving] = useState(false)
  const [comment, setComment] = useState('')
  const logsRef = useRef(null)
  const pollRef = useRef(null)

  useEffect(() => {
    load()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [id])

  async function load() {
    setLoading(true)
    try { await refresh() }
    finally { setLoading(false) }
  }

  async function refresh() {
    try {
      const data = await getExecution(id)
      if (!data) return
      setExec(data)
      // Auto-scroll logs
      setTimeout(() => { if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight }, 50)
      // Poll if running/pending
      if (['running', 'pending'].includes(data.status)) {
        if (!pollRef.current) {
          setPolling(true)
          pollRef.current = setInterval(async () => {
            const d = await getExecution(id).catch(() => null)
            if (!d) return
            setExec(d)
            if (!['running','pending'].includes(d.status)) {
              clearInterval(pollRef.current); pollRef.current = null; setPolling(false)
            }
            setTimeout(() => { if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight }, 50)
          }, 1500)
        }
      } else {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; setPolling(false) }
      }
    } catch (err) { console.error(err) }
  }

  async function handleApprove(approved) {
    setApproving(true)
    try {
      await approveExecution(id, { approved, comment })
      setComment('')
      await refresh()
    } finally { setApproving(false) }
  }

  async function handleCancel() {
    if (!confirm('Cancel this execution?')) return
    await cancelExecution(id)
    await refresh()
  }

  async function handleRetry() {
    const { execution_id } = await retryExecution(id)
    router.push(`/executions/${execution_id}`)
  }

  if (loading) return <AppShell><div style={{ padding:'2rem', color:'#6b6b80' }}>Loading…</div></AppShell>
  if (!exec) return <AppShell><div style={{ padding:'2rem', color:'#ef4444' }}>Execution not found</div></AppShell>

  const status = exec.status
  const color = STATUS_COLORS[status] || '#6b7280'
  const logs = exec.log_entries || []

  return (
    <AppShell>
      <div style={{ padding:'2rem', maxWidth:1100, margin:'0 auto' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'2rem', flexWrap:'wrap' }}>
          <button onClick={() => router.back()} style={{ background:'none', border:'none', color:'#6b6b80', cursor:'pointer', fontSize:'1.2rem' }}>←</button>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
              <h1 style={{ fontSize:'1.1rem', fontWeight:800, color:'#e2e2f0', margin:0, fontFamily:'monospace' }}>{id.slice(0,8)}…</h1>
              <span style={{ padding:'0.25rem 0.75rem', borderRadius:999, fontSize:'0.75rem', fontWeight:700, textTransform:'capitalize', color, background:`${color}18`, border:`1px solid ${color}40` }}>
                {polling && '⏳ '}{status}
              </span>
            </div>
            <div style={{ fontSize:'0.75rem', color:'#6b6b80', marginTop:2 }}>
              Started {exec.created_at ? new Date(exec.created_at).toLocaleString() : '—'}
              {exec.ended_at && ` · Ended ${new Date(exec.ended_at).toLocaleString()}`}
            </div>
          </div>
          <div style={{ display:'flex', gap:'0.5rem' }}>
            <button onClick={refresh} className="btn-ghost" style={{ fontSize:'0.8rem' }}>↻ Refresh</button>
            {['running','pending','waiting'].includes(status) && (
              <button onClick={handleCancel} style={{ background:'none', border:'1px solid rgba(239,68,68,0.4)', color:'#ef4444', padding:'0.4rem 0.875rem', borderRadius:8, cursor:'pointer', fontSize:'0.8rem', fontWeight:600 }}>Cancel</button>
            )}
            {status === 'failed' && (
              <button onClick={handleRetry} className="btn-primary" style={{ fontSize:'0.8rem' }}>↩ Retry</button>
            )}
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.5fr', gap:'1.5rem' }}>
          {/* Left: Status + Approval */}
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            {/* Status card */}
            <div style={{ background:'#16161d', border:`1px solid ${color}30`, borderRadius:12, padding:'1.25rem' }}>
              <div style={{ fontSize:'0.7rem', color:'#6b6b80', fontWeight:700, textTransform:'uppercase', marginBottom:'0.75rem' }}>Status</div>
              <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1rem' }}>
                <div style={{ width:12, height:12, borderRadius:'50%', background:color, boxShadow:`0 0 8px ${color}` }} />
                <span style={{ fontSize:'1.1rem', fontWeight:800, color, textTransform:'capitalize' }}>{status}</span>
              </div>
              {exec.error_message && (
                <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, padding:'0.625rem', fontSize:'0.78rem', color:'#f87171' }}>
                  {exec.error_message}
                </div>
              )}
            </div>

            {/* Input data */}
            {exec.input_data && Object.keys(exec.input_data).length > 0 && (
              <div style={{ background:'#16161d', border:'1px solid #2a2a35', borderRadius:12, padding:'1.25rem' }}>
                <div style={{ fontSize:'0.7rem', color:'#6b6b80', fontWeight:700, textTransform:'uppercase', marginBottom:'0.75rem' }}>Input Data</div>
                <pre style={{ fontSize:'0.75rem', color:'#a0a0b8', fontFamily:'monospace', overflow:'auto', maxHeight:120, margin:0 }}>{JSON.stringify(exec.input_data, null, 2)}</pre>
              </div>
            )}

            {/* Approval panel */}
            {status === 'waiting' && (
              <div style={{ background:'rgba(168,85,247,0.08)', border:'1px solid rgba(168,85,247,0.3)', borderRadius:12, padding:'1.25rem' }}>
                <div style={{ fontSize:'0.8rem', fontWeight:700, color:'#c084fc', marginBottom:'0.75rem' }}>⏸ Waiting for Approval</div>
                <p style={{ fontSize:'0.78rem', color:'#6b6b80', marginBottom:'1rem', lineHeight:1.5 }}>This workflow is paused at an approval step.</p>
                <textarea className="input-base" placeholder="Comment (optional)" value={comment} onChange={e => setComment(e.target.value)} rows={2} style={{ marginBottom:'0.75rem', fontSize:'0.8rem', resize:'none' }} />
                <div style={{ display:'flex', gap:'0.5rem' }}>
                  <button onClick={() => handleApprove(true)} disabled={approving} className="btn-primary" style={{ flex:1, justifyContent:'center', fontSize:'0.8rem' }}>✅ Approve</button>
                  <button onClick={() => handleApprove(false)} disabled={approving} style={{ flex:1, background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)', color:'#f87171', borderRadius:8, cursor:'pointer', fontSize:'0.8rem', fontWeight:600 }}>❌ Reject</button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Execution Console */}
          <div style={{ background:'#16161d', border:'1px solid #2a2a35', borderRadius:12, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:400 }}>
            <div style={{ padding:'0.875rem 1rem', borderBottom:'1px solid #2a2a35', display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:'#ef4444' }} />
              <div style={{ width:10, height:10, borderRadius:'50%', background:'#f59e0b' }} />
              <div style={{ width:10, height:10, borderRadius:'50%', background:'#22c55e' }} />
              <span style={{ fontSize:'0.75rem', color:'#6b6b80', marginLeft:'0.5rem', fontFamily:'monospace' }}>execution console</span>
              {polling && <span style={{ marginLeft:'auto', fontSize:'0.7rem', color:'#3b82f6' }}>● live</span>}
            </div>
            <div ref={logsRef} style={{ flex:1, overflow:'auto', padding:'0.75rem 1rem', maxHeight:500 }}>
              {logs.length === 0 ? (
                <div style={{ color:'#3f3f50', fontSize:'0.8rem', fontFamily:'monospace', padding:'0.5rem' }}>No log entries yet…</div>
              ) : (
                logs.map((entry, i) => <LogLine key={i} entry={entry} />)
              )}
              {polling && (
                <div style={{ color:'#3b82f6', fontSize:'0.75rem', fontFamily:'monospace', padding:'0.25rem 0', animation:'pulse 1s infinite' }}>⏳ Running…</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
