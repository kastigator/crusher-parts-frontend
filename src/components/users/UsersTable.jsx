// src/components/users/UsersTable.jsx

import React from "react"
import BaseTable from "@/components/common/BaseTable"
import { usersTableColumns } from "@/components/common/tableDefinitions"
import useTableData from "@/hooks/useTableData"
import useRoles from "@/hooks/useRoles"

export default function UsersTable() {
  const {
    data,
    setData,
    newRow,
    setNewRow,
    onAdd,
    onSave,
    onDelete
  } = useTableData("/users")

  const roleOptions = useRoles()

  // Вставляем роли как options в колонку role_id
  const columnsWithRoles = usersTableColumns.map(col =>
    col.field === "role_id"
      ? {
          ...col,
          editorProps: {
            ...(col.editorProps || {}),
            options: roleOptions
          }
        }
      : col
  )

  return (
    <BaseTable
      
      data={data}
      setData={setData}
      newRow={newRow}
      setNewRow={setNewRow}
      onAdd={onAdd}
      onSave={onSave}
      onDelete={onDelete}
      columns={columnsWithRoles}
      minWidth={1000}
    />
  )
}
