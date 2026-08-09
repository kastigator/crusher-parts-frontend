import React, { useCallback, useEffect, useState } from "react"
import { setLogoutHandler } from "./authService"
import { clearPresenceSessionId, readPresenceSessionId } from "@/utils/presenceSession"
import { AuthContext } from "./AuthContext"
import { getApiBaseUrl } from "@/config/runtimeConfig"

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"))
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem("refreshToken"))
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
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken)
    } else {
      localStorage.removeItem("refreshToken")
    }
  }, [refreshToken])

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

  const login = (newToken, userData, newRefreshToken) => {
    setToken(newToken)
    setUser(userData)
    setRefreshToken(newRefreshToken || null)
  }

  const refreshAccess = useCallback(async () => {
    const tokenValue = localStorage.getItem("token")
    const baseUrl = getApiBaseUrl()
    if (!tokenValue || !baseUrl) return null
    const response = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tokenValue}` },
      credentials: "include",
    })
    if (!response.ok) return null
    const payload = await response.json()
    if (payload?.user) setUser(payload.user)
    return payload?.user || null
  }, [])

  useEffect(() => {
    if (token) refreshAccess().catch(() => {})
  }, [token, refreshAccess])

  const notifySessionLogout = useCallback(async (sessionId) => {
    if (!sessionId) return
    const baseUrl = getApiBaseUrl()
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
    setRefreshToken(null)
    setUser(null)
  }, [user, notifySessionLogout])

  useEffect(() => {
    setLogoutHandler(logout)
  }, [logout])

  return <AuthContext.Provider value={{ token, refreshToken, user, login, logout, refreshAccess }}>{children}</AuthContext.Provider>
}
