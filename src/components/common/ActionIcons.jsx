import React from "react"
import {
  IconButton,
  Tooltip
} from "@mui/material"
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  LockReset as ResetPasswordIcon
} from "@mui/icons-material"

export default function ActionIcons({
  row,
  isEditing,
  isNewRow,
  onEdit,
  onSave,
  onCancel,
  onAdd,
  onDelete,
  onShowLogs,
  onResetPassword
}) {
  return (
    <>
      {isEditing ? (
        <>
          <Tooltip title="Сохранить">
            <IconButton onClick={() => (isNewRow ? onAdd() : onSave())} size="small">
              <SaveIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Отменить">
            <IconButton onClick={onCancel} size="small">
              <CancelIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      ) : (
        <>
          {onEdit && (
            <Tooltip title="Редактировать">
              <IconButton onClick={onEdit} size="small">
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip title="Удалить">
              <IconButton onClick={() => onDelete(row.id)} size="small">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onShowLogs && (
            <Tooltip title="История изменений">
              <IconButton onClick={() => onShowLogs(row)} size="small">
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onResetPassword && (
            <Tooltip title="Сбросить пароль">
              <IconButton onClick={() => onResetPassword(row)} size="small">
                <ResetPasswordIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </>
      )}
    </>
  )
}
