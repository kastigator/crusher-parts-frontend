// src/components/common/ActionIcons.jsx

import React from "react"
import { IconButton, Tooltip } from "@mui/material"
import EditIcon from "@mui/icons-material/Edit"
import DeleteIcon from "@mui/icons-material/Delete"
import HistoryIcon from "@mui/icons-material/History"
import SaveIcon from "@mui/icons-material/Save"
import CloseIcon from "@mui/icons-material/Close"

export default function ActionIcons({
  row,
  isEditing,
  isNewRow,
  onSave,
  onCancel,
  onEdit,
  onDelete,
  onShowLogs,
  iconSize = "small"
}) {
  const editing = isEditing || isNewRow

  return (
    <>
      {editing ? (
        <>
          {onSave && (
            <Tooltip title="Сохранить">
              <IconButton onClick={() => onSave(row)} size={iconSize}>
                <SaveIcon />
              </IconButton>
            </Tooltip>
          )}

          {onCancel && (
            <Tooltip title="Отменить">
              <IconButton onClick={() => onCancel(row)} size={iconSize}>
                <CloseIcon />
              </IconButton>
            </Tooltip>
          )}
        </>
      ) : (
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

          {onShowLogs && (
            <Tooltip title="История изменений">
              <IconButton onClick={() => onShowLogs(row)} size={iconSize}>
                <HistoryIcon />
              </IconButton>
            </Tooltip>
          )}
        </>
      )}
    </>
  )
}
