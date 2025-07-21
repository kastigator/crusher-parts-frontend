// src/components/clients/ClientsTable.jsx

import React, { useEffect, useState } from "react"
import BaseTable from "@/components/common/BaseTable"
import { clientsTableColumns } from "@/components/common/tableDefinitions"
import useTableData from "@/hooks/useTableData"
import CollapseCell from "@/components/common/CollapseCell"

export default function ClientsTable({
  expandedClientId,
  setExpandedClientId,
  setAllClients
}) {
  const {
    data,
    setData,
    newRow,
    setNewRow,
    onAdd,
    onSave,
    onDelete
  } = useTableData("/clients")

  const [search, setSearch] = useState("")

  useEffect(() => {
    setAllClients?.(data)
  }, [data])

  const filteredData = data.filter((row) =>
    row.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    row.contact_person?.toLowerCase().includes(search.toLowerCase())
  )

  const columnsWithCollapse = [
    {
      field: "expand",
      title: "",
      width: 48,
      minWidth: 48,
      renderCell: ({ row }) => (
        <CollapseCell
          row={row}
          expandedId={expandedClientId}
          setExpandedId={setExpandedClientId}
        />
      )
    },
    ...clientsTableColumns
  ]

  return (
    <BaseTable
      title="Клиенты"
      data={filteredData}
      setData={setData}
      newRow={newRow}
      setNewRow={setNewRow}
      onAdd={async () => {
        const res = await onAdd()
        if (res !== false) setNewRow({})
        return res
      }}
      onSave={onSave}
      onDelete={onDelete}
      columns={columnsWithCollapse}
      search={{
        filterValue: search,
        onFilterChange: setSearch
      }}
      pagination
      minWidth={1000} // <-- пробрасывается дальше
    />
  )
}
