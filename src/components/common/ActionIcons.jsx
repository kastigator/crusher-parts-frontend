import React from "react"
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Edit as EditIcon,
  RestartAlt as ResetPasswordIcon,
  History as LogsIcon
} from "@mui/icons-material"
import { IconButton, Tooltip } from "@mui/material"

export default function ActionIcons({
  row,
  isEditing,
  isNewRow,
  onSave,
  onCancel,
  onDelete,
  onAdd,
  onEdit,
  onResetPassword,
  onShowLogs,
  disabled = false // 👈 если true — ничего не делать
}) {
  const iconSize = "small"

  if (disabled) return null // 🔒 строка только для чтения

  if (isNewRow) {
    return (
      <>
        <Tooltip title="Добавить">
          <IconButton onClick={onAdd} size={iconSize}>
            <AddIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Отмена">
          <IconButton onClick={onCancel} size={iconSize}>
            <CancelIcon />
          </IconButton>
        </Tooltip>
      </>
    )
  }

  if (isEditing) {
    return (
      <>
        <Tooltip title="Сохранить">
          <IconButton onClick={() => onSave(row)} size={iconSize}>
            <SaveIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Отмена">
          <IconButton onClick={onCancel} size={iconSize}>
            <CancelIcon />
          </IconButton>
        </Tooltip>
      </>
    )
  }

  return (
    <>
      {onEdit && (
        <Tooltip title="Редактировать">
          <IconButton onClick={() => onEdit(row)} size={iconSize}>
            <EditIcon />
          </IconButton>
        </Tooltip>
      )}

      {onDelete && (
        <Tooltip title="Удалить">
          <IconButton onClick={() => onDelete(row)} size={iconSize}>
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      )}

      {onResetPassword && (
        <Tooltip title="Сбросить пароль">
          <IconButton onClick={() => onResetPassword(row)} size={iconSize}>
            <ResetPasswordIcon />
          </IconButton>
        </Tooltip>
      )}

      {onShowLogs && (
        <Tooltip title="История изменений">
          <IconButton onClick={() => onShowLogs(row)} size={iconSize}>
            <LogsIcon />
          </IconButton>
        </Tooltip>
      )}
    </>
  )
}
