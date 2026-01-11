// src/pages/ClientsPage.jsx
import React from "react"
import TabRendererPage from "@/components/common/TabRendererPage"
import ClientsMain from "@/components/clients/ClientsMain"

export default function ClientsPage() {
  return (
    <TabRendererPage
      tabKey="clients"
      helpText="Кнопка карандаш — редактирование; Enter — сохранить; Esc — отменить."
    >
      <ClientsMain />
    </TabRendererPage>
  )
}
