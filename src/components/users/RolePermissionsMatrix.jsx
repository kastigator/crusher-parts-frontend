import React, { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Checkbox,
  IconButton,
  TextField,
  Box
} from "@mui/material"
import { Delete } from "@mui/icons-material"
import axios from "@/api/axiosInstance.js"
import TableWrapper from "@/components/common/TableWrapper.jsx"
import { confirmAction } from "@/utils/confirmAction.js"

export default function RolePermissionsMatrix({ reloadRoles, roles }) {
  const [tabs, setTabs] = useState([])
  const [permissions, setPermissions] = useState([])
  const [newRole, setNewRole] = useState("")

  const fetchAll = async () => {
    const [tabsRes, permsRes] = await Promise.all([
      axios.get("/tabs"),
      axios.get("/role-permissions/raw")
    ])
    setTabs(tabsRes.data)

    setPermissions(
      permsRes.data.map(p => ({
        role_id: p.role_id,
        tab_id: p.tab_id,
        can_view: p.can_view,
        tab_slug: tabsRes.data.find(t => t.id === p.tab_id)?.tab_name,
        role_slug: roles.find(r => r.id === p.role_id)?.slug
      }))
    )
  }

  useEffect(() => {
    fetchAll()
  }, [roles])

  const hasPermission = (roleSlug, tabSlug) =>
    permissions.some(p => p.role_slug === roleSlug && p.tab_slug === tabSlug)

  const handleToggle = async (roleSlug, tabSlug, checked) => {
    const updated = permissions.filter(
      p => !(p.role_slug === roleSlug && p.tab_slug === tabSlug)
    )

    if (checked) {
      updated.push({ role_slug: roleSlug, tab_slug: tabSlug })
    }

    setPermissions(updated)

    const rolePermissions = updated
      .filter(p => p.role_slug === roleSlug)
      .map(p => {
        const tab = tabs.find(t => t.tab_name === p.tab_slug)
        return {
          tab_id: tab?.id,
          can_view: 1
        }
      })

    try {
      await axios.put(`/role-permissions/by-role/${roleSlug}`, rolePermissions)
    } catch (err) {
      console.error("Ошибка при обновлении прав:", err)
    }
  }

  const handleAddRole = async () => {
    if (!newRole.trim()) return
    await axios.post("/roles", { name: newRole.trim() })
    setNewRole("")
    await fetchAll()
    await reloadRoles()
  }

  const handleDeleteRole = async (role) => {
    const usersRes = await axios.get("/users")
    const usersWithRole = usersRes.data.filter(u => u.role_id === role.id)

    if (usersWithRole.length > 0) {
      await confirmAction({
        title: "Удаление невозможно",
        text: "Нельзя удалить роль — она используется: " + usersWithRole.map(u => u.username).join(", "),
        icon: "warning",
        showCancelButton: false,
        confirmLabel: "OK"
      })
      return
    }

    const { confirmed } = await confirmAction(`Удалить роль "${role.name}"?`)
    if (!confirmed) return

    await axios.delete(`/roles/${role.id}`)
    await fetchAll()
    await reloadRoles()
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleAddRole()
    if (e.key === "Escape") setNewRole("")
  }

  return (
    <TableWrapper title="Права доступа к вкладкам">
      <Box display="flex" gap={2} mb={2}>
        <TextField
          label="Новая роль"
          size="small"
          value={newRole}
          onChange={e => setNewRole(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Роль</TableCell>
            {tabs.map(tab => (
              <TableCell key={tab.id} align="center">{tab.name}</TableCell>
            ))}
            <TableCell align="center">Удалить</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {roles.map(role => (
            <TableRow key={role.id}>
              <TableCell>{role.name}</TableCell>
              {tabs.map(tab => (
                <TableCell key={tab.id} align="center">
                  <Checkbox
                    checked={hasPermission(role.slug, tab.tab_name)}
                    onChange={e =>
                      handleToggle(role.slug, tab.tab_name, e.target.checked)
                    }
                  />
                </TableCell>
              ))}
              <TableCell align="center">
                <IconButton onClick={() => handleDeleteRole(role)}><Delete /></IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableWrapper>
  )
}
