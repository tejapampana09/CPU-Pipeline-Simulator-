import { simulate as simulateLocal } from '../sim/index.js'

// Set VITE_API_URL (e.g. http://localhost:5000) to use the Express backend.
// Without it, or if the backend is unreachable, the bundled local engine runs instead.
const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '')

export async function runSimulation(source, options) {
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, ...options }),
      })
      if (res.ok) return { ...(await res.json()), engine: 'backend' }
      if (res.status === 400) {
        const body = await res.json()
        if (body.errors) return { errors: body.errors, engine: 'backend' }
      }
    } catch {
      // backend unreachable — fall through to the local engine
    }
  }
  return { ...simulateLocal(source, options), engine: 'local' }
}
