const express = require('express')
const router = express.Router()
const { getExecution, listExecutions, cancelExecution, retryExecution, approveExecution } = require('../executionService')
const { auth } = require('../middleware/auth')

router.get('/', auth, async (req, res) => {
  try {
    const data = await listExecutions({ workflowId: req.query.workflow_id, status: req.query.status })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/:id', auth, async (req, res) => {
  try {
    const data = await getExecution(req.params.id)
    if (!data) return res.status(404).json({ error: 'Not found' })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/:id/approve', auth, async (req, res) => {
  try {
    const { approved, comment } = req.body
    const result = await approveExecution(req.params.id, approved !== false, comment, req.user.id)
    res.json(result)
  } catch (err) { res.status(err.status || 500).json({ error: err.message }) }
})

router.post('/:id/cancel', auth, async (req, res) => {
  try { res.json(await cancelExecution(req.params.id)) }
  catch (err) { res.status(err.status || 500).json({ error: err.message }) }
})

router.post('/:id/retry', auth, async (req, res) => {
  try { res.json(await retryExecution(req.params.id)) }
  catch (err) { res.status(err.status || 500).json({ error: err.message }) }
})

module.exports = router
