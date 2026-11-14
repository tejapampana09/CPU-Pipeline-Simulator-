// Share successful and in-flight reviews across playback and panel remounts.
// A new simulation/configuration gets a new session ID. Failed calls are retryable.
export function createReviewCache(request, {maxEntries = 100, ttl = 2 * 60 * 60 * 1000, now = Date.now} = {}) {
  const entries = new Map()
  const keyFor = (sessionId, cycle) => JSON.stringify([sessionId, cycle])
  function entryFor(key) {
    const entry = entries.get(key)
    if (entry && now() - entry.created >= ttl) {
      entries.delete(key)
      return undefined
    }
    return entry
  }
  return {
    peek(sessionId, cycle) { return entryFor(keyFor(sessionId, cycle))?.value },
    load(sessionId, cycle) {
      const key = keyFor(sessionId, cycle)
      const cached = entryFor(key)
      if (cached) return cached.promise
      const entry = {created: now()}
      entry.promise = Promise.resolve().then(() => request(sessionId, cycle)).then(value => {
        entry.value = value
        return value
      }, error => {
        if (entries.get(key) === entry) entries.delete(key)
        throw error
      })
      entries.set(key, entry)
      while (entries.size > maxEntries) entries.delete(entries.keys().next().value)
      return entry.promise
    },
  }
}
