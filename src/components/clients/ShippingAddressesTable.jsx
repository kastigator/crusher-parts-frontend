// src/components/clients/ShippingAddressesTable.jsx

import React from "react"
import BaseTable from "@/components/common/BaseTable"
import useTableData from "@/hooks/useTableData"
import { clientShippingAddressesColumns } from "@/components/common/tableDefinitions"
import { confirmAction } from "@/utils/confirmAction"

export default function ShippingAddressesTable() {
  const {
    data,
    newRow,
    setNewRow,
    onAdd,
    onSave,
    onDelete
  } = useTableData("/shipping-addresses", {}, clientShippingAddressesColumns)

  const handleDelete = async (row) => {
    await confirmAction(`Удалить адрес доставки "${row.address}"?`)
    await onDelete(row)
  }

  return (
    <BaseTable
      columns={clientShippingAddressesColumns}
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
