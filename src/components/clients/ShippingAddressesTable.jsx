// src/components/clients/ShippingAddressesTable.jsx

import React from "react"
import useTableData from "@/hooks/useTableData"
import BaseTable from "@/components/common/BaseTable"
import { clientShippingAddressesColumns } from "@/components/common/tableDefinitions"

export default function ShippingAddressesTable({ clientId }) {
  const {
    data,
    newRow,
    setNewRow,
    onAdd,
    onSave,
    onDelete
  } = useTableData(`/clients/${clientId}/shipping-addresses`, {}, clientShippingAddressesColumns, { pagination: false })

  return (
    <BaseTable
      title="Адреса доставки"
      columns={clientShippingAddressesColumns}
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
