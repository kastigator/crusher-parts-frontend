// src/components/clients/ClientsTable.jsx

import React from "react"
import BaseTable from "@/components/common/BaseTable"
import useTableData from "@/hooks/useTableData"
import { clientsTableColumns } from "@/components/common/tableDefinitions"
import { confirmAction } from "@/utils/confirmAction"

export default function ClientsTable() {
  const {
    data,
    newRow,
    setNewRow,
    onAdd,
    onSave,
    onDelete
  } = useTableData("/clients", {}, clientsTableColumns)

  const handleDelete = async (row) => {
    await confirmAction(`Удалить клиента "${row.company_name}"?`)
    await onDelete(row)
  }

  return (
    <BaseTable
      columns={clientsTableColumns}
      data={data}
      newRow={newRow}
      setNewRow={setNewRow}
      onAdd={onAdd}
      onSave={onSave}
      onDelete={handleDelete}
      validateRow={(row) => !!row.company_name}
    />
  )
}
