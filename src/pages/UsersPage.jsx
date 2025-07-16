// src/pages/UsersPage.jsx

import React from 'react'
import TabRendererPage from '@/components/common/TabRendererPage'
import UsersTable from '@/components/users/UsersTable'
import TabsTable from '@/components/users/TabsTable'
import { Stack, Typography, Box } from '@mui/material'

export default function UsersPage() {
  return (
    <TabRendererPage tabKey="users">
      <Stack spacing={4} sx={{ width: '100%' }}>
        <Box sx={{ width: '100%' }}>
          <Typography variant="h6" gutterBottom>
            Пользователи
          </Typography>
          <UsersTable />
        </Box>

        <Box sx={{ width: '100%' }}>
          <Typography variant="h6" gutterBottom>
            Вкладки
          </Typography>
          <TabsTable />
        </Box>
      </Stack>
    </TabRendererPage>
  )
}
