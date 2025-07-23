// src/components/clients/BillingAddressesTable.jsx

import React from "react"
import BaseTable from "@/components/common/BaseTable"
import useTableData from "@/hooks/useTableData"
import { clientBillingAddressesColumns } from "@/components/common/tableDefinitions"
import { confirmAction } from "@/utils/confirmAction"

export default function BillingAddressesTable() {
  const {
    data,
    newRow,
    setNewRow,
    onAdd,
    onSave,
    onDelete
  } = useTableData("/billing-addresses", {}, clientBillingAddressesColumns)

  const handleDelete = async (row) => {
    await confirmAction(`Удалить адрес "${row.address}"?`)
    await onDelete(row)
  }

  return (
    <BaseTable
      columns={clientBillingAddressesColumns}
      data={data}
      newRow={newRow}
      setNewRow={setNewRow}
      onAdd={onAdd}
      onSave={onSave}
      onDelete={handleDelete}
      validateRow={(row) => !!row.address}
    />
  )
}
