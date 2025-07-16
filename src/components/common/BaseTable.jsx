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
  RowWrapper
}) {
  const [editingId, setEditingId] = useState(null)
  const [editedRow, setEditedRow] = useState({})

  const startEdit = (row) => {
    const empty = {}
    columns.forEach(col => {
      empty[col.field] = col.type === 'checkbox' ? false : ''
    })
    setNewRow(empty)
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

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        mt: 2,
        backgroundColor: '#fff',
        borderRadius: 2,
        overflow: 'visible',
        width: 'fit-content',
        maxWidth: '100%'
      }}
    >
      {title && <TableToolbar title={title} />}

      <Table
        size="small"
        sx={{
          tableLayout: 'auto',
          minWidth: 800
        }}
      >
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f3f6fa' }}>
            {columns.map(col => (
              <TableCell
                key={col.field}
                sx={col.width ? { width: col.width, maxWidth: col.width } : {}}
              >
                {col.title}
              </TableCell>
            ))}
            <TableCell sx={{ width: 140, minWidth: 140 }}>Действия</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {/* строка добавления */}
          <TableRow>
            <EditableRow
              row={newRow}
              isNewRow
              isEditing={false}
              onChange={updateNewValue}
              onAdd={onAdd}
              onCancel={clearNewRow}
              columns={columns}
            />
          </TableRow>

          {/* строки данных */}
          {data.map(row =>
            RowWrapper ? (
              <RowWrapper key={row.id} id={row.id}>
                <EditableRow
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
              </RowWrapper>
            ) : (
              <TableRow key={row.id}>
                <EditableRow
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
              </TableRow>
            )
          )}

          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length + 1} align="center" sx={{ color: '#888', fontStyle: 'italic' }}>
                Нет записей
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Paper>
  )
}
