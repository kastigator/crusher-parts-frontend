// src/components/common/EditableCell.jsx

import React from "react"
import { TableCell, TextField, IconButton } from "@mui/material"
import ValueDisplay from "./ValueDisplay"
import ActionIcons from "./ActionIcons"

export default function EditableCell({
  column,
  value,
  row,
  isEditing,
  isNewRow,
  onChange,
  onSave,
  onCancel,
  onDelete,
  onResetPassword,
  onShowLogs
}) {
  const type = column.type || "text"
  const editable = isNewRow || (column.editable && isEditing)

  const safeValue = value ?? ""

  if (editable) {
    if (["text", "password", "email", "number"].includes(type)) {
      return (
        <TableCell>
          <TextField
            type={type}
            value={safeValue}
            onChange={(e) => onChange(e.target.value)}
            size="small"
            fullWidth
            variant="standard"
          />
        </TableCell>
      )
    }

    return <TableCell>{safeValue}</TableCell>
  }

  if (column.field === "actions") {
    return (
      <TableCell>
        <ActionIcons
          row={row}
          isEditing={isEditing}
          isNewRow={isNewRow}
          onSave={onSave}
          onCancel={onCancel}
          onDelete={onDelete}
          onResetPassword={onResetPassword}
          onShowLogs={onShowLogs}
        />
      </TableCell>
    )
  }

  return (
    <TableCell>
      <ValueDisplay value={safeValue} type={type} />
    </TableCell>
  )
}
