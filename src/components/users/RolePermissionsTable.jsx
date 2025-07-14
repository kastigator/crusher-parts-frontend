import React, { useEffect, useState } from 'react'
import {
  Paper, Table, TableHead, TableBody, TableRow, TableCell,
  Checkbox, Typography, TableContainer, Button, Snackbar,
  Alert, Tooltip, TextField, IconButton
} from '@mui/material'
import axios from '../../api/axiosInstance'
import AddIcon from '@mui/icons-material/Add'

export default function RolePermissionsTable() {
  const [roles, setRoles] = useState([])
  const [tabs, setTabs] = useState([])
  const [permissions, setPermissions] = useState([])
  const [originalPermissions, setOriginalPermissions] = useState([])
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  const [newRoleName, setNewRoleName] = useState('')
  const [adding, setAdding] = useState(false)

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
      const visibleRoles = rolesRes.data.filter(r => r.slug !== 'admin')
      setRoles(visibleRoles)
      setTabs(tabsRes.data)
      setPermissions(permsRes.data)
      setOriginalPermissions(permsRes.data)
    } catch (err) {
      console.error('Ошибка при загрузке данных:', err)
    }
  }

  const hasPermission = (roleId, tabId) =>
    permissions.some(p => p.role_id === roleId && p.tab_id === tabId && p.can_view)

  const togglePermission = (roleId, tabId) => {
    const updated = [...permissions]
    const index = updated.findIndex(p => p.role_id === roleId && p.tab_id === tabId)

    if (index !== -1) {
      updated[index] = {
        ...updated[index],
        can_view: updated[index].can_view ? 0 : 1
      }
    } else {
      updated.push({ role_id: roleId, tab_id: tabId, can_view: 1 })
    }

    setPermissions(updated)
  }

  const getChangedPermissions = () => {
    const mapOriginal = new Map(
      originalPermissions.map(p => [`${p.role_id}_${p.tab_id}`, p.can_view])
    )
    const mapNew = new Map(
      permissions.map(p => [`${p.role_id}_${p.tab_id}`, p.can_view])
    )

    const changes = []
    for (const [key, can_view] of mapNew.entries()) {
      const original = mapOriginal.get(key)
      if (original !== can_view) {
        const [role_id, tab_id] = key.split('_').map(Number)
        changes.push({ role_id, tab_id, can_view })
      }
    }
    return changes
  }

  const handleSave = async () => {
    const changes = getChangedPermissions()
    if (changes.length === 0) return

    try {
      await axios.put('/role-permissions', changes)
      setOriginalPermissions([...permissions]) // ✅ локально обновляем оригинальные значения
      setSnackbar({ open: true, message: 'Права сохранены', severity: 'success' })
    } catch (err) {
      console.error('Ошибка при сохранении прав:', err)
      setSnackbar({ open: true, message: 'Ошибка при сохранении прав', severity: 'error' })
    }
  }

  const handleAddRole = async () => {
    const name = newRoleName.trim()
    if (!name) return

    try {
      const res = await axios.post('/roles', { name })
      setRoles([...roles, res.data])
      setNewRoleName('')
      setAdding(false)
      setSnackbar({ open: true, message: 'Роль добавлена', severity: 'success' })
    } catch (err) {
      console.error('Ошибка при добавлении роли:', err)
      setSnackbar({ open: true, message: err.response?.data?.message || 'Ошибка сервера', severity: 'error' })
    }
  }

  return (
    <Paper elevation={3} sx={{ p: 2, mt: 4, maxWidth: '100%', overflowX: 'clip' }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        Доступ к вкладкам по ролям
      </Typography>

      <TableContainer sx={{ maxHeight: 500, overflowX: 'auto' }}>
        <Table stickyHeader size="small" sx={{ tableLayout: 'fixed', minWidth: 600 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: '#fafafa', fontWeight: 600, width: 240 }}>Вкладка</TableCell>
              {roles.map((role) => (
                <TableCell key={role.id} align="center" sx={{ bgcolor: '#fafafa', fontWeight: 600 }}>
                  <Tooltip title={role.name}>
                    <span>{role.name}</span>
                  </Tooltip>
                </TableCell>
              ))}
              <TableCell align="center" sx={{ bgcolor: '#fafafa', width: 60 }}>
                {adding ? (
                  <TextField
                    size="small"
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddRole()
                      if (e.key === 'Escape') {
                        setAdding(false)
                        setNewRoleName('')
                      }
                    }}
                    autoFocus
                    placeholder="Новая роль"
                  />
                ) : (
                  <Tooltip title="Добавить роль">
                    <IconButton onClick={() => setAdding(true)} size="small">
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tabs.map((tab) => (
              <TableRow key={tab.id} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f9f9f9' } }}>
                <TableCell>{tab.name}</TableCell>
                {roles.map((role) => (
                  <TableCell key={role.id} align="center">
                    <Checkbox
                      checked={hasPermission(role.id, tab.id)}
                      onChange={() => togglePermission(role.id, tab.id)}
                    />
                  </TableCell>
                ))}
                <TableCell />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Button
        variant="contained"
        color="primary"
        sx={{ mt: 2 }}
        onClick={handleSave}
        disabled={getChangedPermissions().length === 0}
      >
        Сохранить
      </Button>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  )
}
