import React, { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  IconButton,
  Select,
  MenuItem,
  Typography,
  Box,
  Snackbar,
  Button
} from "@mui/material"
import { Delete, Save, LockReset, Close } from "@mui/icons-material"
import axios from "@/api/axiosInstance.js"
import TableWrapper from "@/components/common/TableWrapper.jsx"
import { confirmAction } from "@/utils/confirmAction.js"
import ValueDisplay from "@/components/common/ValueDisplay.jsx"

export default function UsersTable({ roles }) {
  const [users, setUsers] = useState([])
  const [newUser, setNewUser] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editedUser, setEditedUser] = useState({})
  const [snackbar, setSnackbar] = useState({ open: false, password: "" })

  const fetchUsers = async () => {
    const res = await axios.get("/users")
    setUsers(res.data || [])
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleAdd = async () => {
    if (!newUser?.username || !newUser?.password || !newUser?.role_slug) return
    await axios.post("/users", newUser)
    setNewUser(null)
    fetchUsers()
  }

  const handleDelete = async (id) => {
    const { confirmed } = await confirmAction("Удалить пользователя?")
    if (!confirmed) return
    await axios.delete(`/users/${id}`)
    fetchUsers()
  }

  const handleSave = async (user) => {
    const payload = {
      ...user,
      role_slug: roles.find(r => String(r.value) === String(user.role_id))?.slug
    }
    await axios.put(`/users/${user.id}`, payload)
    setEditingId(null)
    fetchUsers()
  }

  const handleResetPassword = async (user) => {
    const { confirmed, inputValue } = await confirmAction({
      title: `Сбросить пароль для ${user.username}?`,
      text: 'Вы можете ввести новый пароль вручную, или оставить поле пустым — тогда он будет сгенерирован автоматически.',
      confirmLabel: 'Сбросить',
      cancelLabel: 'Отмена',
      icon: 'warning',
      inputType: 'password',
      inputPlaceholder: 'Новый пароль (необязательно)',
      inputRequired: false
    })

    if (!confirmed) return

    try {
      const res = await axios.post(`/users/${user.id}/reset-password`, {
        newPassword: inputValue || undefined
      })
      const newPwd = res.data?.newPassword
      if (newPwd) {
        setSnackbar({ open: true, password: newPwd })
      } else {
        alert("Пароль сброшен, но новый не получен.")
      }
    } catch (err) {
      alert("Ошибка при сбросе пароля.")
    }
  }

  const handleKeyDown = (e, context) => {
    if (e.key === "Enter") {
      if (context === "new") handleAdd()
      if (context === "edit") handleSave(editedUser)
    }
    if (e.key === "Escape") {
      if (context === "new") setNewUser(null)
      if (context === "edit") setEditingId(null)
    }
  }

  const roleOptions = roles || []

  return (
    <TableWrapper title="Пользователи">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Логин</TableCell>
            <TableCell>Пароль</TableCell>
            <TableCell>Телефон</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Должность</TableCell>
            <TableCell>Роль</TableCell>
            <TableCell align="center">Действия</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map(user => {
            const isEditing = editingId === user.id
            return (
              <TableRow
                key={user.id}
                onDoubleClick={() => {
                  setEditingId(user.id)
                  setEditedUser(user)
                }}
                onKeyDown={e => handleKeyDown(e, "edit")}
                tabIndex={0}
              >
                <TableCell>
                  {isEditing ? (
                    <TextField
                      size="small"
                      value={editedUser.username || ""}
                      onChange={e => setEditedUser({ ...editedUser, username: e.target.value })}
                    />
                  ) : (
                    user.username
                  )}
                </TableCell>
                <TableCell>••••••</TableCell>
                <TableCell>
                  {isEditing ? (
                    <TextField
                      size="small"
                      value={editedUser.phone || ""}
                      onChange={e => setEditedUser({ ...editedUser, phone: e.target.value })}
                    />
                  ) : (
                    <ValueDisplay
                      value={user.phone}
                      type="link"
                      href={`tel:${user.phone}`}
                    />
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <TextField
                      size="small"
                      value={editedUser.email || ""}
                      onChange={e => setEditedUser({ ...editedUser, email: e.target.value })}
                    />
                  ) : (
                    <ValueDisplay
                      value={user.email}
                      type="link"
                      href={`mailto:${user.email}`}
                    />
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <TextField
                      size="small"
                      value={editedUser.position || ""}
                      onChange={e => setEditedUser({ ...editedUser, position: e.target.value })}
                    />
                  ) : (
                    user.position
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Select
                      size="small"
                      value={editedUser.role_id || ""}
                      onChange={e => setEditedUser({ ...editedUser, role_id: e.target.value })}
                      sx={{ minWidth: 140 }}
                    >
                      {roleOptions.map(r => (
                        <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                      ))}
                    </Select>
                  ) : (
                    user.role_name || <i style={{ color: "#999" }}>—</i>
                  )}
                </TableCell>
                <TableCell align="center">
                  {isEditing ? (
                    <>
                      <IconButton onClick={() => handleSave(editedUser)}><Save /></IconButton>
                      <IconButton onClick={() => setEditingId(null)}><Close /></IconButton>
                    </>
                  ) : (
                    <>
                      <IconButton onClick={() => handleResetPassword(user)}><LockReset /></IconButton>
                      <IconButton onClick={() => handleDelete(user.id)}><Delete /></IconButton>
                    </>
                  )}
                </TableCell>
              </TableRow>
            )
          })}

          {newUser && (
            <TableRow onKeyDown={e => handleKeyDown(e, "new")} tabIndex={0}>
              <TableCell>
                <TextField
                  size="small"
                  autoFocus
                  value={newUser.username || ""}
                  onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <TextField
                  size="small"
                  value={newUser.password || ""}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <TextField
                  size="small"
                  value={newUser.phone || ""}
                  onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <TextField
                  size="small"
                  value={newUser.email || ""}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <TextField
                  size="small"
                  value={newUser.position || ""}
                  onChange={e => setNewUser({ ...newUser, position: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <Select
                  size="small"
                  value={newUser.role_id || ""}
                  onChange={e => {
                    const selected = roleOptions.find(r => r.value === e.target.value)
                    setNewUser({
                      ...newUser,
                      role_id: selected.value,
                      role_slug: selected.slug
                    })
                  }}
                  sx={{ minWidth: 140 }}
                >
                  {roleOptions.map(r => (
                    <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                  ))}
                </Select>
              </TableCell>
              <TableCell align="center">{/* пусто */}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {!newUser && (
        <Box mt={2}>
          <Typography
            variant="body2"
            color="primary"
            sx={{ cursor: "pointer" }}
            onClick={() => setNewUser({
              username: "",
              password: "",
              email: "",
              phone: "",
              position: "",
              role_id: "",
              role_slug: ""
            })}
          >
            ➕ Добавить пользователя
          </Typography>
        </Box>
      )}

      {/* Snackbar для нового пароля */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={`Новый пароль: ${snackbar.password}`}
        action={
          <Button
            color="primary"
            size="small"
            onClick={() => {
              navigator.clipboard.writeText(snackbar.password)
              setSnackbar({ ...snackbar, open: false })
            }}
          >
            Скопировать
          </Button>
        }
      />
    </TableWrapper>
  )
}
