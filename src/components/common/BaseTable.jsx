// src/components/common/BaseTable.jsx

import React from "react"
import {
  Table,
  TableBody,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  Paper
} from "@mui/material"
import EditableRow from "./EditableRow"
import TableFooter from "./TableFooter"
import TableToolbar from "./TableToolbar"

export default function BaseTable({
  columns,
  data,
  newRow,
  setNewRow,
  onAdd,
  onSave,
  onDelete,
  onEdit,
  onCancel,
  onChange,
  onResetPassword,
  onShowLogs,
  validateRow,
  hideToolbar,
  hideFooter,
  title
}) {
  const allRows = [...data]
  if (newRow) {
    allRows.unshift({ ...newRow, isNewRow: true })
  }

  return (
    <Paper sx={{ mb: 4 }}>
      {!hideToolbar && (
        <TableToolbar title={title} onAdd={() => setNewRow({})} />
      )}

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.field}>{col.title || col.headerName}</TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {allRows.map((row, index) => (
              <EditableRow
                key={row.id || `new-${index}`}
                row={row}
                columns={columns}
                isEditing={row.isEditing}
                isNewRow={row.isNewRow}
                onEdit={onEdit}
                onCancel={onCancel}
                onChange={(field, value) =>
                  onChange?.(row, field, value)
                }
                onSave={() => onSave?.(row)}
                onDelete={() => onDelete?.(row)}
                onAdd={() => onAdd?.(row)}
                onResetPassword={() => onResetPassword?.(row)}
                onShowLogs={() => onShowLogs?.(row)}
              />
            ))}
          </TableBody>

          {!hideFooter && (
            <TableFooter
              page={0}
              rowsPerPage={25}
              total={data.length}
              onPageChange={() => {}}
              onRowsPerPageChange={() => {}}
            />
          )}
        </Table>
      </TableContainer>
    </Paper>
  )
}
