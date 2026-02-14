import React, { useCallback, useEffect, useState } from "react"
import { setLogoutHandler } from "./authService"
import { clearPresenceSessionId, readPresenceSessionId } from "@/utils/presenceSession"
import { AuthContext } from "./AuthContext"

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"))
  const [user, setUser] = useState(() => {
    try {
      const data = localStorage.getItem("userData")
      return data ? JSON.parse(data) : null
    } catch {
      localStorage.removeItem("userData")
      return null
    }
  })

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token)
    } else {
      localStorage.removeItem("token")
    }
  }, [token])

  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem("userData", JSON.stringify(user))
      } catch {
        localStorage.removeItem("userData")
      }
    } else {
      localStorage.removeItem("userData")
    }
  }, [user])

  const login = (newToken, userData) => {
    setToken(newToken)
    setUser(userData)
  }

  const notifySessionLogout = useCallback(async (sessionId) => {
    if (!sessionId) return
    const baseUrl = import.meta.env.VITE_API_URL
    if (!baseUrl) return
    const tokenValue = localStorage.getItem("token")

    try {
      await fetch(`${baseUrl}/api/sessions/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(tokenValue ? { Authorization: `Bearer ${tokenValue}` } : {}),
        },
        body: JSON.stringify({ session_id: sessionId }),
        credentials: "include",
        keepalive: true,
      })
    } catch {
      // ignore logout network errors
    }
  }, [])

  const logout = useCallback(() => {
    const currentUser = user
    const sessionId = readPresenceSessionId(currentUser?.id)
    if (sessionId) {
      notifySessionLogout(sessionId)
      clearPresenceSessionId(currentUser?.id)
    }
    setToken(null)
    setUser(null)
  }, [user, notifySessionLogout])

  useEffect(() => {
    setLogoutHandler(logout)
  }, [logout])

  return <AuthContext.Provider value={{ token, user, login, logout }}>{children}</AuthContext.Provider>
}
