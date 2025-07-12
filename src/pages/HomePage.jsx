import React from 'react'
import { Box, Typography } from '@mui/material'
import { useAuth } from '../auth/AuthContext'
import welcomeImage from '../assets/welcome.png' // 👈 убедись, что файл есть

const HomePage = () => {
  const { user } = useAuth()

  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>
        {user?.full_name || 'Пользователь'}
      </Typography>

      <Typography variant="h5" sx={{ mt: 2, fontStyle: 'italic' }}>
        Глаза боятся, а лапки делают
      </Typography>

      <Box
        component="img"
        src={welcomeImage}
        alt="Welcome"
        sx={{
          mt: 4,
          maxWidth: 800,
          width: '100%',
          mx: 'auto',
        }}
      />
    </Box>
  )
}

export default HomePage
