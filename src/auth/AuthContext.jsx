import React, { createContext, useContext, useState, useEffect } from 'react'
import { setLogoutHandler } from './authService'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(() => {
    try {
      const data = localStorage.getItem('userData')
      return data ? JSON.parse(data) : null
    } catch {
      localStorage.removeItem('userData')
      return null
    }
  })

  // ✅ Храним токен в localStorage, когда он обновляется
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
    }
  }, [token])

  // ✅ Храним пользователя в localStorage, когда он обновляется
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem('userData', JSON.stringify(user))
      } catch {
        localStorage.removeItem('userData')
      }
    } else {
      localStorage.removeItem('userData')
    }
  }, [user])

  // ✅ Только меняем state — не пишем вручную в localStorage
  const login = (newToken, userData) => {
    setToken(newToken)
    setUser(userData)
  }

  const logout = () => {
    setToken(null)
    setUser(null)
  }

  useEffect(() => {
    setLogoutHandler(logout)
  }, [])

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
