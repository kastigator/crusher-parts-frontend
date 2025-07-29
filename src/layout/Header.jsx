import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Typography } from 'antd'
import { useAuth } from '../auth/AuthContext'

const Header = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        borderBottom: '1px solid #eee',
        backgroundColor: '#fff',
      }}
    >
      <Typography.Text strong>
        {user?.full_name || 'Пользователь'}
      </Typography.Text>

      <Button type="default" onClick={handleLogout}>
        Выйти
      </Button>
    </div>
  )
}

export default Header
