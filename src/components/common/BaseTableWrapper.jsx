// src/components/common/BaseTableWrapper.jsx

import React, { useState } from "react"
import {
  Table,
  TableFooter,
  TableRow,
  TableCell
} from "@mui/material"

import BaseTable from "./BaseTable"
import ImportModal from "./ImportModal"
import FullHistoryDialog from "./FullHistoryDialog"
import TableWrapper from "./TableWrapper"
import useTableData from "@/hooks/useTableData"
import TablePagination from "@mui/material/TablePagination"

export default function BaseTableWrapper({
  title,
  type,
  endpoint,
  columns,
  withImport = false,
  withLogs = false,
  pagination = true,
  filterable = true,
  extraActions
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
  } = useTableData(endpoint, { pagination, filterable })

  const handleEdit = (row) => {
    row.isEditing = true
    setData([...data]) // триггер перерендера
  }

  const handleChange = (field, value) => {
    if (field === null && typeof value === "object") {
      setNewRow(value)
    }
  }

  return (
    <>
      <TableWrapper title={title} extraActions={extraActions}>
        <BaseTable
          columns={columns}
          data={pagination ? paginatedData : data}
          newRow={newRow}
          setNewRow={setNewRow}
          onAdd={onAdd}
          onSave={onSave}
          onDelete={onDelete}
          page={page}
          rowsPerPage={rowsPerPage}
          pagination={pagination}
          filterValue={filterValue}
          onFilterChange={onFilterChange}
          onResetFilters={onResetFilters}
          onShowLogs={withLogs ? (row) => setShowLogsFor(row) : undefined}
          onEdit={handleEdit}
          onChange={handleChange}
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
