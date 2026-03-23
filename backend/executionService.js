const { v4: uuid } = require('uuid')
const { getServiceClient } = require('./supabase')
const { evaluateRules } = require('./ruleEngine')

function dbErr(error, context) {
  console.error(`[DB Error in ${context}]:`, error?.message || error?.code)
  if (error?.code === '42P01') {
    throw Object.assign(new Error('Database not set up. Please run schema.sql in Supabase.'), { status: 503 })
  }
  throw error
}

async function appendLog(db, execId, level, message, meta = {}) {
  try {
    await db.from('execution_logs').insert({
      id: uuid(), execution_id: execId, level, message, meta,
      created_at: new Date().toISOString()
    })
  } catch (e) {
    console.warn('[Logger] Could not write log:', e?.message)
  }
}

async function setStatus(db, execId, status, extra = {}) {
  await db.from('executions').update({
    status, updated_at: new Date().toISOString(), ...extra
  }).eq('id', execId)
}

async function createExecution(workflowId, inputData, userId) {
  const db = getServiceClient()
  const { data: wf, error: wfErr } = await db
    .from('workflows').select('*').eq('id', workflowId).single()
  if (wfErr) dbErr(wfErr, 'createExecution/workflow')
  if (!wf) throw Object.assign(new Error('Workflow not found'), { status: 404 })
  if (!wf.is_active) throw Object.assign(new Error('Workflow is inactive'), { status: 400 })

  const { data: exec, error: execErr } = await db
    .from('executions')
    .insert({
      id: uuid(),
      workflow_id: workflowId,
      status: 'pending',
      input_data: inputData || {},
      current_step_id: wf.start_step_id || null,
      started_by: userId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select().single()
  if (execErr) dbErr(execErr, 'createExecution/insert')
  return exec
}

async function runExecution(execId) {
  const db = getServiceClient()

  const { data: exec } = await db.from('executions').select('*').eq('id', execId).single()
  if (!exec) { console.error('Execution not found:', execId); return }

  const { data: wf } = await db.from('workflows').select('*').eq('id', exec.workflow_id).single()
  if (!wf) { console.error('Workflow not found for execution:', execId); return }

  await setStatus(db, execId, 'running')
  await appendLog(db, execId, 'info', `▶ Starting workflow: ${wf.name}`)

  const facts = { ...(exec.input_data || {}) }
  let currentStepId = exec.current_step_id || wf.start_step_id
  const MAX_STEPS = 50
  let iterations = 0

  while (currentStepId && iterations < MAX_STEPS) {
    iterations++

    const { data: step } = await db.from('steps').select('*').eq('id', currentStepId).single()
    if (!step) {
      await appendLog(db, execId, 'error', `Step ${currentStepId} not found`)
      await setStatus(db, execId, 'failed', { error_message: 'Step not found', ended_at: new Date().toISOString() })
      return
    }

    await setStatus(db, execId, 'running', { current_step_id: currentStepId })
    await appendLog(db, execId, 'info', `⚙ Executing: ${step.name} [${step.step_type}]`, { step_id: step.id })

    // Approval — pause and wait
    if (step.step_type === 'approval') {
      await setStatus(db, execId, 'waiting', { current_step_id: currentStepId })
      await appendLog(db, execId, 'info', `⏸ Waiting for approval at: ${step.name}`)
      return
    }

    // Process step
    let result
    try {
      result = await processStep(step, facts, db, execId)
      facts[step.id] = result
      facts[step.name] = result
      await appendLog(db, execId, 'success', `✅ Completed: ${step.name}`)
    } catch (stepErr) {
      await appendLog(db, execId, 'error', `❌ Failed: ${step.name} — ${stepErr.message}`)
      await setStatus(db, execId, 'failed', { error_message: stepErr.message, ended_at: new Date().toISOString() })
      return
    }

    // Evaluate rules
    const { data: rules } = await db.from('rules').select('*').eq('step_id', currentStepId).order('priority')
    if (rules && rules.length > 0) {
  await appendLog(db, execId, 'info', `📋 Evaluating ${rules.length} rule(s)…`)
  
  const nextId = await evaluateRules(rules, facts)

  console.log("Next step:", nextId) // ✅ DEBUG

  if (!nextId) {
    await appendLog(db, execId, 'info', `🏁 Workflow complete (no next step)`)
    break   // 🔥 THIS IS THE MAIN FIX
  }

  const { data: nextStep } = await db
    .from('steps')
    .select('name')
    .eq('id', nextId)
    .single()

  await appendLog(db, execId, 'info', `➡ Moving to: ${nextStep?.name || nextId}`)

  currentStepId = nextId
}  else {
  await appendLog(db, execId, 'info', `🏁 No rules — workflow complete`)
  break   // 🔥 IMPORTANT
}
  }

  if (iterations >= MAX_STEPS) {
    await appendLog(db, execId, 'error', 'Max iterations reached — possible loop')
    await setStatus(db, execId, 'failed', { error_message: 'Max iterations exceeded', ended_at: new Date().toISOString() })
    return
  }

  await setStatus(db, execId, 'completed', { ended_at: new Date().toISOString() })
  await appendLog(db, execId, 'success', `🎉 Workflow completed!`)
}

async function processStep(step, facts, db, execId) {
  switch (step.step_type) {
    case 'task':
      await appendLog(db, execId, 'info', `  📌 ${step.metadata?.description || 'Processing task…'}`)
      await new Promise(r => setTimeout(r, 50))
      return { success: true, processed_at: new Date().toISOString() }
    case 'notification':
      await appendLog(db, execId, 'info', `  📧 Notification → ${step.metadata?.to || 'team'}`)
      return { notified: true, to: step.metadata?.to || 'team', sent_at: new Date().toISOString() }
    case 'condition':
      await appendLog(db, execId, 'info', `  🔀 Condition evaluated`)
      return { evaluated: true }
    default:
      return { processed: true }
  }
}

async function approveExecution(execId, approved, comment, userId) {
  const db = getServiceClient()
  const { data: exec } = await db.from('executions').select('*').eq('id', execId).single()
  if (!exec) throw Object.assign(new Error('Execution not found'), { status: 404 })
  if (exec.status !== 'waiting') throw Object.assign(new Error(`Execution is ${exec.status}, not waiting`), { status: 409 })

  const action = approved ? 'approved' : 'rejected'
  await appendLog(db, execId, approved ? 'success' : 'error',
    `${approved ? '✅' : '❌'} ${action} by ${userId || 'user'}${comment ? ': ' + comment : ''}`)

  if (!approved) {
    await setStatus(db, execId, 'failed', {
      error_message: `Rejected: ${comment || 'no reason'}`,
      ended_at: new Date().toISOString()
    })
    return { ok: true, status: 'failed' }
  }

  const { data: rules } = await db.from('rules').select('*').eq('step_id', exec.current_step_id).order('priority')
  const facts = { ...(exec.input_data || {}), approved: true, comment }
  const nextId = await evaluateRules(rules || [], facts)

  await setStatus(db, execId, 'running', { current_step_id: nextId || exec.current_step_id })
  // Run async
  runExecution(execId).catch(console.error)
  return { ok: true, status: 'running' }
}

async function cancelExecution(execId) {
  const db = getServiceClient()
  const { data: exec } = await db.from('executions').select('status').eq('id', execId).single()
  if (!exec) throw Object.assign(new Error('Not found'), { status: 404 })
  if (['completed', 'failed', 'cancelled'].includes(exec.status)) {
    throw Object.assign(new Error(`Cannot cancel ${exec.status} execution`), { status: 409 })
  }
  await appendLog(db, execId, 'info', '🚫 Cancelled by user')
  await setStatus(db, execId, 'cancelled', { ended_at: new Date().toISOString() })
  return { ok: true }
}

async function retryExecution(execId) {
  const db = getServiceClient()
  const { data: exec } = await db.from('executions').select('*').eq('id', execId).single()
  if (!exec) throw Object.assign(new Error('Not found'), { status: 404 })
  if (exec.status !== 'failed') throw Object.assign(new Error('Only failed executions can be retried'), { status: 409 })

  const { data: wf } = await db.from('workflows').select('start_step_id').eq('id', exec.workflow_id).single()
  const { data: newExec } = await db.from('executions')
    .insert({
      id: uuid(), workflow_id: exec.workflow_id, status: 'pending',
      input_data: exec.input_data || {}, current_step_id: wf?.start_step_id || null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    })
    .select().single()

  await appendLog(db, newExec.id, 'info', `🔄 Retrying from failed execution ${execId}`)
  runExecution(newExec.id).catch(console.error)
  return { ok: true, execution_id: newExec.id }
}

async function getExecution(id) {
  const db = getServiceClient()
  const { data, error } = await db.from('executions').select('*').eq('id', id).single()
  if (error) dbErr(error, 'getExecution')
  if (!data) return null
  const { data: logs } = await db.from('execution_logs').select('*')
    .eq('execution_id', id).order('created_at', { ascending: true })
  return { ...data, log_entries: logs || [] }
}

async function listExecutions(filters = {}) {
  const db = getServiceClient()
  let q = db.from('executions').select('*').order('created_at', { ascending: false }).limit(100)
  if (filters.workflowId) q = q.eq('workflow_id', filters.workflowId)
  if (filters.status) q = q.eq('status', filters.status)
  const { data, error } = await q
  if (error) dbErr(error, 'listExecutions')
  return data || []
}

async function getStats() {
  const db = getServiceClient()
  try {
    const [{ count: totalWf }, { count: activeWf }, { data: execs }] = await Promise.all([
      db.from('workflows').select('*', { count: 'exact', head: true }),
      db.from('workflows').select('*', { count: 'exact', head: true }).eq('is_active', true),
      db.from('executions').select('status').limit(500),
    ])
    const statusMap = {}
    for (const e of execs || []) statusMap[e.status] = (statusMap[e.status] || 0) + 1
    return {
      workflows: { total: totalWf || 0, active: activeWf || 0 },
      executions: { total: (execs || []).length, by_status: statusMap },
      generated_at: new Date().toISOString()
    }
  } catch (e) {
    // Return zeros if tables don't exist yet
    return { workflows: { total: 0, active: 0 }, executions: { total: 0, by_status: {} }, generated_at: new Date().toISOString() }
  }
}

module.exports = { createExecution, runExecution, approveExecution, cancelExecution, retryExecution, getExecution, listExecutions, getStats }
