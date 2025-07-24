// src/components/common/BaseTable.jsx
// Универсальный компонент таблицы:
// - отображает данные
// - поддерживает редактирование и добавление
// - автоматически добавляет колонку действий

import React from "react"
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody
} from "@mui/material"

import EditableRow from "./EditableRow"
import ActionIcons from "./ActionIcons"

export default function BaseTable({
  columns = [],
  data = [],
  newRow,
  setNewRow,
  setData,
  onAdd,
  onSave,
  onDelete,
  onCancel,
  onResetPassword,
  onShowLogs,
  onEdit,
  onChange
}) {
  // Добавим колонку "actions" автоматически
  const allColumns = [
    ...columns,
    { field: "actions", title: "", width: 64 }
  ]

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          {allColumns.map((col) => (
            <TableCell
              key={col.field}
              style={{ minWidth: col.minWidth || 80, width: col.width }}
            >
              {col.title}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>

      <TableBody>
        {/* Строка добавления — отображается первой */}
        {newRow && (
          <EditableRow
            row={newRow}
            columns={columns}
            isNew
            onChange={(field, value) =>
              setNewRow((prev) => ({ ...prev, [field]: value }))
            }
            onSave={onAdd}
            onCancel={() => {
              setNewRow({})
              onCancel?.()
            }}
          />
        )}

        {/* Основные строки */}
        {data.map((row) => (
          row.isEditing ? (
            <EditableRow
              key={row.id}
              row={row}
              columns={columns}
              onChange={(field, value) => onChange?.(field, value, row)}
              onSave={() => onSave?.(row)}
              onCancel={() => {
                row.isEditing = false
                setData([...data])
              }}
            />
          ) : (
            <TableRow key={row.id} tabIndex={0} onDoubleClick={() => onEdit?.(row)}>
              {columns.map((col) => (
                <TableCell key={col.field}>
                  {col.render
                    ? col.render(row[col.field], row)
                    : row[col.field]}
                </TableCell>
              ))}
              <TableCell>
                <ActionIcons
                  row={row}
                  onDelete={() => onDelete?.(row)}
                  onResetPassword={onResetPassword}
                  onShowLogs={onShowLogs}
                />
              </TableCell>
            </TableRow>
          )
        ))}
      </TableBody>
    </Table>
  )
}
