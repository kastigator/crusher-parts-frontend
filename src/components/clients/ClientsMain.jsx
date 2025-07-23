// src/components/clients/ClientsMain.jsx

import React from "react"
import PageWrapper from "@/components/common/PageWrapper"
import ClientsTable from "./ClientsTable"
import BillingAddressesTable from "./BillingAddressesTable"
import ShippingAddressesTable from "./ShippingAddressesTable"
import BankDetailsTable from "./BankDetailsTable"

export default function ClientsMain() {
  return (
    <PageWrapper title="Клиенты">
      <ClientsTable />
      <BillingAddressesTable />
      <ShippingAddressesTable />
      <BankDetailsTable />
    </PageWrapper>
  )
}
