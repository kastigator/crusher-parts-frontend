import React from "react"
import { Alert, Tabs } from "antd"
import TabRendererPage from "@/components/common/TabRendererPage"
import SalesKpiDashboard from "@/components/kpi/SalesKpiDashboard"

export default function KpiPage() {
  return (
    <TabRendererPage
      tabKey="kpi"
      title="Показатели"
      helpText="Управленческая панель по результативности команды. Первая версия уже показывает коммерческий контур продавцов. Закупочный контур будет добавлен следующим этапом."
    >
      <Tabs
        defaultActiveKey="sales"
        items={[
          {
            key: "sales",
            label: "Коммерческий контур",
            children: <SalesKpiDashboard />,
          },
          {
            key: "procurement",
            label: "Закупочный контур",
            children: (
              <Alert
                type="info"
                showIcon
                message="KPI закупки будет подключен следующим этапом"
                description="В первой версии верхней вкладки уже работает коммерческий KPI продавцов. Следующим блоком сюда нужно добавить RFQ, выбор, PO, инциденты поставщиков и скорость закупки."
              />
            ),
          },
        ]}
      />
    </TabRendererPage>
  )
}
