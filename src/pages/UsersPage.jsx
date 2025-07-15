import React, { useEffect, useState } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import axios from '@/api/axiosInstance'
import UsersTable from '@/components/users/UsersTable'
import RolePermissionsTable from '@/components/users/RolePermissionsTable'
import TabsTable from '@/components/users/TabsTable'
import TabRendererPage from '@/components/common/TabRendererPage' // 👈 добавлено

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [newUser, setNewUser] = useState({
    username: '', password: '', full_name: '',
    email: '', phone: '', position: '', role_id: null
  })

  const loadData = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        axios.get('/users'),
        axios.get('/roles')
      ])
      setUsers(usersRes.data)
      setRoles(rolesRes.data)
    } catch (err) {
      console.error('Ошибка загрузки пользователей или ролей:', err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleAdd = async () => {
    if (!newUser.username || !newUser.password) return
    try {
      await axios.post('/users', newUser)
      setNewUser({
        username: '', password: '', full_name: '',
        email: '', phone: '', position: '', role_id: null
      })
      loadData()
    } catch (err) {
      console.error('Ошибка при добавлении пользователя:', err)
    }
  }

  const handleSave = async (updatedUser) => {
    try {
      await axios.put(`/users/${updatedUser.id}`, updatedUser)
      loadData()
    } catch (err) {
      console.error('Ошибка при сохранении пользователя:', err)
    }
  }

  const handleDelete = async (user) => {
    try {
      await axios.delete(`/users/${user.id}`)
      loadData()
    } catch (err) {
      console.error('Ошибка при удалении пользователя:', err)
    }
  }

  const handleResetPassword = async (user) => {
    try {
      await axios.post(`/users/${user.id}/reset-password`)
      console.log(`Пароль пользователя ${user.username} сброшен`)
    } catch (err) {
      console.error('Ошибка при сбросе пароля:', err)
    }
  }

  return (
    <TabRendererPage tabKey="users">
      <Stack spacing={4} sx={{ minWidth: 1200 }}>
        <Box>
          <Typography variant="h6" gutterBottom>Пользователи</Typography>
          <UsersTable
            users={users}
            roles={roles}
            newUser={newUser}
            setNewUser={setNewUser}
            onAdd={handleAdd}
            onSave={handleSave}
            onDelete={handleDelete}
            onResetPassword={handleResetPassword}
          />
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>Роли и доступы</Typography>
          <RolePermissionsTable />
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>Вкладки</Typography>
          <TabsTable />
        </Box>
      </Stack>
    </TabRendererPage>
  )
}
