import React from "react"
import { Tabs } from "antd"
import TabRendererPage from "@/components/common/TabRendererPage"
import SalesKpiDashboard from "@/components/kpi/SalesKpiDashboard"
import ProcurementKpiDashboard from "@/components/kpi/ProcurementKpiDashboard"
import { useAuth } from "@/auth/AuthContext"
import useCapabilities from "@/hooks/useCapabilities"

export default function KpiPage() {
  const { user } = useAuth()
  const { can } = useCapabilities()
  const canSeeSales = can("commercial_offers.access")
  const canSeeProcurement = can("sourcing.access")
  const canManageSalesScope = can("commercial_offers.approvals.decide")
  const canManageProcurementScope = can("sourcing.cases.manage")
  const effectiveSalesUserId = canSeeSales && !canManageSalesScope ? user?.id || null : null
  const effectiveBuyerUserId = canSeeProcurement && !canManageProcurementScope ? user?.id || null : null

  const defaultActiveKey = canSeeSales ? "sales" : "procurement"
  const items = [
    ...(!canSeeSales
      ? []
      : [
          {
            key: "sales",
            label: "Коммерческий контур",
            children: (
              <SalesKpiDashboard
                lockedSellerId={effectiveSalesUserId}
                canSelectAnySeller={canManageSalesScope}
              />
            ),
          },
        ]),
    ...(!canSeeProcurement
      ? []
      : [
          {
            key: "procurement",
            label: "Закупочный контур",
            children: (
              <ProcurementKpiDashboard
                lockedBuyerId={effectiveBuyerUserId}
                canSelectAnyBuyer={canManageProcurementScope}
              />
            ),
          },
        ]),
  ]

  return (
    <TabRendererPage
      tabKey="kpi"
      title="Показатели"
      helpText="Панель результативности по процессным контурам. Продавец видит свой коммерческий KPI, закупщик — свой закупочный KPI, руководитель и наблюдатель могут смотреть оба контура."
    >
      <Tabs defaultActiveKey={defaultActiveKey} items={items} />
    </TabRendererPage>
  )
}
