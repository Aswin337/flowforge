const express = require('express')
const router = express.Router()
const { getStats } = require('../executionService')
const { auth } = require('../middleware/auth')

router.get('/', auth, async (req, res) => {
  try { res.json(await getStats()) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
