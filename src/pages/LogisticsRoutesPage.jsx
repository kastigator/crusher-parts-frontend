// src/pages/LogisticsRoutesPage.jsx
import TabRendererPage from "@/components/common/TabRendererPage"
import LogisticsRoutesMain from "@/components/logisticsRoutes/LogisticsRoutesMain"

export default function LogisticsRoutesPage() {
  return (
    <TabRendererPage
      tabKey="logistics-routes"
      helpText="Маршруты доставки: используйте в офферах для расчета логистики и ETA."
    >
      <LogisticsRoutesMain />
    </TabRendererPage>
  )
}
