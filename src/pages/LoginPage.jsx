import React, { useState } from 'react'
import { Typography, Input, Button, Alert, Card } from 'antd'
import axios from '../api/axiosInstance'
import { useAuth } from '../auth/AuthContext'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logo.svg'
import ValueDisplay from '@/components/common/ValueDisplay'

const LoginPage = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showAdmins, setShowAdmins] = useState(false)
  const [admins, setAdmins] = useState([])

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await axios.post('/auth/login', { username, password })

      const { token, refreshToken, userData, user } = res.data
      const payload = userData || user

      if (!token || !payload) {
        console.error('❌ Нет token или user в ответе /auth/login:', res.data)
        setError('Ошибка авторизации: некорректный ответ сервера')
        return
      }

      // сохраняем токен и пользователя в AuthContext
      login(token, payload, refreshToken)

      navigate('/')
    } catch (err) {
      console.error('❌ Ошибка при логине:', err)
      setError('Неверный логин или пароль')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    try {
      const res = await axios.get('/public/admins')
      setAdmins(res.data)
      setShowAdmins(true)
    } catch (e) {
      console.error('Ошибка при загрузке админов:', e)
    }
  }

  return (
    <div
      style={{
        backgroundColor: '#f5f5f5',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <Card
        style={{
          width: 360,
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 4px 16px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src={logo} alt="Логотип" style={{ maxWidth: 160, marginBottom: 12 }} />
          <Typography.Title level={5}>Вход в систему</Typography.Title>
        </div>

        <form onSubmit={handleSubmit}>
          <Input
            placeholder="Логин"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            style={{ marginBottom: 16 }}
          />
          <Input.Password
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            style={{ marginBottom: 16 }}
          />

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
          >
            Войти
          </Button>
        </form>

        <Typography.Text
          style={{
            display: 'block',
            textAlign: 'center',
            marginTop: 16,
            cursor: 'pointer',
            textDecoration: 'underline',
            color: '#1890ff'
          }}
          onClick={handleForgotPassword}
        >
          Забыли пароль?
        </Typography.Text>

        {showAdmins && (
          <div style={{ marginTop: 24 }}>
            <Alert
              type="info"
              message={
                <div>
                  <div>Обратитесь к администратору:</div>
                  <ul style={{ marginTop: 8, paddingLeft: 16 }}>
                    {admins.map((user, index) => (
                      <li key={index} style={{ marginBottom: 12 }}>
                        <strong>{user.full_name || user.username}</strong><br />
                        <ValueDisplay value={user.phone} type="text" /><br />
                        <ValueDisplay value={user.email} type="email" />
                      </li>
                    ))}
                  </ul>
                </div>
              }
            />
          </div>
        )}
      </Card>
    </div>
  )
}

export default LoginPage
