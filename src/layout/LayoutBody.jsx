import React from 'react'
import { Outlet } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import Sidebar from '../components/Sidebar'
import Header from './Header'
import { useTabs } from '../context/TabsContext'

const LayoutBody = () => {
  const { loading } = useTabs()

  if (loading) {
    return <Box p={4}><CircularProgress /></Box>
  }

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      <Sidebar />

      {/* 👇 scroll здесь! */}
      <Box
        sx={{
          flex: 1,
          display: 'block',
          overflowX: 'auto',
          overflowY: 'auto',
          px: 0
        }}
      >
        <Header />

        {/* PageWrapper + Контент */}
        <Outlet />
      </Box>
    </Box>
  )
}

export default LayoutBody
