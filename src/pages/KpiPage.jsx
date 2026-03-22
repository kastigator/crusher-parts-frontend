import React, { useMemo } from "react"
import { Tabs } from "antd"
import TabRendererPage from "@/components/common/TabRendererPage"
import SalesKpiDashboard from "@/components/kpi/SalesKpiDashboard"
import ProcurementKpiDashboard from "@/components/kpi/ProcurementKpiDashboard"
import { useAuth } from "@/auth/AuthContext"

export default function KpiPage() {
  const { user } = useAuth()

  const roleSlug = useMemo(
    () => String(user?.role_slug || user?.role || "").trim().toLowerCase(),
    [user],
  )

  const isSeller = roleSlug === "prodavec"
  const isBuyer = roleSlug === "zakupshchik"
  const canSeeBoth = !isSeller && !isBuyer

  const effectiveSalesUserId = isSeller ? user?.id || null : null
  const effectiveBuyerUserId = isBuyer ? user?.id || null : null

  const defaultActiveKey = isBuyer ? "procurement" : "sales"
  const items = [
    ...(isBuyer
      ? []
      : [
          {
            key: "sales",
            label: "Коммерческий контур",
            children: (
              <SalesKpiDashboard
                lockedSellerId={effectiveSalesUserId}
                canSelectAnySeller={canSeeBoth}
              />
            ),
          },
        ]),
    ...(isSeller
      ? []
      : [
          {
            key: "procurement",
            label: "Закупочный контур",
            children: (
              <ProcurementKpiDashboard
                lockedBuyerId={effectiveBuyerUserId}
                canSelectAnyBuyer={canSeeBoth}
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
