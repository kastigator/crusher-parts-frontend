import React, { useCallback, useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Badge, Button, Typography } from "antd"
import { useAuth } from "../auth/AuthContext"
import axios from "@/api/axiosInstance"

const Header = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const fetchUnread = useCallback(async () => {
    try {
      const { data } = await axios.get("/dashboard/notifications", {
        params: { unread_only: 1, limit: 1, type: "assignment" },
      })
      setUnreadCount(Number(data?.unread_count) || 0)
    } catch (e) {
      console.error("notifications unread error", e)
    }
  }, [])

  useEffect(() => {
    fetchUnread()
  }, [fetchUnread, location.pathname])

  useEffect(() => {
    const timer = setInterval(fetchUnread, 30000)
    const handleFocus = () => fetchUnread()
    window.addEventListener("focus", handleFocus)

    return () => {
      clearInterval(timer)
      window.removeEventListener("focus", handleFocus)
    }
  }, [fetchUnread])

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 24px",
        borderBottom: "1px solid #e5e7eb",
        backgroundColor: "#ffffff",
      }}
    >
      <Button
        type="text"
        onClick={() => navigate("/")}
        style={{ padding: 0, display: "flex", alignItems: "center", gap: 8 }}
      >
        <Badge count={unreadCount} size="small">
          <Typography.Text strong style={{ fontSize: 14 }}>
            {user?.full_name || "Пользователь"}
          </Typography.Text>
        </Badge>
      </Button>

      <Button type="text" onClick={handleLogout}>
        Выйти
      </Button>
    </div>
  )
}

export default Header
