import { useMemo } from "react"
import { useAuth } from "@/auth/AuthContext"

export default function useCapabilities() {
  const { user } = useAuth()

  return useMemo(() => {
    const role = String(user?.role || "").toLowerCase()
    const isAdmin = !!(user && (role === "admin" || Number(user?.role_id) === 1 || user?.is_admin === true))
    const allowed = new Set(
      (Array.isArray(user?.capabilities) ? user.capabilities : [])
        .map((item) => String(item || "").trim().toLowerCase())
        .filter(Boolean)
    )

    const can = (...keys) => {
      if (isAdmin) return true
      return keys
        .flat()
        .map((key) => String(key || "").trim().toLowerCase())
        .filter(Boolean)
        .some((key) => allowed.has(key))
    }

    return {
      isAdmin,
      capabilities: Array.from(allowed),
      can,
    }
  }, [user])
}
