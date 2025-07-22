// src/components/clients/ClientsMain.jsx

import { useState } from "react"
import { Grid, Tabs, Tab, Typography, Collapse } from "@mui/material"
import ClientsTable from "./ClientsTable"
import BillingAddressesTable from "./BillingAddressesTable"
import ShippingAddressesTable from "./ShippingAddressesTable"
import BankDetailsTable from "./BankDetailsTable"
import FullHistoryDialog from "./FullHistoryDialog"
import axios from "@/api/axiosInstance"

export default function ClientsMain() {
  const [expandedClientId, setExpandedClientId] = useState(null)
  const [tabIndex, setTabIndex] = useState(0)
  const [allClients, setAllClients] = useState([])

  const [logs, setLogs] = useState([])
  const [logOpen, setLogOpen] = useState(false)

  const selectedClient = allClients.find(c => c.id === expandedClientId)

  const handleShowLogs = async (row) => {
    try {
      const res = await axios.get(`/clients/${row.id}/logs`)
      setLogs(res.data)
      setLogOpen(true)
    } catch (err) {
      console.error("Ошибка при загрузке логов:", err)
    }
  }

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={5}>
        <ClientsTable
          expandedClientId={expandedClientId}
          setExpandedClientId={setExpandedClientId}
          setAllClients={setAllClients}
          onShowLogs={handleShowLogs}
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
                <BillingAddressesTable
                  key={`billing-${selectedClient.id}`}
                  clientId={selectedClient.id}
                />
              )}
              {tabIndex === 1 && (
                <ShippingAddressesTable
                  key={`shipping-${selectedClient.id}`}
                  clientId={selectedClient.id}
                />
              )}
              {tabIndex === 2 && (
                <BankDetailsTable
                  key={`bank-${selectedClient.id}`}
                  clientId={selectedClient.id}
                />
              )}
            </>
          )}
        </Collapse>
      </Grid>

      <FullHistoryDialog
        open={logOpen}
        onClose={() => setLogOpen(false)}
        logs={logs}
      />
    </Grid>
  )
}
