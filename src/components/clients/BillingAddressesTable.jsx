// src/components/clients/BillingAddressesTable.jsx

import React from "react"
import useTableData from "@/hooks/useTableData"
import BaseTable from "@/components/common/BaseTable"
import { clientBillingAddressesColumns } from "@/components/common/tableDefinitions"

export default function BillingAddressesTable({ clientId }) {
  const {
    data,
    newRow,
    setNewRow,
    onAdd,
    onSave,
    onDelete
  } = useTableData(`/clients/${clientId}/billing-addresses`, {}, clientBillingAddressesColumns, { pagination: false })

  return (
    <BaseTable
      title="Юридические адреса"
      columns={clientBillingAddressesColumns}
      data={data}
      newRow={newRow}
      setNewRow={setNewRow}
      onAdd={onAdd}
      onSave={onSave}
      onDelete={onDelete}
      validateRow={(row) => !!row.address}
    />
  )
}
