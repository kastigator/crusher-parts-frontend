import React, { useState } from 'react'
import {
  Paper, Table, TableHead, TableBody, TableRow, TableCell,
  IconButton, TextField, Tooltip, Typography, Autocomplete, Box
} from '@mui/material'
import {
  EditRounded as EditIcon,
  DeleteRounded as DeleteIcon,
  SaveRounded as SaveIcon,
  CancelRounded as CancelIcon,
  AddRounded as AddIcon,
  VpnKeyRounded as VpnKeyIcon
} from '@mui/icons-material'
import toast from 'react-hot-toast'
import PhoneField, { formatPhone } from '../common/PhoneField'
import EmailField from '../common/EmailField'
import { confirmAction } from '../../utils/confirmAction'

export default function UsersTable({ users, roles, newUser, setNewUser, onAdd, onSave, onDelete, onResetPassword }) {
  const [editingId, setEditingId] = useState(null)
  const [editedUsers, setEditedUsers] = useState({})

  const handleChange = (id, field, value) => {
    setEditedUsers(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }))
  }

  const startEdit = (user) => {
    setEditingId(user.id)
    setEditedUsers({ [user.id]: { ...user } })
  }

  const saveEdit = async (id) => {
    if (!editedUsers[id]) return
    await onSave(editedUsers[id])
    toast.success('Пользователь сохранён')
    setEditingId(null)
    setEditedUsers({})
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditedUsers({})
  }

  return (
    <Paper elevation={3} sx={{ p: 2, mt: 4, maxWidth: '100%', overflowX: 'clip' }}>
      <Typography variant="h6" sx={{ fontWeight: 600 }}>Пользователи</Typography>

      <Table
        size="small"
        sx={{
          width: '100%',
          minWidth: 960,
          tableLayout: 'auto',
          '& td, & th': { px: 1.25, py: 0.75 }
        }}
      >
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f3f6fa' }}>
            <TableCell>Логин</TableCell>
            <TableCell>Пароль</TableCell>
            <TableCell sx={{ minWidth: 160 }}>ФИО</TableCell>
            <TableCell sx={{ minWidth: 180 }}>Email</TableCell>
            <TableCell sx={{ minWidth: 140 }}>Телефон</TableCell>
            <TableCell>Должность</TableCell>
            <TableCell>Роль</TableCell>
            <TableCell sx={{ width: 140, minWidth: 140, whiteSpace: 'nowrap' }}>Действия</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {/* Строка добавления нового пользователя */}
          <TableRow sx={{ backgroundColor: '#eef4ff' }}>
            {['username', 'password', 'full_name', 'email', 'phone', 'position'].map((field) => (
              <TableCell key={field}>
                {field === 'phone' ? (
                  <PhoneField value={newUser[field]} onChange={(val) => setNewUser({ ...newUser, [field]: val })} />
                ) : field === 'email' ? (
                  <EmailField value={newUser[field]} onChange={(val) => setNewUser({ ...newUser, [field]: val })} />
                ) : (
                  <TextField
                    fullWidth
                    size="small"
                    placeholder={field}
                    value={newUser[field] || ''}
                    onChange={(e) => setNewUser({ ...newUser, [field]: e.target.value })}
                  />
                )}
              </TableCell>
            ))}
            <TableCell>
              <Autocomplete
                options={roles}
                getOptionLabel={(r) => r.name}
                value={roles.find(r => r.id === newUser.role_id) || null}
                onChange={(_, newRole) => setNewUser({ ...newUser, role_id: newRole?.id })}
                renderInput={(params) => <TextField {...params} size="small" placeholder="Роль" />}
                disableClearable
                fullWidth
              />
            </TableCell>
            <TableCell>
              <Tooltip title="Добавить">
                <IconButton onClick={onAdd}><AddIcon /></IconButton>
              </Tooltip>
            </TableCell>
          </TableRow>

          {/* Список пользователей */}
          {users.map(user => {
            const isEditing = editingId === user.id
            const current = isEditing ? editedUsers[user.id] : user

            return (
              <TableRow key={user.id}>
                {['username', 'password', 'full_name'].map(field => (
                  <TableCell key={field}>
                    {isEditing ? (
                      <TextField
                        size="small"
                        placeholder={field}
                        fullWidth
                        value={current[field] || ''}
                        onChange={(e) => handleChange(user.id, field, e.target.value)}
                      />
                    ) : (
                      field === 'password' ? '••••' : user[field]
                    )}
                  </TableCell>
                ))}
                <TableCell>
                  {isEditing ? (
                    <EmailField
                      value={current.email}
                      onChange={(val) => handleChange(user.id, 'email', val)}
                    />
                  ) : (
                    <a href={`mailto:${user.email}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                      {user.email}
                    </a>
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <PhoneField
                      value={current.phone}
                      onChange={(val) => handleChange(user.id, 'phone', val)}
                    />
                  ) : (
                    <a href={`tel:${user.phone}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                      {formatPhone(user.phone)}
                    </a>
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Должность"
                      value={current.position || ''}
                      onChange={(e) => handleChange(user.id, 'position', e.target.value)}
                    />
                  ) : user.position}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Autocomplete
                      options={roles}
                      getOptionLabel={(r) => r.name}
                      value={roles.find(r => r.id === current.role_id) || null}
                      onChange={(_, newRole) => handleChange(user.id, 'role_id', newRole?.id)}
                      renderInput={(params) => <TextField {...params} size="small" placeholder="Роль" />}
                      disableClearable
                      fullWidth
                    />
                  ) : (
                    roles.find(r => r.id === user.role_id)?.name || user.role_id
                  )}
                </TableCell>
                <TableCell sx={{ width: 140, minWidth: 140, whiteSpace: 'nowrap' }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {isEditing ? (
                      <>
                        <Tooltip title="Сохранить">
                          <IconButton onClick={() => saveEdit(user.id)}><SaveIcon /></IconButton>
                        </Tooltip>
                        <Tooltip title="Отмена">
                          <IconButton onClick={cancelEdit}><CancelIcon /></IconButton>
                        </Tooltip>
                      </>
                    ) : (
                      <>
                        <Tooltip title="Редактировать">
                          <IconButton onClick={() => startEdit(user)}><EditIcon /></IconButton>
                        </Tooltip>
                        <Tooltip title="Удалить">
                          <IconButton onClick={async () => {
                            const confirmed = await confirmAction({
                              title: 'Удалить пользователя?',
                              text: `Пользователь ${user.username} будет удалён`
                            })
                            if (confirmed) onDelete(user)
                          }}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Сбросить пароль">
                          <IconButton onClick={() => onResetPassword(user)}><VpnKeyIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Paper>
  )
}
