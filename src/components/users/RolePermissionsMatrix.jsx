import React, { useEffect, useState } from 'react'
import axios from '@/api/axiosInstance'
import {
  Box,
  Checkbox,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  TextField,
  IconButton,
  Tooltip
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import Swal from 'sweetalert2'
import { slugify } from 'transliteration'

export default function RolePermissionsMatrix() {
  const [roles, setRoles] = useState([])
  const [tabs, setTabs] = useState([])
  const [permissions, setPermissions] = useState([])
  const [newRoleName, setNewRoleName] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [rolesRes, tabsRes, permsRes] = await Promise.all([
        axios.get('/roles'),
        axios.get('/tabs'),
        axios.get('/role-permissions')
      ])

      const filteredRoles = rolesRes.data.filter(r => r.slug !== 'admin')
      setRoles(filteredRoles)
      setTabs(tabsRes.data)
      setPermissions(permsRes.data)
    } catch (err) {
      console.error('Ошибка загрузки данных:', err)
    }
  }

  const isChecked = (roleId, tabId) => {
    return Boolean(
      permissions.find(p => p.role_id === roleId && p.tab_id === tabId && p.can_view)
    )
  }

  const togglePermission = async (roleId, tabId) => {
    const existing = permissions.find(p => p.role_id === roleId && p.tab_id === tabId)

    try {
      if (existing) {
        const updated = { ...existing, can_view: existing.can_view ? 0 : 1 }
        await axios.put(`/role-permissions/${existing.id}`, updated)
      } else {
        await axios.post('/role-permissions', {
          role_id: roleId,
          tab_id: tabId,
          can_view: 1
        })
      }
      await loadData()
    } catch (err) {
      console.error('Ошибка при обновлении прав:', err)
      Swal.fire('Ошибка', 'Не удалось обновить права', 'error')
    }
  }

  const handleAddRole = async () => {
    const name = newRoleName.trim()
    if (!name) return

    const slug = slugify(name)

    try {
      await axios.post('/roles', { name, slug })
      setNewRoleName('')
      await loadData()
    } catch (err) {
      console.error('Ошибка при добавлении роли:', err)
      Swal.fire('Ошибка', 'Не удалось добавить роль', 'error')
    }
  }

  const handleDeleteRole = async (role) => {
    try {
      const usersRes = await axios.get(`/users?role_id=${role.id}`)
      const usersWithRole = usersRes.data || []

      if (usersWithRole.length > 0) {
        const list = usersWithRole.map(u => `• ${u.full_name || u.username}`).join('\n')

        await Swal.fire({
          title: `Роль «${role.name}» используется у ${usersWithRole.length} пользователя(ей)`,
          html: `<pre style="text-align: left; font-size: 14px;">${list}</pre><p>Переназначьте этим пользователям другую роль перед удалением.</p>`,
          icon: 'warning',
          confirmButtonText: 'Понятно'
        })
        return
      }

      const confirm = await Swal.fire({
        title: `Удалить роль «${role.name}»?`,
        text: 'Эту операцию нельзя отменить',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Удалить',
        cancelButtonText: 'Отмена'
      })

      if (!confirm.isConfirmed) return

      await axios.delete(`/roles/${role.id}`)
      await loadData()
    } catch (err) {
      console.error('Ошибка удаления роли:', err)
      Swal.fire('Ошибка', 'Не удалось удалить роль', 'error')
    }
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Права доступа к вкладкам
      </Typography>

      <Paper sx={{ overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 240 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="Новая роль"
                    fullWidth
                    variant="standard"
                  />
                  <Tooltip title="Добавить роль">
                    <span>
                      <IconButton
                        onClick={handleAddRole}
                        color="primary"
                        disabled={!newRoleName.trim()}
                      >
                        <AddIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </TableCell>

              {tabs.map(tab => (
                <TableCell key={tab.id} align="center">
                  {tab.name}
                </TableCell>
              ))}
              <TableCell sx={{ width: 50 }} />
            </TableRow>
          </TableHead>

          <TableBody>
            {roles.map(role => (
              <TableRow
                key={role.id}
                hover
                sx={{ '&:hover': { backgroundColor: '#f9f9f9' } }}
              >
                <TableCell>{role.name}</TableCell>
                {tabs.map(tab => (
                  <TableCell key={tab.id} align="center" sx={{ width: 60 }}>
                    <Checkbox
                      checked={isChecked(role.id, tab.id)}
                      onChange={() => togglePermission(role.id, tab.id)}
                      inputProps={{ 'aria-label': `Доступ ${role.name} к ${tab.name}` }}
                    />
                  </TableCell>
                ))}
                <TableCell align="center">
                  <Tooltip title="Удалить роль">
                    <IconButton onClick={() => handleDeleteRole(role)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}
