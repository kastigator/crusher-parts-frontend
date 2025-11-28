// src/pages/ClientOrdersPage.jsx

import TabRendererPage from "@/components/common/TabRendererPage"
import ClientOrdersMain from "@/components/orders/ClientOrdersMain"

export default function ClientOrdersPage() {
  return (
    <TabRendererPage
      tabKey="client-orders"
      helpText="Двойной клик — редактирование; Enter — сохранить; Esc — отменить."
    >
      <ClientOrdersMain />
    </TabRendererPage>
  )
}
