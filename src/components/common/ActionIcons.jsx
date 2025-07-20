// src/components/common/ActionIcons.jsx
import React from 'react'
import { IconButton, Tooltip } from '@mui/material'
import {
  Save as SaveIcon,
  Add as AddIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  LockReset as LockResetIcon
} from '@mui/icons-material'

export default function ActionIcons({
  row,
  isEditing = false,
  isNewRow = false,
  onEdit,
  onSave,
  onCancel,
  onAdd,
  onDelete,
  onShowLogs,
  onResetPassword
}) {
  if (isEditing) {
    return (
      <>
        {onSave && (
          <Tooltip title="Сохранить">
            <IconButton onClick={onSave} size="small" color="success">
              <SaveIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {onCancel && (
          <Tooltip title="Отменить">
            <IconButton onClick={onCancel} size="small" color="error">
              <CancelIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </>
    )
  }

  if (isNewRow) {
    return (
      <>
        {onAdd && (
          <Tooltip title="Добавить">
            <IconButton onClick={onAdd} size="small" color="primary">
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {onCancel && (
          <Tooltip title="Отменить">
            <IconButton onClick={onCancel} size="small" color="error">
              <CancelIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </>
    )
  }

  return (
    <>
      {onEdit && (
        <Tooltip title="Редактировать">
          <IconButton onClick={() => onEdit?.(row)} size="small">
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {onResetPassword && (
        <Tooltip title="Сбросить пароль">
          <IconButton onClick={() => onResetPassword(row)} size="small">
            <LockResetIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {onShowLogs && (
        <Tooltip title="История изменений">
          <IconButton onClick={() => onShowLogs(row)} size="small">
            <HistoryIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {onDelete && (
        <Tooltip title="Удалить">
          <IconButton onClick={onDelete} size="small">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </>
  )
}
