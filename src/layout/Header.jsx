import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button } from '@mui/material'
import { useAuth } from '../auth/AuthContext'

const Header = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        p: 2,
        borderBottom: '1px solid #eee',
      }}
    >
      <Box sx={{ fontWeight: 'bold' }}>
        {user?.full_name || 'Пользователь'}
      </Box>
      <Button variant="outlined" onClick={handleLogout}>
        Выйти
      </Button>
    </Box>
  )
}

export default Header
