const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('ff_token')
}

async function call(path, opts = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json', ...opts.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res
  try {
    res = await fetch(`${BASE}${path}`, { ...opts, headers })
  } catch (networkErr) {
    // Only here means truly no connection (backend not running)
    throw new Error('NETWORK_ERROR')
  }

  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('ff_token')
      localStorage.removeItem('ff_user')
      window.location.href = '/auth'
    }
    throw new Error(json.error || `HTTP ${res.status}`)
  }

  return json
}

// Auth
export const apiLogin    = (body) => call('/auth/login',    { method: 'POST', body: JSON.stringify(body) })
export const apiRegister = (body) => call('/auth/register', { method: 'POST', body: JSON.stringify(body) })
export const apiLogout   = ()     => call('/auth/logout',   { method: 'POST' })
export const apiMe       = ()     => call('/auth/me')

// Workflows
export const getWorkflows    = ()        => call('/workflows')
export const getWorkflow     = (id)      => call(`/workflows/${id}`)
export const createWorkflow  = (body)    => call('/workflows',       { method: 'POST',   body: JSON.stringify(body) })
export const updateWorkflow  = (id, b)   => call(`/workflows/${id}`, { method: 'PUT',    body: JSON.stringify(b) })
export const deleteWorkflow  = (id)      => call(`/workflows/${id}`, { method: 'DELETE' })
export const executeWorkflow = (id, inp) => call(`/workflows/${id}/execute`, { method: 'POST', body: JSON.stringify({ input: inp || {} }) })

// Steps
export const getSteps   = (wfId)    => call(`/workflows/${wfId}/steps`)
export const createStep = (wfId, b) => call(`/workflows/${wfId}/steps`, { method: 'POST',   body: JSON.stringify(b) })
export const updateStep = (id, b)   => call(`/steps/${id}`,             { method: 'PUT',    body: JSON.stringify(b) })
export const deleteStep = (id)      => call(`/steps/${id}`,             { method: 'DELETE' })

// Rules
export const getRules   = (stepId)  => call(`/steps/${stepId}/rules`)
export const createRule = (sid, b)  => call(`/steps/${sid}/rules`, { method: 'POST',   body: JSON.stringify(b) })
export const updateRule = (id, b)   => call(`/rules/${id}`,        { method: 'PUT',    body: JSON.stringify(b) })
export const deleteRule = (id)      => call(`/rules/${id}`,        { method: 'DELETE' })

// Executions
export const getExecutions    = (wfId) => call(`/executions?workflow_id=${wfId}`)
export const getExecution     = (id)   => call(`/executions/${id}`)
export const approveExecution = (id,b) => call(`/executions/${id}/approve`, { method: 'POST', body: JSON.stringify(b) })
export const cancelExecution  = (id)   => call(`/executions/${id}/cancel`,  { method: 'POST' })
export const retryExecution   = (id)   => call(`/executions/${id}/retry`,   { method: 'POST' })

// Stats
export const getStats = () => call('/stats')
