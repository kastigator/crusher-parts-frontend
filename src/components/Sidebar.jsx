import React from 'react'
import { Box, List, ListItem, IconButton, Tooltip } from '@mui/material'
import * as MuiIcons from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTabs } from '../context/TabsContext'

const Sidebar = () => {
  const { tabs = [], permissions = [] } = useTabs()
  const navigate = useNavigate()
  const location = useLocation()

  const visibleTabs = tabs
    .filter(tab => tab.is_active && permissions.includes(tab.id))
    .sort((a, b) => a.order - b.order)

  return (
    <Box sx={{
      width: 60,
      bgcolor: '#f4f4f4',
      borderRight: '1px solid #ddd',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      py: 1
    }}>
      <List sx={{ width: '100%', p: 0 }}>
        {visibleTabs.map(tab => {
          const iconName = tab.icon?.trim()
          const IconComponent = MuiIcons[iconName] || MuiIcons.HelpOutline

          if (!MuiIcons[iconName]) {
            console.warn(`⚠️ Иконка "${iconName}" не найдена в @mui/icons-material`)
          }

          const path = tab.path.startsWith('/') ? tab.path : `/${tab.path}`
          const isActive = location.pathname.startsWith(path)

          return (
            <ListItem key={tab.id} disablePadding sx={{ justifyContent: 'center', mb: 1 }}>
              <Tooltip title={tab.name} placement="right">
                <IconButton
                  onClick={() => navigate(path)}
                  color={isActive ? 'primary' : 'default'}
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: isActive ? 'primary.light' : 'transparent',
                    '&:hover': { bgcolor: '#e0e0e0' },
                  }}
                >
                  <IconComponent fontSize="medium" />
                </IconButton>
              </Tooltip>
            </ListItem>
          )
        })}
      </List>
    </Box>
  )
}

export default Sidebar
