const { getServiceClient } = require('./supabase')
const { v4: uuid } = require('uuid')

// ── Workflows ────────────────────────────────────────────────

async function listWorkflows(userId) {
  const db = getServiceClient()
  let q = db.from('workflows').select('*').order('created_at', { ascending: false })
  if (userId) q = q.eq('created_by', userId)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

async function getWorkflow(id) {
  const db = getServiceClient()
  const { data, error } = await db.from('workflows').select('*').eq('id', id).single()
  if (error || !data) return null
  return data
}

async function getWorkflowWithSteps(id) {
  const db = getServiceClient()
  const { data: wf, error } = await db.from('workflows').select('*').eq('id', id).single()
  if (error || !wf) return null
  const { data: steps } = await db.from('steps').select('*').eq('workflow_id', id).order('created_at')
  const { data: rules } = await db.from('rules').select('*').in('step_id', (steps || []).map(s => s.id))
  return { ...wf, steps: (steps || []).map(s => ({ ...s, rules: (rules || []).filter(r => r.step_id === s.id) })) }
}

async function createWorkflow({ name, description, input_schema, created_by }) {
  const db = getServiceClient()
  const { data, error } = await db
    .from('workflows')
    .insert({ id: uuid(), name, description: description || '', input_schema: input_schema || {}, is_active: true, version: 1, created_by })
    .select().single()
  if (error) throw error
  return data
}

async function updateWorkflow(id, body) {
  const db = getServiceClient()
  const updates = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.description !== undefined) updates.description = body.description
  if (body.is_active !== undefined) updates.is_active = body.is_active
  if (body.input_schema !== undefined) updates.input_schema = body.input_schema
  if (body.start_step_id !== undefined) updates.start_step_id = body.start_step_id
  updates.version = db.rpc ? undefined : undefined // bump via trigger ideally
  const { data, error } = await db.from('workflows').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

async function deleteWorkflow(id) {
  const db = getServiceClient()
  const { error } = await db.from('workflows').delete().eq('id', id)
  if (error) throw error
}

// ── Steps ────────────────────────────────────────────────────

async function getSteps(workflowId) {
  const db = getServiceClient()
  const { data, error } = await db.from('steps').select('*').eq('workflow_id', workflowId).order('created_at')
  if (error) throw error
  return data ?? []
}

async function createStep({ workflow_id, name, step_type, metadata, position }) {
  const db = getServiceClient()
  const { data, error } = await db
    .from('steps')
    .insert({ id: uuid(), workflow_id, name, step_type: step_type || 'task', metadata: metadata || {}, position: position || { x: 0, y: 0 } })
    .select().single()
  if (error) throw error
  return data
}

async function updateStep(id, body) {
  const db = getServiceClient()
  const updates = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.step_type !== undefined) updates.step_type = body.step_type
  if (body.metadata !== undefined) updates.metadata = body.metadata
  if (body.position !== undefined) updates.position = body.position
  const { data, error } = await db.from('steps').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

async function deleteStep(id) {
  const db = getServiceClient()
  const { error } = await db.from('steps').delete().eq('id', id)
  if (error) throw error
}

// ── Rules ────────────────────────────────────────────────────

async function getRules(stepId) {
  const db = getServiceClient()
  const { data, error } = await db.from('rules').select('*').eq('step_id', stepId).order('priority')
  if (error) throw error
  return data ?? []
}

async function createRule({ step_id, condition, next_step_id, priority, label }) {
  const db = getServiceClient()
  const { data, error } = await db
    .from('rules')
    .insert({ id: uuid(), step_id, condition: condition || 'DEFAULT', next_step_id: next_step_id || null, priority: priority || 0, label: label || '' })
    .select().single()
  if (error) throw error
  return data
}

async function updateRule(id, body) {
  const db = getServiceClient()
  const updates = {}
  if (body.condition !== undefined) updates.condition = body.condition
  if (body.next_step_id !== undefined) updates.next_step_id = body.next_step_id
  if (body.priority !== undefined) updates.priority = body.priority
  if (body.label !== undefined) updates.label = body.label
  const { data, error } = await db.from('rules').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

async function deleteRule(id) {
  const db = getServiceClient()
  const { error } = await db.from('rules').delete().eq('id', id)
  if (error) throw error
}

module.exports = {
  listWorkflows, getWorkflow, getWorkflowWithSteps, createWorkflow, updateWorkflow, deleteWorkflow,
  getSteps, createStep, updateStep, deleteStep,
  getRules, createRule, updateRule, deleteRule
}
