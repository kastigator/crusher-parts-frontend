// src/components/common/BaseTable.jsx

import React, { useState } from 'react'
import {
  Table, TableHead, TableBody, TableRow, TableCell, Paper
} from '@mui/material'
import EditableRow from './EditableRow'
import TableToolbar from './TableToolbar'
import TableFooter from './TableFooter'

export default function BaseTable({
  data,
  columns,
  newRow,
  setNewRow,
  onAdd,
  onSave,
  onDelete,
  onResetPassword,
  onShowLogs,
  title,
  editingId: externalEditingId,
  setEditingId: setExternalEditingId,
  onEdit,
  sx,
  pagination,
  search,
  minWidth // 👈 добавлено
}) {
  const [internalEditingId, setInternalEditingId] = useState(null)
  const [editedRow, setEditedRow] = useState({})
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  const editingId = externalEditingId ?? internalEditingId
  const setEditingId = setExternalEditingId ?? setInternalEditingId

  const safeData = Array.isArray(data) ? data : []
  const hasCustomActions = columns.some(col => col.field === 'actions')
  const totalCols = columns.length + (hasCustomActions ? 0 : 1)

  const startEdit = (row) => {
    onEdit?.(row)
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

  const paginatedData = pagination
    ? safeData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : safeData

  return (
    <Paper elevation={3} sx={{ p: 2, mt: 2, borderRadius: 2, ...sx }}>
      {title && (
        <TableToolbar
          title={title}
          filterValue={search?.filterValue}
          onFilterChange={search?.onFilterChange}
        />
      )}

      <Table
        size="small"
        sx={{
          tableLayout: 'auto',
          minWidth: minWidth || columns.reduce((acc, col) => acc + (col.minWidth || col.width || 100), 0)
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
            {!hasCustomActions && (
              <TableCell sx={{ width: 140, minWidth: 140, whiteSpace: 'nowrap' }}>
                Действия
              </TableCell>
            )}
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

          {paginatedData.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={totalCols}
                align="center"
                sx={{ color: '#888', fontStyle: 'italic' }}
              >
                Нет записей
              </TableCell>
            </TableRow>
          )}

          {paginatedData.map(row => (
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
              onShowLogs={onShowLogs}
              columns={columns}
            />
          ))}
        </TableBody>

        {pagination && (
          <TableFooter
            page={page}
            rowsPerPage={rowsPerPage}
            total={safeData.length}
            onPageChange={setPage}
            onRowsPerPageChange={(val) => {
              setPage(0)
              setRowsPerPage(val)
            }}
          />
        )}
      </Table>
    </Paper>
  )
}
