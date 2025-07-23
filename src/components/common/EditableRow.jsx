import React from "react"
import { TableRow, TableCell } from "@mui/material"
import EditableCell from "./EditableCell"
import ActionIcons from "./ActionIcons"

export default function EditableRow({
  row,
  columns,
  onChange,
  onSave,
  onCancel,
  onDelete,
  onAdd,
  onResetPassword,
  onShowLogs,
  isNewRow,
  isEditing,
  onEdit,
  readonlyRow = false, // 👈 блокировка редактирования всей строки
  sx = {}              // 👈 кастомные стили строки (например, для подсветки)
}) {
  const handleCellChange = (field, value) => {
    if (!readonlyRow) {
      onChange?.(field, value)
    }
  }

  const handleKeyDown = (e) => {
    if (readonlyRow) return
    if (e.key === "Enter") {
      isNewRow ? onAdd?.() : onSave?.(row)
    }
    if (e.key === "Escape") {
      onCancel?.()
    }
  }

  return (
    <TableRow
      hover
      onKeyDown={handleKeyDown}
      sx={{
        backgroundColor: isNewRow ? "#fffde7" : undefined,
        ...sx
      }}
    >
      {columns
        .filter((col) => !col.hidden)
        .map((col) => (
          <TableCell key={col.field} align={col.align || "left"}>
            {col.field === "actions" ? (
              <ActionIcons
                row={row}
                isEditing={isEditing}
                isNewRow={isNewRow}
                onSave={onSave}
                onDelete={onDelete}
                onAdd={onAdd}
                onCancel={onCancel}
                onResetPassword={onResetPassword}
                onShowLogs={onShowLogs}
                onEdit={onEdit}
                disabled={readonlyRow}
              />
            ) : (
              <EditableCell
                column={col}
                value={row?.[col.field]}
                onChange={handleCellChange}
                isEditing={(isEditing || isNewRow) && !readonlyRow}
                row={row}
                disabled={readonlyRow || col.disabled}
              />
            )}
          </TableCell>
        ))}
    </TableRow>
  )
}
