import React from 'react'
import TabRendererPage from '@/components/common/TabRendererPage'
import UsersTable from '@/components/users/UsersTable'
import { Typography, Box, Stack } from '@mui/material'

export default function UsersPage() {
  return (
    <TabRendererPage tabKey="users">
      <Stack spacing={4} sx={{ minWidth: 1200 }}>
        <Box>
          <Typography variant="h6" gutterBottom>Пользователи</Typography>
          <UsersTable />
        </Box>
      </Stack>
    </TabRendererPage>
  )
}
