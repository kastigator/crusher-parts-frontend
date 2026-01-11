import React from "react"
import TabRendererPage from "@/components/common/TabRendererPage"
import SalesKpiDashboard from "@/components/kpi/SalesKpiDashboard"

export default function SalesKpiPage() {
  return (
    <TabRendererPage
      tabKey="sales_kpi"
      helpText="Выберите период и продавца → «Обновить». Администратор пересчитывает KPI и задаёт цели. Подсказка с примером — внутри страницы."
    >
      <SalesKpiDashboard />
    </TabRendererPage>
  )
}
