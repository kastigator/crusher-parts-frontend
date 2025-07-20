import React from "react"
import BaseTable from "@/components/common/BaseTable"
import { clientShippingAddressesColumns } from "@/components/common/tableDefinitions"
import useTableData from "@/hooks/useTableData"

export default function ShippingAddressesTable({ clientId }) {
  const {
    data,
    setData,
    newRow,
    setNewRow,
    onAdd,
    onSave,
    onDelete
  } = useTableData("/client-shipping-addresses", { client_id: clientId })

  return (
    <BaseTable
      title="Адреса доставки"
      data={data}
      setData={setData}
      newRow={newRow}
      setNewRow={setNewRow}
      onAdd={onAdd}
      onSave={onSave}
      onDelete={onDelete}
      columns={clientShippingAddressesColumns}
      minWidth={800}
    />
  )
}
