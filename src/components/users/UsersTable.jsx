// src/components/users/UsersTable.jsx

import React from "react"
import useTableData from "@/hooks/useTableData"
import BaseTable from "@/components/common/BaseTable"
import { usersTableColumns } from "@/components/common/tableDefinitions"
import useRoles from "@/hooks/useRoles"
import { confirmAction } from "@/utils/confirmAction"
import axios from "@/api/axiosInstance"

export default function UsersTable() {
  const { roles } = useRoles()

  const {
    data,
    newRow,
    setNewRow,
    onAdd,
    onSave,
    onDelete
  } = useTableData("/users", {}, usersTableColumns(roles), { pagination: false })

  const handleResetPassword = async (row) => {
    const confirmed = await confirmAction(`Сбросить пароль для ${row.username}?`)
    if (!confirmed) return

    try {
      const res = await axios.post(`/users/${row.id}/reset-password`)
      alert(`Новый пароль: ${res.data?.newPassword || "не получен"}`)
    } catch (err) {
      alert("Ошибка при сбросе пароля")
      console.error(err)
    }
  }

  const handleShowLogs = (row) => {
    alert(`Открытие истории пользователя "${row.username}" (ещё не реализовано)`)
  }

  return (
    <BaseTable
      title="Пользователи"
      columns={usersTableColumns(roles)}
      data={data}
      newRow={newRow}
      setNewRow={setNewRow}
      onAdd={onAdd}
      onSave={onSave}
      onDelete={onDelete}
      onResetPassword={handleResetPassword}
      onShowLogs={handleShowLogs}
      validateRow={(row) => !!row.username && !!row.role_id}
    />
  )
}
