// src/components/tnved/TnvedCodesMain.jsx

import React from "react"
import TnvedCodesTable from "./TnvedCodesTable"
import PageWrapper from "@/components/common/PageWrapper"

export default function TnvedCodesMain() {
  return (
    <PageWrapper title="Коды ТН ВЭД">
      <TnvedCodesTable />
    </PageWrapper>
  )
}
