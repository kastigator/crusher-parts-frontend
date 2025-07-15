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
  title
}) {
  const [editingId, setEditingId] = useState(null)
  const [editedRow, setEditedRow] = useState({})

  const startEdit = (row) => {
    setEditingId(row.id)
    setEditedRow({ ...row })
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
    setNewRow(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Paper elevation={3} sx={{ p: 2, mt: 2, overflowX: 'auto' }}>
      {title && <TableToolbar title={title} />}
      <Table size="small" sx={{ minWidth: 960 }}>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f3f6fa' }}>
            {columns.map(col => (
              <TableCell key={col.field}>{col.title}</TableCell>
            ))}
            <TableCell sx={{ width: 140, minWidth: 140 }}>Действия</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {/* Строка добавления */}
          <EditableRow
            row={newRow}
            isNewRow
            isEditing={false}
            onChange={updateNewValue}
            onAdd={onAdd}
            columns={columns}
          />

          {/* Строки таблицы */}
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

