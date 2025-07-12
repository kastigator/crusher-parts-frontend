import React, { Suspense, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Box, Typography, CircularProgress } from '@mui/material'
import { useTabs } from '../context/TabsContext'
import EditableTable from '../components/common/EditableTable'

const componentMap = {
  UsersPage: React.lazy(() => import('./UsersPage.jsx')),
  TnvedCodesPage: React.lazy(() => import('./TnvedCodesPage.jsx')),
}

const TabRendererPage = () => {
  const location = useLocation()
  const { tabs } = useTabs()
  const [tab, setTab] = useState(null)

  useEffect(() => {
    const currentPath = location.pathname.replace(/^\//, '')
    const found = tabs.find((t) => t.path === currentPath)
    setTab(found || null)
  }, [location.pathname, tabs])

  if (!tab) {
    return (
      <Box p={4}>
        <Typography variant="h5">Вкладка не найдена</Typography>
        <Typography color="text.secondary">{location.pathname}</Typography>
      </Box>
    )
  }

  if (tab.type === 'table') {
    return <EditableTable type={tab.config} />
  }

  if (tab.type === 'component') {
    const LazyComponent = componentMap[tab.config]
    if (!LazyComponent) {
      return <Box p={4}><Typography>Компонент не найден: {tab.config}</Typography></Box>
    }
    return (
      <Suspense fallback={<Box p={4}><CircularProgress /></Box>}>
        <LazyComponent />
      </Suspense>
    )
  }

  return (
    <Box p={4}>
      <Typography variant="h5">Тип вкладки не поддерживается: {tab.type}</Typography>
    </Box>
  )
}

export default TabRendererPage
