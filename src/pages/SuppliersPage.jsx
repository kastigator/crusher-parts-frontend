// src/pages/SuppliersPage.jsx
import React from "react"
import TabRendererPage from "@/components/common/TabRendererPage"
import SuppliersMain from "@/components/suppliers/SuppliersMain"

export default function SuppliersPage() {
  return (
    <TabRendererPage
      tabKey="suppliers"
      helpText="Двойной клик — редактирование; Enter — сохранить; Esc — отменить."
    >
      <SuppliersMain />
    </TabRendererPage>
  )
}
