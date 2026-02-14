import React, { useCallback, useEffect, useMemo, useState } from "react"
import axios from "@/api/axiosInstance"
import { useAuth } from "@/auth/AuthContext"
import { TabsContext } from "./TabsContext"

export default function TabsProvider({ children }) {
  const [tabs, setTabs] = useState([])
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(false)

  const { token, user } = useAuth()

  const isAdmin = !!(
    user &&
    (String(user.role || "").toLowerCase() === "admin" ||
      Number(user.role_id) === 1 ||
      user.is_admin === true)
  )

  const fetchTabs = useCallback(async () => {
    if (!token) {
      setTabs([])
      setPermissions([])
      return
    }
    setLoading(true)
    try {
      const { data } = await axios.get("/tabs")
      const sorted = (data || []).slice().sort((a, b) => {
        const aOrder = Number(a?.sort_order ?? 0)
        const bOrder = Number(b?.sort_order ?? 0)
        return aOrder - bOrder
      })
      setTabs(sorted)
      if (isAdmin) {
        setPermissions(sorted.map((t) => t.id))
      } else {
        const permsFromUser = Array.isArray(user?.permissions) ? user.permissions : []
        setPermissions(permsFromUser)
      }
    } catch (err) {
      console.error("❌ TabsContext: ошибка загрузки вкладок:", err)
      setTabs([])
      setPermissions([])
    } finally {
      setLoading(false)
    }
  }, [token, user?.permissions, isAdmin])

  useEffect(() => {
    if (token && user?.id) {
      fetchTabs()
    } else {
      setTabs([])
      setPermissions([])
    }
  }, [token, user?.id, fetchTabs])

  useEffect(() => {
    if (token && user?.id) {
      const t = setTimeout(() => fetchTabs(), 0)
      return () => clearTimeout(t)
    }
  }, [token, user?.id, fetchTabs])

  const value = useMemo(
    () => ({
      tabs,
      permissions,
      loading,
      reloadTabs: fetchTabs,
      setTabs,
    }),
    [tabs, permissions, loading, fetchTabs]
  )

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>
}
