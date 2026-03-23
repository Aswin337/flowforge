const { Engine } = require('json-rules-engine')

/**
 * Evaluate rules against facts to find the next step.
 * Rules with condition='DEFAULT' always match (fallback).
 * Returns next_step_id or null (terminal).
 */
async function evaluateRules(rules, facts) {
  if (!rules || rules.length === 0) return null

  // Sort by priority ascending
  const sorted = [...rules].sort((a, b) => a.priority - b.priority)

  for (const rule of sorted) {
    // DEFAULT condition always passes
    if (!rule.condition || rule.condition.toUpperCase() === 'DEFAULT') {
      return rule.next_step_id ?? null
    }

    // Try JSON Rules Engine format: { all: [...] } or { any: [...] }
    try {
      let conditions
      if (typeof rule.condition === 'string') {
        conditions = JSON.parse(rule.condition)
      } else {
        conditions = rule.condition
      }

      const engine = new Engine()
      engine.addRule({
        conditions,
        event: { type: 'match', params: { next_step_id: rule.next_step_id } }
      })

      const { events } = await engine.run(facts || {})
      if (events.length > 0) {
        return events[0].params.next_step_id ?? null
      }
    } catch (err) {
      // Simple key=value expression fallback
      try {
        const matched = evaluateSimpleCondition(rule.condition, facts || {})
        if (matched) return rule.next_step_id ?? null
      } catch {
        console.warn('[RuleEngine] Could not evaluate condition:', rule.condition, err.message)
      }
    }
  }

  return null
}

function evaluateSimpleCondition(condition, facts) {
  // Supports: "amount > 100", "status == approved", "field != value"
  const ops = [' >= ', ' <= ', ' != ', ' == ', ' > ', ' < ']
  for (const op of ops) {
    if (condition.includes(op)) {
      const [left, right] = condition.split(op).map(s => s.trim())
      const factVal = resolvePath(facts, left)
      const condVal = isNaN(right) ? right.replace(/['"]/g, '') : Number(right)
      switch (op.trim()) {
        case '>':  return Number(factVal) > Number(condVal)
        case '<':  return Number(factVal) < Number(condVal)
        case '>=': return Number(factVal) >= Number(condVal)
        case '<=': return Number(factVal) <= Number(condVal)
        case '==': return String(factVal) === String(condVal)
        case '!=': return String(factVal) !== String(condVal)
      }
    }
  }
  return false
}

function resolvePath(obj, path) {
  return path.split('.').reduce((o, k) => (o ?? {})[k], obj)
}

module.exports = { evaluateRules }
