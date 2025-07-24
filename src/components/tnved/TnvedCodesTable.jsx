// src/components/tnved/TnvedCodesTable.jsx

import React from "react"
import BaseTableWrapper from "@/components/common/BaseTableWrapper"
import { fieldSchemas } from "@/components/common/fieldSchemas"

export default function TnvedCodesTable() {
  const columns = fieldSchemas.tnved_code.columns

  return (
    <BaseTableWrapper
      type="tnved_code"
      endpoint="/tnved-codes"
      columns={columns}
      withImport
      withLogs
      filterable
    />
  )
}
