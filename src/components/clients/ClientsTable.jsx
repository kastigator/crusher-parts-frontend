// src/components/clients/ClientsTable.jsx

import React, { useState } from "react"
import BaseTable from "@/components/common/BaseTable"
import useTableData from "@/hooks/useTableData"
import { clientsTableColumns } from "@/components/common/tableDefinitions"
import {
  clientBillingAddressesColumns,
  clientShippingAddressesColumns,
  clientBankDetailsColumns
} from "@/components/common/tableDefinitions"
import BillingAddressesTable from "./BillingAddressesTable"
import ShippingAddressesTable from "./ShippingAddressesTable"
import BankDetailsTable from "./BankDetailsTable"

export default function ClientsTable() {
  const [expandedId, setExpandedId] = useState(null)

  const {
    data,
    paginatedData,
    newRow,
    setNewRow,
    onAdd,
    onSave,
    onDelete,
    page,
    rowsPerPage,
    onPageChange,
    onRowsPerPageChange
  } = useTableData("/clients", {}, { pagination: true })

  const renderExpandedRow = (client) => (
    <div>
      <BillingAddressesTable
        clientId={client.id}
        columns={clientBillingAddressesColumns}
      />
      <ShippingAddressesTable
        clientId={client.id}
        columns={clientShippingAddressesColumns}
      />
      <BankDetailsTable
        clientId={client.id}
        columns={clientBankDetailsColumns}
      />
    </div>
  )

  return (
    <BaseTable
      title="Клиенты"
      columns={clientsTableColumns}
      data={paginatedData}
      newRow={newRow}
      setNewRow={setNewRow}
      onAdd={onAdd}
      onSave={onSave}
      onDelete={onDelete}
      validateRow={(row) => !!row.company_name}
      pagination={true}
      page={page}
      rowsPerPage={rowsPerPage}
      onPageChange={onPageChange}
      onRowsPerPageChange={onRowsPerPageChange}
      withCollapse={{ expandedId, setExpandedId }}
      renderExpandedRow={renderExpandedRow}
    />
  )
}
