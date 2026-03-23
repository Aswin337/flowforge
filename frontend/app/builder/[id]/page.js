'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppShell from '../../../components/layout/AppShell'
import { getWorkflow, createStep, updateStep, deleteStep, createRule, updateWorkflow } from '../../../lib/api'

// ── Custom Node Renderer ──────────────────────────────────────
function StepNode({ step, isStart, isSelected, currentStepId, onClick }) {
  const statusColors = {
    task: '#6366f1', approval: '#f59e0b', notification: '#22c55e', condition: '#3b82f6'
  }
  const icons = { task: '⚙', approval: '👁', notification: '📧', condition: '🔀' }
  const color = statusColors[step.step_type] || '#6366f1'
  const isRunning = currentStepId === step.id

  return (
    <div onClick={() => onClick(step)} style={{
      background: isSelected ? '#1e1e28' : '#16161d',
      border: `2px solid ${isRunning ? '#f59e0b' : isSelected ? color : '#2a2a35'}`,
      borderRadius: 12, padding: '0.875rem 1.1rem', minWidth: 160, cursor: 'pointer',
      boxShadow: isRunning ? `0 0 16px ${color}40` : isSelected ? `0 0 12px ${color}30` : 'none',
      transition: 'all 0.2s', position: 'relative'
    }}>
      {isStart && (
        <div style={{ position:'absolute', top:-10, left:12, background:'#22c55e', color:'white', fontSize:'0.55rem', fontWeight:800, padding:'0.1rem 0.4rem', borderRadius:4, letterSpacing:'0.06em' }}>START</div>
      )}
      {isRunning && (
        <div style={{ position:'absolute', top:-10, right:12, background:'#f59e0b', color:'white', fontSize:'0.55rem', fontWeight:800, padding:'0.1rem 0.4rem', borderRadius:4 }}>RUNNING</div>
      )}
      <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'0.4rem' }}>
        <span style={{ fontSize:'1.1rem' }}>{icons[step.step_type] || '⚙'}</span>
        <div>
          <div style={{ fontSize:'0.82rem', fontWeight:700, color:'#e2e2f0', lineHeight:1.2 }}>{step.name}</div>
          <div style={{ fontSize:'0.65rem', color: color, fontWeight:600, textTransform:'capitalize' }}>{step.step_type}</div>
        </div>
      </div>
    </div>
  )
}

// ── Simple SVG canvas (React Flow-like but no dep issues) ───────
function WorkflowCanvas({ steps, rules, selectedStep, onSelectStep, startStepId, currentStepId }) {
  const COLS = 3
  const W = 180, H = 90, GAP_X = 240, GAP_Y = 140
  const OFFSET_X = 40, OFFSET_Y = 60

  const positions = {}
  steps.forEach((step, i) => {
    if (step.position && (step.position.x !== 0 || step.position.y !== 0)) {
      positions[step.id] = step.position
    } else {
      const col = i % COLS, row = Math.floor(i / COLS)
      positions[step.id] = { x: OFFSET_X + col * GAP_X, y: OFFSET_Y + row * GAP_Y }
    }
  })

  const maxX = Math.max(...Object.values(positions).map(p => p.x), 0) + W + OFFSET_X
  const maxY = Math.max(...Object.values(positions).map(p => p.y), 0) + H + OFFSET_Y

  return (
    <div style={{ width:'100%', height:'100%', overflow:'auto', background:'#0f0f13', position:'relative', backgroundImage:'radial-gradient(circle, #2a2a35 1px, transparent 1px)', backgroundSize:'24px 24px' }}>
      <svg style={{ position:'absolute', top:0, left:0, pointerEvents:'none' }} width={maxX} height={maxY}>
        {rules.map(rule => {
          const src = steps.find(s => s.id === rule.step_id)
          const tgt = steps.find(s => s.id === rule.next_step_id)
          if (!src || !tgt) return null
          const sp = positions[src.id], tp = positions[tgt.id]
          if (!sp || !tp) return null
          const x1 = sp.x + W/2, y1 = sp.y + H
          const x2 = tp.x + W/2, y2 = tp.y
          const cy = (y1 + y2) / 2
          return (
            <g key={rule.id}>
              <path d={`M${x1},${y1} C${x1},${cy} ${x2},${cy} ${x2},${y2}`}
                stroke="#3f3f50" strokeWidth={2} fill="none" markerEnd="url(#arrow)" />
              {rule.label && (
                <text x={(x1+x2)/2} y={cy} fill="#6b6b80" fontSize={10} textAnchor="middle" dy={-4}>{rule.label}</text>
              )}
            </g>
          )
        })}
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#3f3f50" />
          </marker>
        </defs>
      </svg>
      {steps.map(step => {
        const pos = positions[step.id] || { x: 40, y: 40 }
        return (
          <div key={step.id} style={{ position:'absolute', left: pos.x, top: pos.y, width: W }}>
            <StepNode step={step} isStart={step.id === startStepId} isSelected={selectedStep?.id === step.id} currentStepId={currentStepId} onClick={onSelectStep} />
          </div>
        )
      })}
    </div>
  )
}

const STEP_TYPES = ['task', 'approval', 'notification', 'condition']

export default function BuilderPage() {
  const { id } = useParams()
  const router = useRouter()
  const [wf, setWf] = useState(null)
  const [steps, setSteps] = useState([])
  const [rules, setRules] = useState([])
  const [selectedStep, setSelectedStep] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [panel, setPanel] = useState('steps') // 'steps' | 'rules'
  const [newStep, setNewStep] = useState({ name:'', step_type:'task' })
  const [newRule, setNewRule] = useState({ condition:'DEFAULT', next_step_id:'', label:'', priority:0 })
  const [msg, setMsg] = useState('')

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    try {
      const data = await getWorkflow(id)
      if (!data) return
      setWf(data)
      const allSteps = data.steps || []
      setSteps(allSteps)
      setRules(allSteps.flatMap(s => s.rules || []))
    } finally { setLoading(false) }
  }

  async function addStep(e) {
    e.preventDefault()
    if (!newStep.name.trim()) return
    try {
      const s = await createStep(id, { name: newStep.name, step_type: newStep.step_type, metadata:{} })
      setSteps(p => [...p, { ...s, rules:[] }])
      // Auto-set start step if first
      if (steps.length === 0) {
        await updateWorkflow(id, { start_step_id: s.id })
        setWf(p => ({ ...p, start_step_id: s.id }))
      }
      setNewStep({ name:'', step_type:'task' })
      flash('Step added')
    } catch (err) { flash(err.message, true) }
  }

  async function removeStep(stepId) {
    if (!confirm('Delete this step?')) return
    await deleteStep(stepId)
    setSteps(p => p.filter(s => s.id !== stepId))
    setRules(p => p.filter(r => r.step_id !== stepId && r.next_step_id !== stepId))
    if (selectedStep?.id === stepId) setSelectedStep(null)
  }

  async function setAsStart(stepId) {
    await updateWorkflow(id, { start_step_id: stepId })
    setWf(p => ({ ...p, start_step_id: stepId }))
    flash('Start step updated')
  }

  async function addRule(e) {
    e.preventDefault()
    if (!selectedStep) return
    try {
      const r = await createRule(selectedStep.id, { ...newRule, next_step_id: newRule.next_step_id || null })
      setRules(p => [...p, r])
      setNewRule({ condition:'DEFAULT', next_step_id:'', label:'', priority:0 })
      flash('Rule added')
    } catch (err) { flash(err.message, true) }
  }

  function flash(msg, isErr = false) {
    setMsg(isErr ? '❌ ' + msg : '✅ ' + msg)
    setTimeout(() => setMsg(''), 3000)
  }

  const stepRules = rules.filter(r => r.step_id === selectedStep?.id)

  if (loading) return <AppShell><div style={{ padding:'2rem', color:'#6b6b80' }}>Loading builder…</div></AppShell>

  return (
    <AppShell>
      <div style={{ height:'calc(100vh - 52px)', display:'flex', flexDirection:'column' }}>
        {/* Toolbar */}
        <div style={{ height:52, background:'#16161d', borderBottom:'1px solid #2a2a35', display:'flex', alignItems:'center', padding:'0 1rem', gap:'1rem', flexShrink:0 }}>
          <button onClick={() => router.back()} style={{ background:'none', border:'none', color:'#6b6b80', cursor:'pointer' }}>←</button>
          <span style={{ fontWeight:700, color:'#e2e2f0', fontSize:'0.9rem' }}>{wf?.name}</span>
          <span style={{ fontSize:'0.7rem', color:'#6b6b80' }}>{steps.length} steps · {rules.length} rules</span>
          {msg && <span style={{ fontSize:'0.8rem', color: msg.startsWith('❌') ? '#ef4444' : '#22c55e' }}>{msg}</span>}
          <div style={{ flex:1 }} />
          <button onClick={() => router.push(`/workflows/${id}`)} className="btn-ghost" style={{ fontSize:'0.8rem', padding:'0.35rem 0.75rem' }}>View Details</button>
          <button onClick={async () => { const { executeWorkflow } = await import('../../../lib/api'); const { execution_id } = await executeWorkflow(id, {}); router.push(`/executions/${execution_id}`) }} className="btn-primary" style={{ fontSize:'0.8rem', padding:'0.35rem 0.75rem' }}>▶ Run</button>
        </div>

        {/* Content */}
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
          {/* Left panel */}
          <div style={{ width:300, background:'#16161d', borderRight:'1px solid #2a2a35', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            {/* Panel tabs */}
            <div style={{ display:'flex', borderBottom:'1px solid #2a2a35' }}>
              {[['steps','Steps'],['rules','Rules']].map(([key, lbl]) => (
                <button key={key} onClick={() => setPanel(key)} style={{ flex:1, padding:'0.6rem', background:'none', border:'none', cursor:'pointer', fontSize:'0.8rem', fontWeight: panel === key ? 700 : 400, color: panel === key ? '#818cf8' : '#6b6b80', borderBottom: panel === key ? '2px solid #6366f1' : '2px solid transparent' }}>{lbl}</button>
              ))}
            </div>

            <div style={{ flex:1, overflow:'auto', padding:'0.875rem' }}>
              {panel === 'steps' ? (
                <>
                  {/* Add step form */}
                  <form onSubmit={addStep} style={{ marginBottom:'1rem', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                    <input className="input-base" placeholder="Step name…" value={newStep.name} onChange={e => setNewStep(p => ({...p, name:e.target.value}))} style={{ fontSize:'0.8rem' }} />
                    <select value={newStep.step_type} onChange={e => setNewStep(p => ({...p, step_type:e.target.value}))} className="input-base" style={{ fontSize:'0.8rem' }}>
                      {STEP_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                    </select>
                    <button type="submit" className="btn-primary" style={{ fontSize:'0.8rem', padding:'0.4rem', justifyContent:'center' }}>+ Add Step</button>
                  </form>

                  {/* Steps list */}
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                    {steps.length === 0 && <div style={{ color:'#6b6b80', fontSize:'0.8rem', textAlign:'center', padding:'1rem' }}>No steps yet</div>}
                    {steps.map(step => (
                      <div key={step.id} onClick={() => { setSelectedStep(step); setPanel('rules') }} style={{
                        background: selectedStep?.id === step.id ? 'rgba(99,102,241,0.12)' : '#0f0f13',
                        border: `1px solid ${selectedStep?.id === step.id ? '#6366f1' : '#2a2a35'}`,
                        borderRadius:8, padding:'0.6rem 0.75rem', cursor:'pointer', display:'flex', alignItems:'center', gap:'0.5rem'
                      }}>
                        <span style={{ fontSize:'0.9rem' }}>{ {task:'⚙',approval:'👁',notification:'📧',condition:'🔀'}[step.step_type] }</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#e2e2f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{step.name}</div>
                          <div style={{ fontSize:'0.65rem', color:'#6b6b80', textTransform:'capitalize' }}>{step.step_type}</div>
                        </div>
                        {step.id === wf?.start_step_id && <span style={{ fontSize:'0.6rem', color:'#22c55e', fontWeight:700 }}>START</span>}
                        <div style={{ display:'flex', gap:'0.25rem' }}>
                          <button onClick={e => { e.stopPropagation(); setAsStart(step.id) }} style={{ background:'none', border:'none', color:'#6b6b80', cursor:'pointer', fontSize:'0.7rem' }} title="Set as start">🏁</button>
                          <button onClick={e => { e.stopPropagation(); removeStep(step.id) }} style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:'0.7rem' }}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {!selectedStep ? (
                    <div style={{ color:'#6b6b80', fontSize:'0.8rem', textAlign:'center', padding:'2rem' }}>Select a step to manage its rules</div>
                  ) : (
                    <>
                      <div style={{ marginBottom:'1rem', padding:'0.75rem', background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:8 }}>
                        <div style={{ fontSize:'0.7rem', color:'#818cf8', fontWeight:700, marginBottom:'0.2rem' }}>SELECTED STEP</div>
                        <div style={{ fontSize:'0.85rem', fontWeight:600, color:'#e2e2f0' }}>{selectedStep.name}</div>
                      </div>

                      {/* Add rule */}
                      <form onSubmit={addRule} style={{ marginBottom:'1rem', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                        <label style={{ fontSize:'0.7rem', color:'#6b6b80', fontWeight:600, textTransform:'uppercase' }}>Condition</label>
                        <input className="input-base" placeholder="DEFAULT or amount > 100" value={newRule.condition} onChange={e => setNewRule(p => ({...p, condition:e.target.value}))} style={{ fontSize:'0.8rem' }} />
                        <label style={{ fontSize:'0.7rem', color:'#6b6b80', fontWeight:600, textTransform:'uppercase' }}>Next Step</label>
                        <select value={newRule.next_step_id} onChange={e => setNewRule(p => ({...p, next_step_id:e.target.value}))} className="input-base" style={{ fontSize:'0.8rem' }}>
                          <option value="">— Terminal (end) —</option>
                          {steps.filter(s => s.id !== selectedStep.id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <input className="input-base" placeholder="Label (optional)" value={newRule.label} onChange={e => setNewRule(p => ({...p, label:e.target.value}))} style={{ fontSize:'0.8rem' }} />
                        <button type="submit" className="btn-primary" style={{ fontSize:'0.8rem', padding:'0.4rem', justifyContent:'center' }}>+ Add Rule</button>
                      </form>

                      {/* Rules list */}
                      <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                        {stepRules.length === 0 && <div style={{ color:'#6b6b80', fontSize:'0.75rem', textAlign:'center', padding:'0.75rem' }}>No rules — step will end workflow</div>}
                        {stepRules.map(rule => {
                          const nextStep = steps.find(s => s.id === rule.next_step_id)
                          return (
                            <div key={rule.id} style={{ background:'#0f0f13', border:'1px solid #2a2a35', borderRadius:8, padding:'0.6rem 0.75rem' }}>
                              <div style={{ fontSize:'0.75rem', fontFamily:'monospace', color:'#818cf8', marginBottom:'0.2rem' }}>{rule.condition}</div>
                              <div style={{ fontSize:'0.7rem', color:'#6b6b80' }}>→ {nextStep?.name || 'End'}{rule.label ? ` (${rule.label})` : ''}</div>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Canvas */}
          <div style={{ flex:1, overflow:'hidden' }}>
            {steps.length === 0 ? (
              <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'1rem', background:'#0f0f13', backgroundImage:'radial-gradient(circle, #2a2a35 1px, transparent 1px)', backgroundSize:'24px 24px' }}>
                <div style={{ fontSize:'3rem' }}>⚡</div>
                <div style={{ color:'#6b6b80', fontSize:'0.9rem', textAlign:'center' }}>No steps yet.<br />Add steps from the left panel.</div>
              </div>
            ) : (
              <WorkflowCanvas steps={steps} rules={rules} selectedStep={selectedStep} onSelectStep={s => { setSelectedStep(s); setPanel('rules') }} startStepId={wf?.start_step_id} currentStepId={null} />
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
