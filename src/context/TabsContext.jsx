// src/context/TabsContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import axios from '@/api/axiosInstance'

export const TabsContext = createContext()

export const TabsProvider = ({ children }) => {
  const [tabs, setTabs] = useState([])
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTabs = async () => {
    try {
      const tabsRes = await axios.get('/tabs')
      setTabs(tabsRes.data)

      const storedUser = localStorage.getItem('userData')
      let role = ''
      let perms = []
      if (storedUser) {
        const parsed = JSON.parse(storedUser)
        role = parsed.role?.toLowerCase?.() || ''
        perms = parsed.permissions || []
      }

      if (role === 'admin') {
        setPermissions(tabsRes.data.map(t => t.id))
      } else {
        setPermissions(perms)
      }
    } catch (err) {
      console.error('❌ Ошибка загрузки вкладок:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTabs()
  }, [])

  return (
    <TabsContext.Provider value={{ tabs, permissions, loading, reloadTabs: fetchTabs }}>
      {children}
    </TabsContext.Provider>
  )
}

export const useTabs = () => useContext(TabsContext)
