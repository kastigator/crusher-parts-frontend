// src/components/clients/ClientsMain.jsx

import { useState } from "react"
import { Grid, Tabs, Tab, Typography, Collapse } from "@mui/material"
import ClientsTable from "./ClientsTable"
import BillingAddressesTable from "./BillingAddressesTable"
import ShippingAddressesTable from "./ShippingAddressesTable"
import BankDetailsTable from "./BankDetailsTable"

export default function ClientsMain() {
  const [expandedClientId, setExpandedClientId] = useState(null)
  const [tabIndex, setTabIndex] = useState(0)
  const [allClients, setAllClients] = useState([])

  const selectedClient = allClients.find(c => c.id === expandedClientId)

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={5}>
        <ClientsTable
          expandedClientId={expandedClientId}
          setExpandedClientId={setExpandedClientId}
          setAllClients={setAllClients}
        />
      </Grid>

      <Grid item xs={12} md={7}>
        <Collapse in={!!selectedClient}>
          {selectedClient && (
            <>
              <Typography variant="h6" gutterBottom>
                Клиент: {selectedClient.company_name}
              </Typography>

              <Tabs
                value={tabIndex}
                onChange={(_, i) => setTabIndex(i)}
                sx={{ mb: 2 }}
              >
                <Tab label="Юр. адреса" />
                <Tab label="Адреса доставки" />
                <Tab label="Банки" />
              </Tabs>

              {tabIndex === 0 && (
                <BillingAddressesTable clientId={selectedClient.id} />
              )}
              {tabIndex === 1 && (
                <ShippingAddressesTable clientId={selectedClient.id} />
              )}
              {tabIndex === 2 && (
                <BankDetailsTable clientId={selectedClient.id} />
              )}
            </>
          )}
        </Collapse>
      </Grid>
    </Grid>
  )
}
