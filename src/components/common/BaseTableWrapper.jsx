// src/components/common/BaseTableWrapper.jsx

import React, { useState } from "react"
import {
  Table,
  TableFooter,
  TableRow,
  TableCell,
  TablePagination,
  Button
} from "@mui/material"

import BaseTable from "./BaseTable"
import ImportModal from "./ImportModal"
import FullHistoryDialog from "./FullHistoryDialog"
import TableWrapper from "./TableWrapper"
import useTableData from "@/hooks/useTableData"
import { confirmAction } from "@/utils/confirmAction"

export default function BaseTableWrapper({
  title,
  type,
  endpoint,
  columns,
  withImport = false,
  withLogs = false,
  pagination = true,
  filterable = true,
  extraActions = [],
  withHeader = true
}) {
  const [importOpen, setImportOpen] = useState(false)
  const [showLogsFor, setShowLogsFor] = useState(null)

  const {
    data,
    setData,
    paginatedData,
    newRow,
    setNewRow,
    onAdd,
    onSave,
    onDelete,
    page,
    rowsPerPage,
    onPageChange,
    onRowsPerPageChange,
    filterValue,
    onFilterChange,
    onResetFilters
  } = useTableData(endpoint, { pagination, filterable }, columns)

  const handleEdit = (row) => {
    row.isEditing = true
    setData([...data])
  }

  const handleChange = (field, value, row) => {
    const updatedRow = { ...row, [field]: value }
    const newData = data.map(r => (r.id === row.id ? updatedRow : r))
    setData(newData)
  }

  const handleDelete = async (row) => {
    const confirmed = await confirmAction({
      title: "Удалить запись?",
      text: row.code ? `Код: ${row.code}` : "Вы уверены?"
    })
    if (confirmed) {
      await onDelete(row)
    }
  }

  return (
    <>
      <TableWrapper
        title={withHeader ? title : undefined}
        extraActions={[
          ...extraActions,
          withImport && (
            <Button
              key="import"
              onClick={() => setImportOpen(true)}
              size="small"
              variant="outlined"
            >
              📥 Импорт из Excel
            </Button>
          )
        ]}
      >
        <BaseTable
          columns={columns}
          data={pagination ? paginatedData : data}
          newRow={newRow}
          setNewRow={setNewRow}
          setData={setData}
          onAdd={onAdd}
          onSave={onSave}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onChange={handleChange}
          page={page}
          rowsPerPage={rowsPerPage}
          pagination={pagination}
          filterValue={filterValue}
          onFilterChange={onFilterChange}
          onResetFilters={onResetFilters}
          onShowLogs={withLogs ? (row) => setShowLogsFor(row) : undefined}
        />

        {pagination && (
          <Table size="small">
            <TableFooter>
              <TableRow>
                <TableCell colSpan={columns.length + 1}>
                  <TablePagination
                    component="div"
                    count={data.length}
                    page={page}
                    onPageChange={onPageChange}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={onRowsPerPageChange}
                  />
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </TableWrapper>

      {withImport && (
        <ImportModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
          type={type}
        />
      )}

      {withLogs && showLogsFor && (
        <FullHistoryDialog
          open={!!showLogsFor}
          onClose={() => setShowLogsFor(null)}
          entityType={type}
          entityId={showLogsFor.id}
        />
      )}
    </>
  )
}
