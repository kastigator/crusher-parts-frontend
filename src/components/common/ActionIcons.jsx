// src/components/common/ActionIcons.jsx

import React from "react"
import { IconButton, Tooltip } from "@mui/material"
import EditIcon from "@mui/icons-material/Edit"
import DeleteIcon from "@mui/icons-material/Delete"
import HistoryIcon from "@mui/icons-material/History"

export default function ActionIcons({
  row,
  onEdit,
  onDelete,
  onShowLogs,
  iconSize = "small"
}) {
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

      {onShowLogs && (
        <Tooltip title="История изменений">
          <IconButton onClick={() => onShowLogs(row)} size={iconSize}>
            <HistoryIcon />
          </IconButton>
        </Tooltip>
      )}
    </>
  )
}
