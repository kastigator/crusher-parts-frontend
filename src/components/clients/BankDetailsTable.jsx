// src/components/clients/BankDetailsTable.jsx

import React from "react"
import useTableData from "@/hooks/useTableData"
import BaseTable from "@/components/common/BaseTable"
import { clientBankDetailsColumns } from "@/components/common/tableDefinitions"

export default function BankDetailsTable({ clientId }) {
  const {
    data,
    newRow,
    setNewRow,
    onAdd,
    onSave,
    onDelete
  } = useTableData(`/clients/${clientId}/bank-details`, {}, clientBankDetailsColumns, { pagination: false })

  return (
    <BaseTable
      title="Банковские реквизиты"
      columns={clientBankDetailsColumns}
      data={data}
      newRow={newRow}
      setNewRow={setNewRow}
      onAdd={onAdd}
      onSave={onSave}
      onDelete={onDelete}
      validateRow={(row) => !!row.bic && !!row.account_number}
    />
  )
}
