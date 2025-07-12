import React, { useState } from 'react'
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Paper,
  Fade
} from '@mui/material'
import axios from '../api/axiosInstance'
import { useAuth } from '../auth/AuthContext'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logo.svg'
import PhoneField from '../components/common/PhoneField'
import EmailField from '../components/common/EmailField'

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
      login(res.data.token, res.data.userData)
      navigate('/')
    } catch (err) {
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
    <Box sx={{ backgroundColor: '#f5f5f5', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Container maxWidth="xs">
        <Fade in timeout={700}>
          <Paper elevation={4} sx={{ p: 4, borderRadius: 3 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <img src={logo} alt="Логотип" style={{ maxWidth: 200, marginBottom: 20 }} />
              <Typography variant="h6">Вход в систему</Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Логин"
                margin="normal"
                variant="outlined"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
              <TextField
                fullWidth
                label="Пароль"
                type="password"
                margin="normal"
                variant="outlined"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
              <Button
                fullWidth
                type="submit"
                variant="contained"
                color="primary"
                sx={{ mt: 2 }}
                disabled={loading}
              >
                {loading ? 'Вход...' : 'Войти'}
              </Button>
            </Box>

            <Typography
              variant="body2"
              align="center"
              sx={{ mt: 2, cursor: 'pointer', textDecoration: 'underline' }}
              onClick={handleForgotPassword}
            >
              Забыли пароль?
            </Typography>

            {showAdmins && (
              <Box sx={{ mt: 3 }}>
                <Alert severity="info">
                  Обратитесь к администратору:
                  <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
                    {admins.map((user, index) => (
                      <li key={index} style={{ marginBottom: '0.5rem' }}>
                        <strong>{user.full_name || user.username}</strong><br />
                        <PhoneField value={user.phone} readOnly emptyText="нет телефона" /><br />
                        <EmailField value={user.email} readOnly emptyText="нет email" />
                      </li>
                    ))}
                  </ul>
                </Alert>
              </Box>
            )}
          </Paper>
        </Fade>
      </Container>
    </Box>
  )
}

export default LoginPage
