import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(() => {
    const data = localStorage.getItem('userData')
    if (!data) return null
    try {
      return JSON.parse(data)
    } catch {
      localStorage.removeItem('userData')
      return null
    }
  })

  // Поддержка изменения token через useEffect (опционально, если хочешь реактивность)
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
    }
  }, [token])

  useEffect(() => {
    if (user) {
      localStorage.setItem('userData', JSON.stringify(user))
    } else {
      localStorage.removeItem('userData')
    }
  }, [user])

  // ✅ Ключевая часть — сохраняем token и userData немедленно при логине
  const login = (newToken, userData) => {
    localStorage.setItem('token', newToken)
    localStorage.setItem('userData', JSON.stringify(userData))
    setToken(newToken)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userData')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
