// src/components/common/BaseTable.jsx

import React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  Collapse,
  Box
} from "@mui/material"
import TableToolbar from "./TableToolbar"
import EditableRow from "./EditableRow"
import CollapseCell from "./CollapseCell"

export default function BaseTable({
  title,
  columns,
  data = [],
  newRow,
  setNewRow,
  onAdd,
  onSave,
  onDelete,
  onCancel,
  onResetPassword,
  onShowLogs,
  onEdit,
  validateRow,
  pagination = false,
  page = 0,
  rowsPerPage = 10,
  renderExpandedRow,
  withCollapse
}) {
  const allColumns = [
    ...(withCollapse ? [{ field: "expand", type: "collapse" }] : []),
    ...columns
  ]

  const handleCollapseClick = (id) => {
    if (withCollapse?.setExpandedId) {
      withCollapse.setExpandedId(withCollapse.expandedId === id ? null : id)
    }
  }

  const visibleRows = pagination
    ? data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : data

  return (
    <Paper sx={{ mb: 4 }}>
      {title && (
        <Typography variant="h6" sx={{ p: 2, pb: 0 }}>
          {title}
        </Typography>
      )}

      <TableToolbar
        newRow={newRow}
        setNewRow={setNewRow}
        columns={allColumns}
      />

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {allColumns.map((col) => (
                <TableCell key={col.field}>
                  {col.title || ""}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {newRow && (
              <EditableRow
                row={newRow}
                columns={allColumns}
                isNewRow
                isEditing
                onChange={(field, value) =>
                  setNewRow({ ...newRow, [field]: value })
                }
                onAdd={() => {
                  if (validateRow?.(newRow)) {
                    onAdd(newRow)
                    setNewRow(null)
                  }
                }}
                onCancel={() => setNewRow(null)}
              />
            )}

            {visibleRows.map((row) => (
              <React.Fragment key={row.id}>
                <EditableRow
                  row={row}
                  columns={allColumns}
                  isEditing={!!row.isEditing}
                  onChange={(field, value) => {
                    row[field] = value
                  }}
                  onSave={onSave}
                  onDelete={onDelete}
                  onCancel={onCancel}
                  onResetPassword={onResetPassword}
                  onShowLogs={onShowLogs}
                  onEdit={onEdit}
                  onAdd={onAdd}
                />

                {withCollapse?.expandedId === row.id && renderExpandedRow && (
                  <TableRow>
                    <TableCell colSpan={allColumns.length} sx={{ p: 0 }}>
                      <Collapse in={true} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2 }}>
                          {renderExpandedRow(row)}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}
