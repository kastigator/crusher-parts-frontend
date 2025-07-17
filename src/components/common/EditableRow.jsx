import React from 'react'
import {
  TableRow, TableCell, IconButton, Tooltip, Box
} from '@mui/material'
import SaveIcon from '@mui/icons-material/SaveRounded'
import CancelIcon from '@mui/icons-material/CancelRounded'
import DeleteIcon from '@mui/icons-material/DeleteRounded'
import AddIcon from '@mui/icons-material/AddRounded'
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
  columns
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (isNewRow) onAdd?.()
      if (isEditing) onSave?.()
    }
    if (e.key === 'Escape') {
      onCancel?.()
    }
  }

  const handleConfirmDelete = async () => {
    const confirmed = await confirmAction({
      title: 'Удаление записи',
      text: `Вы действительно хотите удалить "${row?.username || row?.name || 'эту запись'}"?`,
      confirmButtonText: 'Удалить',
      cancelButtonText: 'Отмена'
    })
    if (confirmed) onDelete?.(row)
  }

  return (
    <TableRow
      onDoubleClick={() => !isEditing && !isNewRow && onEdit?.(row)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      sx={isEditing || isNewRow ? { backgroundColor: '#fffde7' } : {}}
    >
      {columns.map(col => (
        <TableCell
          key={col.field}
          sx={{
            width: col.width || 'auto',
            minWidth: col.minWidth || col.width || 100,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          <EditableCell
            column={col}
            value={row?.[col.field]}
            onChange={(field, value) => onChange?.(field, value)}
            isEditing={isEditing || isNewRow}
          />
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
              <Tooltip title="Удалить">
                <IconButton onClick={handleConfirmDelete}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      </TableCell>
    </TableRow>
  )
}
