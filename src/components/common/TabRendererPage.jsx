import React from 'react'
import { useTabs } from '@/context/TabsContext'
import PageWrapper from './PageWrapper'
import { CircularProgress, Box, Typography } from '@mui/material'

export default function TabRendererPage({ tabKey, title, children }) {
  const { tabs, permissions, loading } = useTabs()

  // Пока контекст загружается — спиннер
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  // Ищем вкладку по tab_name (tabKey)
  const tab = tabs.find(t => t.tab_name === tabKey)

  if (!tab) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h6" color="error">
          ❗ Вкладка "{tabKey}" не найдена в системе
        </Typography>
      </Box>
    )
  }

  if (!permissions.includes(tab.id)) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h6" color="text.secondary">
          🚫 У вас нет доступа к вкладке "{tab.name}"
        </Typography>
      </Box>
    )
  }

  return (
    <PageWrapper title={title || tab.name}>
      {children}
    </PageWrapper>
  )
}
