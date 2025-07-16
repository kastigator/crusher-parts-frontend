// src/components/common/EditableRow.jsx

import React from 'react'
import {
  TableRow, TableCell, IconButton, Tooltip, Box
} from '@mui/material'
import SaveIcon from '@mui/icons-material/SaveRounded'
import CancelIcon from '@mui/icons-material/CancelRounded'
import DeleteIcon from '@mui/icons-material/DeleteRounded'
import EditIcon from '@mui/icons-material/EditRounded'
import AddIcon from '@mui/icons-material/AddRounded'
import VpnKeyIcon from '@mui/icons-material/VpnKeyRounded'
import EditableCell from './EditableCell'
import { confirmAction } from '@/utils/confirmAction'

export default function EditableRow({
  row,
  isEditing,
  isNewRow,
  onChange,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  onAdd,
  onResetPassword,
  columns
}) {
  const handleKeyDown = (e) => {
    if (isEditing || isNewRow) {
      if (e.key === 'Enter') {
        isNewRow ? onAdd?.() : onSave?.()
      }
      if (e.key === 'Escape') {
        onCancel?.()
      }
    }
  }

  const handleConfirmDelete = async () => {
  const confirmed = await confirmAction({
    title: 'Удаление записи',
    text: `Вы действительно хотите удалить "${row?.username || row?.name || 'эту запись'}"?`,
    confirmButtonText: 'Удалить',
    cancelButtonText: 'Отмена'
  })

  if (confirmed) {
    onDelete?.(row)
  }
}


  return (
    <TableRow
      onDoubleClick={() => !isEditing && !isNewRow && onEdit?.(row)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {columns.map(col => (
        <TableCell
          key={col.field}
          sx={col.width ? { width: col.width, maxWidth: col.width } : {}}
        >
          {isEditing || isNewRow ? (
            <EditableCell
              column={col}
              value={row[col.field]}
              onChange={(val) => onChange(col.field, val)}
              isEditing
            />
          ) : (
            col.display
              ? col.display(row[col.field], row)
              : (row[col.field] ?? '')
          )}
        </TableCell>
      ))}

      <TableCell sx={{ width: 140, minWidth: 140, whiteSpace: 'nowrap' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isEditing ? (
            <>
              <Tooltip title="Сохранить">
                <IconButton onClick={onSave}><SaveIcon /></IconButton>
              </Tooltip>
              <Tooltip title="Отмена">
                <IconButton onClick={onCancel}><CancelIcon /></IconButton>
              </Tooltip>
            </>
          ) : isNewRow ? (
            <Tooltip title="Добавить">
              <IconButton onClick={onAdd} color="primary">
                <AddIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <>
              <Tooltip title="Редактировать">
                <IconButton onClick={() => onEdit(row)}><EditIcon /></IconButton>
              </Tooltip>
              <Tooltip title="Удалить">
                <IconButton onClick={handleConfirmDelete}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
              {onResetPassword && (
                <Tooltip title="Сбросить пароль">
                  <IconButton onClick={() => onResetPassword(row)}>
                    <VpnKeyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </>
          )}
        </Box>
      </TableCell>
    </TableRow>
  )
}
