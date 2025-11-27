import React from "react"
import { useNavigate } from "react-router-dom"
import { Button, Typography } from "antd"
import { useAuth } from "../auth/AuthContext"

const Header = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

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
      <Typography.Text strong style={{ fontSize: 14 }}>
        {user?.full_name || "Пользователь"}
      </Typography.Text>

      <Button type="text" onClick={handleLogout}>
        Выйти
      </Button>
    </div>
  )
}

export default Header
