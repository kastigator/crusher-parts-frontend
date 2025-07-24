// src/components/common/EditableRow.jsx

import React from "react"
import { TableRow } from "@mui/material"
import EditableCell from "./EditableCell"

export default function EditableRow({
  row,
  columns,
  isEditing,
  isNewRow,
  onChange,
  onSave,
  onDelete,
  onCancel,
  onEdit,
  onAdd,
  onResetPassword,
  onShowLogs
}) {
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      if (isNewRow) {
        // Просто очищаем, а не удаляем строку
        const cleared = {}
        columns.forEach((col) => {
          if (col.field && col.field !== "actions") {
            cleared[col.field] = ""
          }
        })
        onChange?.(null, cleared)
      } else {
        onCancel?.()
      }
    }

    if (e.key === "Enter") {
      if (isNewRow) {
        onAdd?.()
      } else {
        onSave?.(row)
      }
    }
  }

  return (
    <TableRow
      hover
      tabIndex={0}
      onDoubleClick={() => !isEditing && onEdit?.(row)}
      onKeyDown={handleKeyDown}
    >
      {columns.map((column) => (
        <EditableCell
          key={column.field}
          column={column}
          value={row[column.field]}
          row={row}
          isEditing={isEditing}
          isNewRow={isNewRow}
          onChange={(value) => onChange?.(column.field, value)}
          onSave={() => onSave?.(row)}
          onCancel={onCancel}
          onDelete={onDelete ? () => onDelete(row) : undefined}
          onResetPassword={onResetPassword ? () => onResetPassword(row) : undefined}
          onShowLogs={onShowLogs ? () => onShowLogs(row) : undefined}
        />
      ))}
    </TableRow>
  )
}
