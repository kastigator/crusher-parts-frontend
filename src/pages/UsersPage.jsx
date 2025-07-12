import React, { useEffect, useState } from 'react'
import UsersTable from '../components/users/UsersTable'
import RolePermissionsTable from '../components/users/RolePermissionsTable'
import TabsTable from '../components/users/TabsTable'
import axios from '../api/axiosInstance'
import { Snackbar, Alert, LinearProgress, Box } from '@mui/material'
import PageWrapper from '../components/common/PageWrapper'

const UsersPage = () => {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [newUser, setNewUser] = useState(getEmptyUser())
  const [loading, setLoading] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' })

  function getEmptyUser() {
    return {
      username: '',
      password: '',
      full_name: '',
      email: '',
      phone: '',
      position: '',
      role_id: null,
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [usersRes, rolesRes] = await Promise.all([
        axios.get('/users'),
        axios.get('/roles'),
      ])
      setUsers(usersRes.data)
      setRoles(rolesRes.data)
    } catch {
      showSnackbar('Ошибка при загрузке пользователей или ролей', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity })
  }

  const handleAdd = async () => {
    try {
      await axios.post('/users', newUser)
      showSnackbar('Пользователь добавлен', 'success')
      setNewUser(getEmptyUser())
      loadData()
    } catch {
      showSnackbar('Ошибка при добавлении пользователя', 'error')
    }
  }

  const handleSave = async (user) => {
    try {
      await axios.put(`/users/${user.id}`, user)
      showSnackbar('Пользователь обновлён', 'success')
      loadData()
    } catch {
      showSnackbar('Ошибка при обновлении пользователя', 'error')
    }
  }

  const handleDelete = async (user) => {
    try {
      await axios.delete(`/users/${user.id}`)
      showSnackbar('Пользователь удалён', 'success')
      loadData()
    } catch {
      showSnackbar('Ошибка при удалении пользователя', 'error')
    }
  }

  const handleResetPassword = async (user) => {
    try {
      const res = await axios.post(`/users/${user.id}/reset-password`)
      showSnackbar(`Новый пароль: ${res.data.newPassword}`, 'info')
    } catch {
      showSnackbar('Ошибка при сбросе пароля', 'error')
    }
  }

  return (
    <PageWrapper>
      {loading && <LinearProgress />}

      <Box sx={{ display: 'inline-block', minWidth: 1200 }}>
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

        <RolePermissionsTable sx={{ mt: 5 }} />
        <TabsTable sx={{ mt: 5 }} />
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PageWrapper>
  )
}

export default UsersPage
