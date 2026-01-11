const SESSION_PREFIX = "crusher.session"

const getSessionKey = (userId) => `${SESSION_PREFIX}.${userId || "anon"}`

const createSessionId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `s_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`
}

export const readPresenceSessionId = (userId) => {
  if (!userId) return null
  try {
    return localStorage.getItem(getSessionKey(userId))
  } catch {
    return null
  }
}

export const ensurePresenceSessionId = (userId) => {
  if (!userId) return null
  let sessionId = readPresenceSessionId(userId)
  if (!sessionId) {
    sessionId = createSessionId()
    try {
      localStorage.setItem(getSessionKey(userId), sessionId)
    } catch {
      // ignore storage errors
    }
  }
  return sessionId
}

export const clearPresenceSessionId = (userId) => {
  if (!userId) return
  try {
    localStorage.removeItem(getSessionKey(userId))
  } catch {
    // ignore storage errors
  }
}
