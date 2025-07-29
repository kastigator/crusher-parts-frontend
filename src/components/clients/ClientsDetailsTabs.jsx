import React, { useState } from "react"
import { Tabs, Tab, Box } from "@mui/material"
import BillingAddressesTable from "./BillingAddressesTable"
import ShippingAddressesTable from "./ShippingAddressesTable"
import BankDetailsTable from "./BankDetailsTable"

export default function ClientsDetailsTabs({ clientId }) {
  const [tabIndex, setTabIndex] = useState(0)

  const handleChange = (_, newIndex) => setTabIndex(newIndex)

  return (
    <Box sx={{ borderTop: 1, borderColor: "divider" }}>
      <Tabs value={tabIndex} onChange={handleChange} sx={{ mb: 2 }}>
        <Tab label="Юр. адреса" />
        <Tab label="Доставка" />
        <Tab label="Банки" />
      </Tabs>

      {tabIndex === 0 && <BillingAddressesTable clientId={clientId} />}
      {tabIndex === 1 && <ShippingAddressesTable clientId={clientId} />}
      {tabIndex === 2 && <BankDetailsTable clientId={clientId} />}
    </Box>
  )
}
