// src/components/common/EditableRow.jsx

import React from 'react'
import { TableRow, TableCell } from '@mui/material'
import EditableCell from './EditableCell'
import ActionIcons from './ActionIcons'
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
  onShowLogs,
  onEdit,
  onResetPassword
}) {
  if (!row || typeof row !== 'object') return null

  const handleConfirmDelete = async () => {
    const confirmed = await confirmAction('Удалить эту запись?')
    if (confirmed) onDelete?.(row)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      isNewRow ? onAdd?.() : onSave?.()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel?.()
    }
  }

  const hasCustomActions = columns.some(c => c.field === 'actions')

  return (
    <TableRow
      hover
      onDoubleClick={() => {
        if (!isEditing && !isNewRow && onEdit) {
          onEdit(row)
        }
      }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      sx={{ backgroundColor: isEditing || isNewRow ? '#fffde7' : 'inherit' }}
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
            col.renderCell({ row, onDelete, onShowLogs }) // ✅ ВАЖНО: передаём объект
          ) : (
            <EditableCell
              column={col}
              value={row[col.field]}
              onChange={onChange}
              isEditing={isEditing || isNewRow}
              row={row}
            />
          )}
        </TableCell>
      ))}

      {!hasCustomActions && (
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
          <ActionIcons
            row={row}
            isEditing={isEditing}
            isNewRow={isNewRow}
            onSave={onSave}
            onCancel={onCancel}
            onAdd={onAdd}
            onDelete={handleConfirmDelete}
            onShowLogs={onShowLogs}
            onResetPassword={onResetPassword}
          />
        </TableCell>
      )}
    </TableRow>
  )
}
