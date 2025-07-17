import React, { useState } from 'react'
import {
  Table, TableHead, TableBody, TableRow, TableCell, Paper
} from '@mui/material'
import EditableRow from './EditableRow'
import TableToolbar from './TableToolbar'

export default function BaseTable({
  data,
  columns,
  newRow,
  setNewRow,
  onAdd,
  onSave,
  onDelete,
  onResetPassword,
  title,
  editingId: externalEditingId,
  setEditingId: setExternalEditingId,
  onEdit
}) {
  const [internalEditingId, setInternalEditingId] = useState(null)
  const [editedRow, setEditedRow] = useState({})

  const editingId = externalEditingId ?? internalEditingId
  const setEditingId = setExternalEditingId ?? setInternalEditingId

  const startEdit = (row) => {
    setEditingId(row.id)
    setEditedRow({ ...row })
    onEdit?.(row)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditedRow({})
  }

  const saveEdit = () => {
    if (editedRow && onSave) {
      onSave(editedRow)
      setEditingId(null)
      setEditedRow({})
    }
  }

  const updateEditedValue = (field, value) => {
    setEditedRow(prev => ({ ...prev, [field]: value }))
  }

  const updateNewValue = (field, value) => {
    setEditingId(null)
    setEditedRow({})
    if (typeof setNewRow === 'function' && setNewRow.length === 2) {
      setNewRow(field, value)
    } else {
      setNewRow(prev => ({ ...prev, [field]: value }))
    }
  }

  const clearNewRow = () => {
    const empty = {}
    columns.forEach(col => {
      empty[col.field] = col.type === 'checkbox' ? false : ''
    })
    setNewRow(empty)
  }

  const validateRow = (row) => {
    const missing = columns
      .filter(col => col.required)
      .filter(col => !row[col.field])
      .map(col => col.title)

    if (missing.length > 0) {
      alert(`Заполните обязательные поля: ${missing.join(', ')}`)
      return false
    }

    return true
  }

  const handleAdd = () => {
    if (validateRow(newRow)) {
      onAdd?.()
    }
  }

  return (
    <Paper elevation={3} sx={{ p: 2, mt: 2, borderRadius: 2 }}>
      {title && <TableToolbar title={title} />}
      <Table
        size="small"
        sx={{
          tableLayout: 'auto',
          minWidth: columns.reduce((acc, col) => acc + (col.minWidth || col.width || 100), 0)
        }}
      >
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f3f6fa' }}>
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
                {col.title}
              </TableCell>
            ))}
            <TableCell sx={{ width: 140 }}>Действия</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          <EditableRow
            row={newRow}
            isNewRow
            isEditing={false}
            onChange={updateNewValue}
            onAdd={handleAdd}
            onCancel={clearNewRow}
            columns={columns}
          />

          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length + 1} align="center" sx={{ color: '#888', fontStyle: 'italic' }}>
                Нет записей
              </TableCell>
            </TableRow>
          )}

          {data.map(row => (
            <EditableRow
              key={row.id}
              row={editingId === row.id ? editedRow : row}
              isEditing={editingId === row.id}
              onEdit={startEdit}
              onCancel={cancelEdit}
              onChange={updateEditedValue}
              onSave={saveEdit}
              onDelete={onDelete}
              onResetPassword={onResetPassword}
              columns={columns}
            />
          ))}
        </TableBody>
      </Table>
    </Paper>
  )
}
