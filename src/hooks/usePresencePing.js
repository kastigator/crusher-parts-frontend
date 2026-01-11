import { useCallback, useEffect, useRef } from "react"
import axios from "@/api/axiosInstance"
import { useAuth } from "@/auth/AuthContext"
import { ensurePresenceSessionId } from "@/utils/presenceSession"

const PING_ENDPOINTS = ["/sessions/ping", "/users/online/ping"]

const pickStatus = (error) => error?.response?.status

export default function usePresencePing({
  intervalMs = 60000,
  minIntervalMs = 15000,
} = {}) {
  const { user } = useAuth()
  const endpointRef = useRef(null)
  const sessionRef = useRef(null)
  const lastPingRef = useRef(0)
  const disabledUntilRef = useRef(0)

  useEffect(() => {
    sessionRef.current = ensurePresenceSessionId(user?.id)
    endpointRef.current = null
    disabledUntilRef.current = 0
    lastPingRef.current = 0
  }, [user?.id])

  const ping = useCallback(
    async (force = false) => {
      if (!user?.id || !sessionRef.current) return
      if (Date.now() < disabledUntilRef.current) return
      const now = Date.now()
      if (!force && now - lastPingRef.current < minIntervalMs) return

      const payload = {
        session_id: sessionRef.current,
        user_id: user.id,
        last_path: window.location.pathname,
      }

      const candidates = endpointRef.current
        ? [endpointRef.current]
        : PING_ENDPOINTS

      for (const endpoint of candidates) {
        try {
          await axios.post(endpoint, payload)
          endpointRef.current = endpoint
          lastPingRef.current = Date.now()
          return
        } catch (err) {
          const status = pickStatus(err)
          if (status === 404 || status === 501) {
            continue
          }
          // any other error - stop this cycle, keep trying later
          return
        }
      }

      disabledUntilRef.current = Date.now() + 5 * 60 * 1000
    },
    [user?.id, minIntervalMs],
  )

  useEffect(() => {
    if (!user?.id) return
    ping(true)
    const interval = setInterval(() => ping(), intervalMs)
    const onFocus = () => ping(true)
    const onVisibility = () => {
      if (!document.hidden) ping(true)
    }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [user?.id, ping, intervalMs])
}
