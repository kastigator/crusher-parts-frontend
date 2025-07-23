// src/components/users/RolePermissionsMatrix.jsx

import React, { useEffect, useState } from "react"
import {
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow
} from "@mui/material"
import useRoles from "@/hooks/useRoles"
import axios from "@/api/axiosInstance"
import { confirmAction } from "@/utils/confirmAction"
import BaseTable from "@/components/common/BaseTable"
import { rolesTableColumns } from "@/components/common/tableDefinitions"

export default function RolePermissionsMatrix({ onRolesUpdated }) {
  const { roles = [], reloadRoles } = useRoles()
  const [newRow, setNewRow] = useState(null)
  const [tabs, setTabs] = useState([])
  const [permissions, setPermissions] = useState([])

  // 🔒 Пропускаем роль "admin"
  const filteredRoles = roles.filter(r => r.slug !== "admin")

  useEffect(() => {
    axios.get("/tabs").then(res => setTabs(res.data || []))
  }, [])

  useEffect(() => {
    if (roles.length === 0) return
    axios.get("/role-permissions").then(res => setPermissions(res.data || []))
  }, [roles])

  const hasPermission = (roleSlug, tabSlug) =>
    permissions.some(p => p.role_slug === roleSlug && p.tab_slug === tabSlug)

  const handleToggle = async (roleSlug, tabSlug, checked) => {
    try {
      const updated = permissions.filter(
        p => !(p.role_slug === roleSlug && p.tab_slug === tabSlug)
      )

      if (checked) {
        updated.push({ role_slug: roleSlug, tab_slug: tabSlug })
      }

      setPermissions(updated)
      await axios.put(
        `/role-permissions/${roleSlug}`,
        updated.filter(p => p.role_slug === roleSlug)
      )
    } catch (err) {
      alert("Не удалось сохранить изменения прав доступа")
      console.error("Ошибка сохранения прав:", err)
    }
  }

  const handleDeleteRole = async (role) => {
    try {
      const usersRes = await axios.get("/users")
      const usersWithRole = usersRes.data.filter(u => u.role_id === role.id)

      if (usersWithRole.length > 0) {
        const names = usersWithRole.map(u => u.username).join(", ")
        alert(`Нельзя удалить роль: она используется пользователями: ${names}`)
        return
      }

      const confirmed = await confirmAction(`Удалить роль "${role.name}"?`)
      if (!confirmed) return

      await axios.delete(`/roles/${role.id}`)
      await reloadRoles()
      onRolesUpdated?.()
    } catch (err) {
      console.error("Ошибка при удалении роли", err)
    }
  }

  const handleAddRole = async (row) => {
    if (!row.name) return
    await axios.post("/roles", { name: row.name })
    await reloadRoles()
    onRolesUpdated?.()
  }

  return (
    <>
      <BaseTable
        title="Роли"
        columns={rolesTableColumns}
        data={filteredRoles}
        newRow={newRow}
        setNewRow={setNewRow}
        onAdd={handleAddRole}
        onDelete={handleDeleteRole}
        validateRow={(row) => !!row.name}
      />

      {tabs.length > 0 && (
        <Table size="small" sx={{ mt: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>Роль / Вкладка</TableCell>
              {tabs.map(tab => (
                <TableCell key={tab.id} align="center">
                  {tab.name}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRoles.map(role => (
              <TableRow key={role.id}>
                <TableCell>{role.name}</TableCell>
                {tabs.map(tab => (
                  <TableCell key={tab.id} align="center">
                    <Checkbox
                      checked={hasPermission(role.slug, tab.slug)}
                      onChange={e =>
                        handleToggle(role.slug, tab.slug, e.target.checked)
                      }
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  )
}
