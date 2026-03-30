import { useCallback, useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"
import axios from "@/api/axiosInstance"
import { useAuth } from "@/auth/AuthContext"
import { ensurePresenceSessionId } from "@/utils/presenceSession"

const START_ENDPOINTS = ["/sessions/start"]
const PING_ENDPOINTS = ["/sessions/ping", "/users/online/ping"]
const ACTIVITY_EVENT_ENDPOINT = "/user-activity/events"

const pickStatus = (error) => error?.response?.status

export default function usePresencePing({
  intervalMs = 60000,
  minIntervalMs = 15000,
} = {}) {
  const { user } = useAuth()
  const location = useLocation()
  const endpointRef = useRef(null)
  const sessionRef = useRef(null)
  const lastPingRef = useRef(0)
  const disabledUntilRef = useRef(0)
  const startedRef = useRef(false)
  const lastRouteRef = useRef("")

  useEffect(() => {
    sessionRef.current = ensurePresenceSessionId(user?.id)
    endpointRef.current = null
    disabledUntilRef.current = 0
    lastPingRef.current = 0
    startedRef.current = false
    lastRouteRef.current = ""
  }, [user?.id])

  const sendActivityEvent = useCallback(
    async (eventType, extra = {}) => {
      if (!user?.id || !sessionRef.current) return
      try {
        await axios.post(ACTIVITY_EVENT_ENDPOINT, {
          session_id: sessionRef.current,
          event_type: eventType,
          path: window.location.pathname,
          is_visible: document.hidden ? 0 : 1,
          meta: extra,
        })
      } catch (err) {
        const status = pickStatus(err)
        if (status === 404 || status === 501) return
      }
    },
    [user?.id],
  )

  const startSession = useCallback(async () => {
    if (!user?.id || !sessionRef.current || startedRef.current) return

    const payload = {
      session_id: sessionRef.current,
      user_id: user.id,
      started_path: window.location.pathname,
      last_path: window.location.pathname,
      is_visible: document.hidden ? 0 : 1,
    }

    for (const endpoint of START_ENDPOINTS) {
      try {
        await axios.post(endpoint, payload)
        startedRef.current = true
        lastPingRef.current = Date.now()
        return
      } catch (err) {
        const status = pickStatus(err)
        if (status === 404 || status === 501) continue
        return
      }
    }
  }, [user?.id])

  const ping = useCallback(
    async (force = false) => {
      if (!user?.id || !sessionRef.current) return
      if (Date.now() < disabledUntilRef.current) return
      if (!startedRef.current) {
        await startSession()
      }
      const now = Date.now()
      if (!force && now - lastPingRef.current < minIntervalMs) return

      const payload = {
        session_id: sessionRef.current,
        user_id: user.id,
        last_path: window.location.pathname,
        is_visible: document.hidden ? 0 : 1,
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
    [user?.id, minIntervalMs, startSession],
  )

  useEffect(() => {
    if (!user?.id) return
    startSession().then(() => {
      ping(true)
      sendActivityEvent("focus", { source: "mount" })
    })
    const interval = setInterval(() => ping(), intervalMs)
    const onFocus = () => {
      ping(true)
      sendActivityEvent("focus", { source: "window_focus" })
    }
    const onBlur = () => {
      sendActivityEvent("blur", { source: "window_blur" })
    }
    const onVisibility = () => {
      if (!document.hidden) {
        ping(true)
        sendActivityEvent("focus", { source: "visibilitychange" })
      } else {
        sendActivityEvent("blur", { source: "visibilitychange" })
      }
    }
    window.addEventListener("focus", onFocus)
    window.addEventListener("blur", onBlur)
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
      window.removeEventListener("blur", onBlur)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [user?.id, ping, intervalMs, sendActivityEvent, startSession])

  useEffect(() => {
    if (!user?.id || !sessionRef.current) return
    const pathname = location.pathname || "/"
    if (lastRouteRef.current === pathname) return
    lastRouteRef.current = pathname

    if (!startedRef.current) {
      startSession()
    }

    sendActivityEvent("route_change", { pathname })
    ping(true)
  }, [location.pathname, user?.id, ping, sendActivityEvent, startSession])
}
