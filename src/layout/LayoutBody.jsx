// src/components/common/LayoutBody.jsx

import React from 'react'
import { Outlet } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import Sidebar from '@/components/Sidebar'
import Header from './Header'
import { useTabs } from '@/context/TabsContext'

const LayoutBody = () => {
  const { loading } = useTabs()

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      <Sidebar />

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          width: '100vw',      // 👈 расширяем до ширины окна
          overflowX: 'auto'    // 👈 scroll появляется здесь
        }}
      >
        <Header />
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            minHeight: 0
          }}
        >
          {loading ? (
            <CircularProgress sx={{ mt: 4, mx: 'auto', display: 'block' }} />
          ) : (
            <Outlet />
          )}
        </Box>
      </Box>
    </Box>
  )
}

export default LayoutBody
