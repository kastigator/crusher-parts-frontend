const SESSION_PREFIX = "crusher.session"

const getSessionKey = (userId) => `${SESSION_PREFIX}.${userId || "anon"}`
const getLegacySessionKey = getSessionKey

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
    const storageKey = getSessionKey(userId)
    const current = sessionStorage.getItem(storageKey)
    if (current) return current

    const legacy = localStorage.getItem(getLegacySessionKey(userId))
    if (legacy) {
      sessionStorage.setItem(storageKey, legacy)
      localStorage.removeItem(getLegacySessionKey(userId))
      return legacy
    }
    return null
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
      sessionStorage.setItem(getSessionKey(userId), sessionId)
    } catch {
      // ignore storage errors
    }
  }
  return sessionId
}

export const clearPresenceSessionId = (userId) => {
  if (!userId) return
  try {
    sessionStorage.removeItem(getSessionKey(userId))
    localStorage.removeItem(getLegacySessionKey(userId))
  } catch {
    // ignore storage errors
  }
}
