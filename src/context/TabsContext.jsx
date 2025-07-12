// src/context/TabsContext.jsx

import React, { createContext, useContext, useEffect, useState } from 'react'
import axios from '../api/axiosInstance'
import { useAuth } from '../auth/AuthContext'

const TabsContext = createContext()

export const TabsProvider = ({ children }) => {
  const { user } = useAuth()
  const [tabs, setTabs] = useState([])
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)

  const reloadTabs = () => {
    setLoading(true)
    axios.get('/tabs')
      .then(res => setTabs(res.data))
      .catch(err => console.error('Ошибка загрузки вкладок:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reloadTabs()
  }, [])

  useEffect(() => {
    if (!user?.role_id) return

    if (user.role?.toLowerCase() === 'admin') {
      // Админ видит всё
      if (tabs.length > 0) {
        setPermissions(tabs.map(t => t.id))
      }
    } else {
      // Остальные — по полученным правам
      setPermissions(user.permissions || [])
    }
  }, [user?.role_id, tabs])

  return (
    <TabsContext.Provider value={{ tabs, permissions, reloadTabs, loading }}>
      {children}
    </TabsContext.Provider>
  )
}

export const useTabs = () => useContext(TabsContext)
