import React, { useEffect, useState } from 'react'
import axios from '@/api/axiosInstance'
import BaseTable from '@/components/common/BaseTable'
import { usersTableColumns } from '@/components/common/tableDefinitions'

const emptyUser = {
  username: '', password: '', full_name: '',
  email: '', phone: '', position: '', role_id: null
}

export default function UsersTable() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [newUser, setNewUser] = useState(emptyUser)

  useEffect(() => {
    loadUsersAndRoles()
  }, [])

  const loadUsersAndRoles = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        axios.get('/users'),
        axios.get('/roles')
      ])
      setUsers(usersRes.data)
      setRoles(rolesRes.data)
    } catch (err) {
      console.error('Ошибка загрузки данных:', err)
    }
  }

  const handleAdd = async () => {
    if (!newUser.username || !newUser.password) return
    try {
      await axios.post('/users', newUser)
      setNewUser(emptyUser)
      loadUsersAndRoles()
    } catch (err) {
      console.error('Ошибка при добавлении:', err)
    }
  }

  const handleSave = async (user) => {
    try {
      await axios.put(`/users/${user.id}`, user)
      loadUsersAndRoles()
    } catch (err) {
      console.error('Ошибка при сохранении:', err)
    }
  }

  const handleDelete = async (user) => {
    try {
      await axios.delete(`/users/${user.id}`)
      loadUsersAndRoles()
    } catch (err) {
      console.error('Ошибка при удалении:', err)
    }
  }

  const roleMap = Object.fromEntries(roles.map(r => [r.id, r.name]))

  const columns = usersTableColumns.map(col => {
    if (col.field === 'role_id') {
      return {
        ...col,
        editorProps: {
          ...col.editorProps,
          options: roles
        },
        valueGetter: (row) => roleMap[row.role_id] || '—'
      }
    }
    return col
  })

  return (
    <BaseTable
      data={users}
      columns={columns}
      newRow={newUser}
      setNewRow={setNewUser}
      onAdd={handleAdd}
      onSave={handleSave}
      onDelete={handleDelete}
    />
  )
}
