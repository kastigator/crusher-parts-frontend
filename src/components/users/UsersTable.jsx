// src/components/users/UsersTable.jsx

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
  Box
} from "@mui/material"
import { Delete, Save, LockReset } from "@mui/icons-material"
import axios from "@/api/axiosInstance.js"
import TableWrapper from "@/components/common/TableWrapper.jsx"
import { confirmAction } from "@/utils/confirmAction.js"

export default function UsersTable({ roles }) {
  const [users, setUsers] = useState([])
  const [newUser, setNewUser] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editedUser, setEditedUser] = useState({})

  const fetchUsers = async () => {
    const res = await axios.get("/users")
    setUsers(res.data || [])
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleAdd = async () => {
    if (!newUser?.username || !newUser?.password || !newUser?.role_id) return
    await axios.post("/users", newUser)
    setNewUser(null)
    fetchUsers()
  }

  const handleDelete = async (id) => {
    const confirmed = await confirmAction("Удалить пользователя?")
    if (!confirmed) return
    await axios.delete(`/users/${id}`)
    fetchUsers()
  }

  const handleSave = async (user) => {
    await axios.put(`/users/${user.id}`, user)
    setEditingId(null)
    fetchUsers()
  }

  const handleResetPassword = async (user) => {
    const confirmed = await confirmAction(`Сбросить пароль для ${user.username}?`)
    if (!confirmed) return
    const res = await axios.post(`/users/${user.id}/reset-password`)
    alert(`Новый пароль: ${res.data?.newPassword || "не получен"}`)
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
            <TableCell>Роль</TableCell>
            <TableCell>Телефон</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Должность</TableCell>
            <TableCell align="center">Действия</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map(user => (
            <TableRow
              key={user.id}
              onDoubleClick={() => {
                setEditingId(user.id)
                setEditedUser(user)
              }}
            >
              <TableCell>
                {editingId === user.id ? (
                  <TextField
                    size="small"
                    value={editedUser.username || ""}
                    onChange={e => setEditedUser({ ...editedUser, username: e.target.value })}
                    onKeyDown={e => handleKeyDown(e, "edit")}
                  />
                ) : (
                  user.username
                )}
              </TableCell>
              <TableCell>••••••</TableCell>
              <TableCell>
                {editingId === user.id ? (
                  <Select
                    size="small"
                    value={editedUser.role_id || ""}
                    onChange={e => setEditedUser({ ...editedUser, role_id: e.target.value })}
                  >
                    {roleOptions.map(r => (
                      <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                    ))}
                  </Select>
                ) : (
                  roles.find(r => r.value === user.role_id)?.label || ""
                )}
              </TableCell>
              <TableCell>
                {editingId === user.id ? (
                  <TextField
                    size="small"
                    value={editedUser.phone || ""}
                    onChange={e => setEditedUser({ ...editedUser, phone: e.target.value })}
                  />
                ) : (
                  user.phone
                )}
              </TableCell>
              <TableCell>
                {editingId === user.id ? (
                  <TextField
                    size="small"
                    value={editedUser.email || ""}
                    onChange={e => setEditedUser({ ...editedUser, email: e.target.value })}
                  />
                ) : (
                  user.email
                )}
              </TableCell>
              <TableCell>
                {editingId === user.id ? (
                  <TextField
                    size="small"
                    value={editedUser.position || ""}
                    onChange={e => setEditedUser({ ...editedUser, position: e.target.value })}
                  />
                ) : (
                  user.position
                )}
              </TableCell>
              <TableCell align="center">
                {editingId === user.id ? (
                  <IconButton onClick={() => handleSave(editedUser)}><Save /></IconButton>
                ) : (
                  <>
                    <IconButton onClick={() => handleResetPassword(user)}><LockReset /></IconButton>
                    <IconButton onClick={() => handleDelete(user.id)}><Delete /></IconButton>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}

          {newUser && (
            <TableRow>
              <TableCell>
                <TextField
                  size="small"
                  autoFocus
                  value={newUser.username || ""}
                  onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                  onKeyDown={e => handleKeyDown(e, "new")}
                />
              </TableCell>
              <TableCell>
                <TextField
                  size="small"
                  value={newUser.password || ""}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  onKeyDown={e => handleKeyDown(e, "new")}
                />
              </TableCell>
              <TableCell>
                <Select
                  size="small"
                  value={newUser.role_id || ""}
                  onChange={e => setNewUser({ ...newUser, role_id: e.target.value })}
                >
                  {roleOptions.map(r => (
                    <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                  ))}
                </Select>
              </TableCell>
              <TableCell>
                <TextField
                  size="small"
                  value={newUser.phone || ""}
                  onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                  onKeyDown={e => handleKeyDown(e, "new")}
                />
              </TableCell>
              <TableCell>
                <TextField
                  size="small"
                  value={newUser.email || ""}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  onKeyDown={e => handleKeyDown(e, "new")}
                />
              </TableCell>
              <TableCell>
                <TextField
                  size="small"
                  value={newUser.position || ""}
                  onChange={e => setNewUser({ ...newUser, position: e.target.value })}
                  onKeyDown={e => handleKeyDown(e, "new")}
                />
              </TableCell>
              <TableCell align="center">{/* intentionally blank */}</TableCell>
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
            onClick={() => setNewUser({})}
          >
            ➕ Добавить пользователя
          </Typography>
        </Box>
      )}
    </TableWrapper>
  )
}
