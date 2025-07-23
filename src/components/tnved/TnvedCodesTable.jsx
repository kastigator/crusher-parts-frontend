// src/components/tnved/TnvedCodesTable.jsx

import React, { useState } from "react"
import BaseTable from "@/components/common/BaseTable"
import useTableData from "@/hooks/useTableData"
import { tnvedCodesColumns } from "@/components/common/tableDefinitions"
import { confirmAction } from "@/utils/confirmAction"
import TnvedHistoryDialog from "./TnvedHistoryDialog"
import ImportModal from "@/components/common/ImportModal"

export default function TnvedCodesTable() {
  const [showHistoryFor, setShowHistoryFor] = useState(null)
  const [importOpen, setImportOpen] = useState(false)

  const {
    data,
    paginatedData,
    newRow,
    setNewRow,
    onAdd,
    onSave,
    onDelete,
    page,
    rowsPerPage,
    onPageChange,
    onRowsPerPageChange
  } = useTableData("/tnved-codes", {}, tnvedCodesColumns, { pagination: true })

  const handleDelete = async (row) => {
    const confirm = await confirmAction(`Удалить код "${row.code}"?`)
    if (confirm) {
      await onDelete(row)
    }
  }

  return (
    <>
      <BaseTable
        title="Коды ТН ВЭД"
        columns={tnvedCodesColumns} // ✅ массив, всё ок
        data={paginatedData}
        newRow={newRow}
        setNewRow={setNewRow}
        onAdd={onAdd}
        onSave={onSave}
        onDelete={handleDelete}
        onShowLogs={(row) => setShowHistoryFor(row)}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        validateRow={(row) => !!row.code}
      />

      <TnvedHistoryDialog
        code={showHistoryFor?.code}
        open={!!showHistoryFor}
        onClose={() => setShowHistoryFor(null)}
      />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        importHelper={"tnved-codes"} // <- 💡 возможно тут будет имя, если будет upload
        entityName="код ТН ВЭД"
      />
    </>
  )
}
