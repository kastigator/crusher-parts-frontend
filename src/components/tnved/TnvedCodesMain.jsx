// src/components/tnved/TnvedCodesMain.jsx

import React from "react"
import TnvedCodesTable from "./TnvedCodesTable"
import PageWrapper from "@/components/common/PageWrapper"
import { Box, Button } from "@mui/material"

export default function TnvedCodesMain() {
  return (
    <PageWrapper title="Коды ТН ВЭД">
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <Button
          key="tamcustoms"
          href="https://www.tamcustoms.ru"
          target="_blank"
          rel="noopener"
          size="small"
          variant="outlined"
        >
          🌐 tamcustoms.ru
        </Button>
        <Button
          key="tsouz"
          href="https://www.tsouz.ru"
          target="_blank"
          rel="noopener"
          size="small"
          variant="outlined"
        >
          🌐 tsouz.ru
        </Button>
      </Box>

      <TnvedCodesTable />
    </PageWrapper>
  )
}
