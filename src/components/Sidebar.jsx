import React from 'react'
import { Box, List, ListItem, IconButton, Tooltip } from '@mui/material'
import * as MuiIcons from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTabs } from '@/context/TabsContext'

const Sidebar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { tabs = [], permissions = [], loading } = useTabs()

  if (loading) return null

  const visibleTabs = tabs
    .filter(tab => permissions.includes(tab.id))
    .sort((a, b) => a.order - b.order) // ✅ всегда сортируем явно

  return (
    <Box
      sx={{
        width: 64,
        height: '100%',
        backgroundColor: '#f5f5f5',
        borderRight: '1px solid #ddd',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pt: 1
      }}
    >
      <List sx={{ width: '100%' }}>
        {visibleTabs.map(tab => {
          const IconComponent = MuiIcons[tab.icon] || MuiIcons.List
          const selected = location.pathname === tab.path || location.pathname === `/${tab.path}`

          return (
            <ListItem
              key={tab.id}
              disablePadding
              sx={{
                justifyContent: 'center',
                backgroundColor: selected ? '#e0e0e0' : 'transparent'
              }}
            >
              <Tooltip title={tab.name || 'Вкладка'} placement="right">
                <IconButton
                  onClick={() => navigate(tab.path.startsWith('/') ? tab.path : `/${tab.path}`)}
                  color={selected ? 'primary' : 'default'}
                >
                  <IconComponent />
                </IconButton>
              </Tooltip>
            </ListItem>
          )
        })}

        {visibleTabs.length === 0 && (
          <ListItem>
            <Tooltip title="Нет доступных вкладок" placement="right">
              <Box sx={{ fontSize: 10, color: '#999', textAlign: 'center', px: 1 }}>
                Нет вкладок
              </Box>
            </Tooltip>
          </ListItem>
        )}
      </List>
    </Box>
  )
}

export default Sidebar
