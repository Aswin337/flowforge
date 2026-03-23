const express = require('express')
const router = express.Router()
const { updateStep, deleteStep } = require('../../workflowService')
const { auth } = require('../../middleware/auth')

router.put('/:id', auth, async (req, res) => {
  try {
    const data = await updateStep(req.params.id, req.body)
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    await deleteStep(req.params.id)
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /steps/:id/rules
router.get('/:id/rules', auth, async (req, res) => {
  try {
    const { getRules } = require('../../workflowService')
    const data = await getRules(req.params.id)
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /steps/:id/rules
router.post('/:id/rules', auth, async (req, res) => {
  try {
    const { createRule } = require('../../workflowService')
    const data = await createRule({ ...req.body, step_id: req.params.id })
    res.status(201).json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
