// src/components/tnved/TnvedCodesTable.jsx

import React from "react"
import BaseTableWrapper from "@/components/common/BaseTableWrapper"
import { Button } from "@mui/material"
import { fieldSchemas } from "@/components/common/fieldSchemas"

export default function TnvedCodesTable() {
  const columns = fieldSchemas.tnved_code.columns

  return (
    <BaseTableWrapper
      title="Коды ТН ВЭД"
      type="tnved_code"
      endpoint="/tnved-codes"
      columns={columns}
      withImport
      withLogs
      filterable
      extraActions={[
        <Button
          key="tamcustoms"
          href="https://www.tamcustoms.ru"
          target="_blank"
          rel="noopener"
          size="small"
          variant="outlined"
        >
          🌐 tamcustoms.ru
        </Button>,
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
      ]}
    />
  )
}
