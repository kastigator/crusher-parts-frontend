import React from 'react'
import {
  TableRow,
  TableCell,
  IconButton,
  Tooltip,
  Box
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import CancelIcon from '@mui/icons-material/Cancel'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import HistoryIcon from '@mui/icons-material/History'
import EditableCell from './EditableCell'
import { confirmAction } from '@/utils/confirmAction'

export default function EditableRow({
  row,
  columns,
  isEditing,
  isNewRow,
  onChange,
  onSave,
  onCancel,
  onAdd,
  onDelete,
  onShowLogs
}) {
  const handleConfirmDelete = async () => {
    const confirmed = await confirmAction('Удалить эту запись?')
    if (confirmed) onDelete?.(row)
  }

  return (
    <TableRow
      hover
      sx={{
        backgroundColor: isEditing || isNewRow ? '#fffde7' : 'inherit'
      }}
    >
      {columns.map((col) => (
        <TableCell
          key={col.field}
          style={{
            minWidth: col.minWidth || 100,
            maxWidth: col.maxWidth,
            width: col.width,
            whiteSpace: 'nowrap'
          }}
        >
          {col.renderCell ? (
            col.renderCell(row, onDelete, onShowLogs)
          ) : (
            <EditableCell
              column={col}
              value={row[col.field]}
              onChange={onChange}
              isEditing={isEditing || isNewRow}
            />
          )}
        </TableCell>
      ))}

      {!columns.some(c => c.field === 'actions') && (
        <TableCell
          sx={{
            width: 140,
            minWidth: 140,
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
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
              {onShowLogs && (
                <Tooltip title="История изменений">
                  <IconButton onClick={() => onShowLogs(row)}>
                    <HistoryIcon />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Удалить">
                <IconButton onClick={handleConfirmDelete}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
        </TableCell>
      )}
    </TableRow>
  )
}
