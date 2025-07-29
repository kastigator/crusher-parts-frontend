import React, { useState } from "react"
import { Box, Tabs, Tab } from "@mui/material"
import ClientsTable from "./ClientsTable"
import BillingAddressesTable from "./BillingAddressesTable"
import ShippingAddressesTable from "./ShippingAddressesTable"
import BankDetailsTable from "./BankDetailsTable"

export default function ClientsMain() {
  const [expandedClientId, setExpandedClientId] = useState(null)
  const [activeTab, setActiveTab] = useState(0)
  const [allClients, setAllClients] = useState([])
  const [search, setSearch] = useState("")

  const client = allClients.find(c => c.id === expandedClientId)

  return (
    <Box sx={{ p: 2 }}>
      <ClientsTable
        expandedClientId={expandedClientId}
        setExpandedClientId={setExpandedClientId}
        setAllClients={setAllClients}
        search={search}
        setSearch={setSearch}
      />

      {expandedClientId && (
        <>
          <Tabs
            value={activeTab}
            onChange={(_, i) => setActiveTab(i)}
            sx={{ mt: 2 }}
          >
            <Tab label="Юридические адреса" />
            <Tab label="Адреса доставки" />
            <Tab label="Банковские реквизиты" />
          </Tabs>

          <Box sx={{ mt: 2 }}>
            {activeTab === 0 && (
              <BillingAddressesTable clientId={expandedClientId} />
            )}
            {activeTab === 1 && (
              <ShippingAddressesTable clientId={expandedClientId} />
            )}
            {activeTab === 2 && (
              <BankDetailsTable clientId={expandedClientId} />
            )}
          </Box>
        </>
      )}
    </Box>
  )
}
