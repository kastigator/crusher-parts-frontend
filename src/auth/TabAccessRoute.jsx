import React from "react"
import { Spin, Typography } from "antd"
import { useTabs } from "@/context/TabsContext"
import PageWrapper from "@/components/common/PageWrapper"

const { Text, Title } = Typography
const CLIENTS_LOOKUP_PATHS = new Set(["/clients", "/equipment-classifier"])
const SUPPLIER_LOOKUP_PATHS = new Set([
  "/suppliers",
  "/supplier-parts",
  "/materials",
  "/tnved-codes",
  "/logistics-route-templates",
])
const MASTER_DATA_LOOKUP_PATHS = new Set([
  "/original-parts",
])

export default function TabAccessRoute({
  tabKey,
  path,
  title,
  children,
}) {
  const { tabs, permissions, loading } = useTabs()

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", marginTop: 48 }}>
        <Spin size="large" />
      </div>
    )
  }

  const tab = (tabs || []).find((item) => {
    if (tabKey && item.tab_name === tabKey) return true
    if (path && item.path === path) return true
    return false
  })
  const catalogRootTab = (tabs || []).find((item) => item.path === "/catalogs")
  const clientWorkspaceTab = (tabs || []).find((item) => item.path === "/client-request-workspace")
  const rfqWorkspaceTab = (tabs || []).find((item) => item.path === "/rfq-workspace")
  const hasCatalogRootAccess = !!catalogRootTab && permissions.includes(catalogRootTab.id)
  const hasClientWorkspaceAccess = !!clientWorkspaceTab && permissions.includes(clientWorkspaceTab.id)
  const hasRfqWorkspaceAccess = !!rfqWorkspaceTab && permissions.includes(rfqWorkspaceTab.id)

  const canAccessByBundle = (() => {
    if (!path) return false
    if (CLIENTS_LOOKUP_PATHS.has(path)) {
      return hasCatalogRootAccess || hasClientWorkspaceAccess
    }
    if (SUPPLIER_LOOKUP_PATHS.has(path)) {
      return hasCatalogRootAccess || hasRfqWorkspaceAccess
    }
    if (MASTER_DATA_LOOKUP_PATHS.has(path)) {
      return hasCatalogRootAccess || hasClientWorkspaceAccess || hasRfqWorkspaceAccess
    }
    return false
  })()

  if (!tab) {
    if (canAccessByBundle) return children
    return (
      <PageWrapper title={title || "Доступ"}>
        <Title level={5} type="danger">
          Вкладка не настроена
        </Title>
        <Text type="secondary">
          Для этого маршрута не найдена активная запись в настройках вкладок.
        </Text>
      </PageWrapper>
    )
  }

  if (!permissions.includes(tab.id)) {
    if (canAccessByBundle) return children
    return (
      <PageWrapper title={title || tab.name}>
        <Text type="secondary">
          У вас нет доступа к этому разделу. Обратитесь к администратору.
        </Text>
      </PageWrapper>
    )
  }

  return children
}
