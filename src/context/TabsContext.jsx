// src/context/TabsContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react"
import axios from "@/api/axiosInstance"
import { useAuth } from "../auth/AuthContext"

export const TabsContext = createContext(null)

function TabsProvider({ children }) {
  const [tabs, setTabs] = useState([])
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(false)

  const { token, user } = useAuth()

  const isAdmin = !!(
    user &&
    (
      String(user.role || "").toLowerCase() === "admin" ||
      Number(user.role_id) === 1 ||
      user.is_admin === true
    )
  )

  const fetchTabs = useCallback(async () => {
    if (!token) {
      setTabs([])
      setPermissions([])
      return
    }
    setLoading(true)
    try {
      // лог для отладки
      console.log("TabsContext: fetchTabs → token present, user =", {
        id: user?.id, role: user?.role, role_id: user?.role_id, is_admin: user?.is_admin
      })

      const { data } = await axios.get("/tabs") // ← бэкенд уже возвращает с учётом ролей
      const sorted = (data || []).slice().sort((a, b) => {
        const aOrder = Number(a?.sort_order ?? 0)
        const bOrder = Number(b?.sort_order ?? 0)
        return aOrder - bOrder
      })

      setTabs(sorted)

      if (isAdmin) {
        setPermissions(sorted.map(t => t.id))
      } else {
        const permsFromUser = Array.isArray(user?.permissions) ? user.permissions : []
        setPermissions(permsFromUser)
      }

      console.log("TabsContext: fetched tabs =", sorted.length, "isAdmin =", isAdmin)
    } catch (err) {
      console.error("❌ TabsContext: ошибка загрузки вкладок:", err)
      setTabs([])
      setPermissions([])
    } finally {
      setLoading(false)
    }
  }, [token, user?.id, user?.role, user?.role_id, user?.is_admin, isAdmin])

  // 1) Стандартная реакция на смену токена/профиля
  useEffect(() => {
    if (token && user?.id) {
      fetchTabs()
    } else {
      setTabs([])
      setPermissions([])
    }
  }, [token, user?.id, user?.role, user?.role_id, user?.is_admin, fetchTabs])

  // 2) Форс-перезагрузка сразу после логина (на случай гонки и HMR)
  useEffect(() => {
    if (token && user?.id) {
      const t = setTimeout(() => fetchTabs(), 0)
      return () => clearTimeout(t)
    }
  }, [token, user?.id, fetchTabs])

  const value = useMemo(() => ({
    tabs,
    permissions,
    loading,
    reloadTabs: fetchTabs,
    setTabs,
  }), [tabs, permissions, loading, fetchTabs])

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>
}

export function useTabs() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error("useTabs must be used within <TabsProvider>")
  return ctx
}

export default TabsProvider
