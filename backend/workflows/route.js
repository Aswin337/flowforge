const express = require('express')
const router = express.Router()
const { listWorkflows, getWorkflow, getWorkflowWithSteps, createWorkflow, updateWorkflow, deleteWorkflow } = require('../workflowService')
const { auth, adminOnly } = require('../middleware/auth')

router.get('/', auth, async (req, res) => {
  try {
    const data = await listWorkflows(req.user.role === 'admin' ? null : req.user.id)
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', auth, async (req, res) => {
  try {
    const { name, description, input_schema } = req.body
    if (!name) return res.status(400).json({ error: 'name required' })
    const data = await createWorkflow({ name, description, input_schema, created_by: req.user.id })
    res.status(201).json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/:id', auth, async (req, res) => {
  try {
    const data = await getWorkflowWithSteps(req.params.id)
    if (!data) return res.status(404).json({ error: 'Not found' })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const data = await updateWorkflow(req.params.id, req.body)
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await deleteWorkflow(req.params.id)
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /workflows/:id/execute
router.post('/:id/execute', auth, async (req, res) => {
  try {
    const { createExecution, runExecution } = require('../executionService')
    const exec = await createExecution(req.params.id, req.body.input || {}, req.user.id)
    runExecution(exec.id).catch(console.error) // async - don't await
    res.status(202).json({ execution_id: exec.id, status: 'running', message: 'Execution started' })
  } catch (err) { res.status(err.status || 500).json({ error: err.message }) }
})

// GET /workflows/:id/steps
router.get('/:id/steps', auth, async (req, res) => {
  try {
    const { getSteps } = require('../workflowService')
    const data = await getSteps(req.params.id)
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /workflows/:id/steps
router.post('/:id/steps', auth, async (req, res) => {
  try {
    const { createStep } = require('../workflowService')
    const data = await createStep({ ...req.body, workflow_id: req.params.id })
    res.status(201).json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
