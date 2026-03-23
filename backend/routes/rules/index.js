const express = require('express')
const router = express.Router()
const { updateRule, deleteRule } = require('../../workflowService')
const { auth } = require('../../middleware/auth')

router.put('/:id', auth, async (req, res) => {
  try { res.json(await updateRule(req.params.id, req.body)) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id', auth, async (req, res) => {
  try { await deleteRule(req.params.id); res.json({ ok: true }) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
