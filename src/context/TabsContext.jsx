// src/context/TabsContext.jsx

import React, { createContext, useContext, useEffect, useState } from 'react'
import axios from '@/api/axiosInstance'
import { useAuth } from '../auth/AuthContext'

export const TabsContext = createContext()

export const TabsProvider = ({ children }) => {
  const [tabs, setTabs] = useState([])
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(false)

  const { token, user } = useAuth()

  const fetchTabs = async () => {
    if (!token) return
    setLoading(true)
    try {
      console.log('📡 fetchTabs: запрашиваем /tabs')
      const tabsRes = await axios.get('/tabs')
      setTabs(tabsRes.data)

      const role = user?.role?.toLowerCase?.() || ''
      const perms = user?.permissions || []

      if (role === 'admin') {
        setPermissions(tabsRes.data.map(t => t.id))
      } else {
        setPermissions(perms)
      }
    } catch (err) {
      console.error('❌ Ошибка загрузки вкладок:', err)
      setTabs([])
      setPermissions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token && user?.id) {
      fetchTabs()
    } else {
      setTabs([])
      setPermissions([])
    }
  }, [token, user?.id])

  return (
    <TabsContext.Provider value={{ tabs, permissions, loading, reloadTabs: fetchTabs }}>
      {children}
    </TabsContext.Provider>
  )
}

export const useTabs = () => useContext(TabsContext)
