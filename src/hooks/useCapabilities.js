import { useMemo } from "react"
import { useAuth } from "@/auth/AuthContext"

export default function useCapabilities() {
  const { user } = useAuth()

  return useMemo(() => {
    const isSuperAdmin = user?.is_super_admin === true
    const allowed = new Set(
      (Array.isArray(user?.capabilities) ? user.capabilities : [])
        .map((item) => String(item || "").trim().toLowerCase())
        .filter(Boolean)
    )

    const can = (...keys) => {
      if (isSuperAdmin) return true
      return keys
        .flat()
        .map((key) => String(key || "").trim().toLowerCase())
        .filter(Boolean)
        .some((key) => allowed.has(key))
    }

    return {
      isAdmin: isSuperAdmin,
      isSuperAdmin,
      capabilities: Array.from(allowed),
      can,
    }
  }, [user])
}
