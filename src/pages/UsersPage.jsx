// src/pages/UsersPage.jsx

import React from 'react'
import TabRendererPage from '@/components/common/TabRendererPage'
import UsersTable from '@/components/users/UsersTable'
import TabsTable from '@/components/users/TabsTable'
import RolePermissionsMatrix from '@/components/users/RolePermissionsMatrix'
import { Box, Typography, Stack } from '@mui/material'

export default function UsersPage() {
  return (
    <TabRendererPage tabKey="users">
      <Stack spacing={4} sx={{ width: '100%' }}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Управление пользователями
          </Typography>
          <UsersTable />
        </Box>

        <Box>
                  <TabsTable />
        </Box>

        <Box>
          <RolePermissionsMatrix />
        </Box>
      </Stack>
    </TabRendererPage>
  )
}
