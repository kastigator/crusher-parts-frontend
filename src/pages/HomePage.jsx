import React from 'react'
import { Typography } from 'antd'
import { useAuth } from '../auth/AuthContext'
import welcomeImage from '../assets/welcome.png' // Убедись, что файл существует

const HomePage = () => {
  const { user } = useAuth()

  return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <Typography.Title level={2}>
        {user?.full_name || 'Пользователь'}
      </Typography.Title>

      <Typography.Title level={4} style={{ marginTop: 16, fontStyle: 'italic' }}>
        Глаза боятся, а лапки делают
      </Typography.Title>

      <img
        src={welcomeImage}
        alt="Welcome"
        style={{
          marginTop: 32,
          maxWidth: 800,
          width: '100%',
        }}
      />
    </div>
  )
}

export default HomePage
