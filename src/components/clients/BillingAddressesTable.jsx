import React, { useEffect } from "react"
import BaseTable from "@/components/common/BaseTable"
import { clientBillingAddressesColumns } from "@/components/common/tableDefinitions"
import useTableData from "@/hooks/useTableData"

export default function BillingAddressesTable({ clientId }) {
  const {
    data,
    setData,
    newRow,
    setNewRow,
    onAdd,
    onSave,
    onDelete
  } = useTableData("/client-billing-addresses", { client_id: clientId })

  // 🔍 Лог для отладки
  useEffect(() => {
    console.log("🔍 BillingAddressesTable → data", data)
  }, [data])

  return (
    <BaseTable
      title="Юридические адреса"
      data={data}
      setData={setData}
      newRow={newRow}
      setNewRow={setNewRow}
      onAdd={onAdd}
      onSave={onSave}
      onDelete={onDelete}
      columns={clientBillingAddressesColumns}
      minWidth={800}
    />
  )
}
