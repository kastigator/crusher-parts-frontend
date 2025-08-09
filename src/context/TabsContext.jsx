// src/context/TabsContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react"
import axios from "@/api/axiosInstance"
import { useAuth } from "../auth/AuthContext"

export const TabsContext = createContext(null)

function TabsProvider({ children }) {
  const [tabs, setTabs] = useState([])
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(false)

  const { token, user } = useAuth()

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

      const role = user?.role?.toLowerCase?.() || ""
      const permsFromUser = Array.isArray(user?.permissions) ? user.permissions : []

      if (role === "admin") {
        setPermissions(sorted.map((t) => t.id))
      } else {
        setPermissions(permsFromUser)
      }
    } catch (err) {
      console.error("❌ Ошибка загрузки вкладок:", err)
      setTabs([])
      setPermissions([])
    } finally {
      setLoading(false)
    }
  }, [token, user?.role, user?.permissions])

  useEffect(() => {
    if (token && user?.id) fetchTabs()
    else {
      setTabs([])
      setPermissions([])
    }
  }, [token, user?.id, fetchTabs])

  const value = useMemo(
    () => ({
      tabs,
      permissions,
      loading,
      reloadTabs: fetchTabs,
      setTabs, // оставим, если где-то нужно вручную обновить
    }),
    [tabs, permissions, loading, fetchTabs]
  )

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>
}

export function useTabs() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error("useTabs must be used within <TabsProvider>")
  return ctx
}

export default TabsProvider
