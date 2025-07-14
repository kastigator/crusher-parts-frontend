// src/components/common/ActionIcons.jsx
import React from 'react'
import { IconButton, Tooltip } from '@mui/material'
import {
  Save as SaveIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Cancel as CancelIcon
} from '@mui/icons-material'

export default function ActionIcons({
  isEditing = false,
  onEdit,
  onSave,
  onCancel,
  onDelete
}) {
  return (
    <>
      {isEditing ? (
        <>
          {onSave && (
            <Tooltip title="Сохранить">
              <IconButton size="small" onClick={onSave} color="success">
                <SaveIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onCancel && (
            <Tooltip title="Отменить">
              <IconButton size="small" onClick={onCancel} color="error">
                <CancelIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </>
      ) : (
        <>
          {onEdit && (
            <Tooltip title="Редактировать">
              <IconButton size="small" onClick={onEdit}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip title="Удалить">
              <IconButton size="small" onClick={onDelete}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </>
      )}
    </>
  )
}
