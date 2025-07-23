// src/components/clients/ClientsMain.jsx

import React, { useState } from "react"
import ClientsTable from "./ClientsTable"
import BillingAddressesTable from "./BillingAddressesTable"
import ShippingAddressesTable from "./ShippingAddressesTable"
import BankDetailsTable from "./BankDetailsTable"
import PageWrapper from "@/components/common/PageWrapper"

export default function ClientsMain() {
  const [selectedClientId, setSelectedClientId] = useState(null)

  return (
    <PageWrapper title="Клиенты и реквизиты">
      <ClientsTable onSelectClient={setSelectedClientId} />
      {selectedClientId && (
        <>
          <BillingAddressesTable clientId={selectedClientId} />
          <ShippingAddressesTable clientId={selectedClientId} />
          <BankDetailsTable clientId={selectedClientId} />
        </>
      )}
    </PageWrapper>
  )
}
