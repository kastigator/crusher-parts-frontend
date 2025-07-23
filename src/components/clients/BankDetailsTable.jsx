// src/components/clients/BankDetailsTable.jsx

import React from "react"
import BaseTable from "@/components/common/BaseTable"
import useTableData from "@/hooks/useTableData"
import { clientBankDetailsColumns } from "@/components/common/tableDefinitions"
import { confirmAction } from "@/utils/confirmAction"

export default function BankDetailsTable() {
  const {
    data,
    newRow,
    setNewRow,
    onAdd,
    onSave,
    onDelete
  } = useTableData("/bank-details", {}, clientBankDetailsColumns)

  const handleDelete = async (row) => {
    await confirmAction(`Удалить банк с БИК ${row.bic}?`)
    await onDelete(row)
  }

  return (
    <BaseTable
      columns={clientBankDetailsColumns}
      data={data}
      newRow={newRow}
      setNewRow={setNewRow}
      onAdd={onAdd}
      onSave={onSave}
      onDelete={handleDelete}
      validateRow={(row) => !!row.bic && !!row.account_number}
    />
  )
}
