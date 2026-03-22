import React from "react"
import { Spin, Typography } from "antd"
import { useTabs } from "@/context/TabsContext"
import PageWrapper from "@/components/common/PageWrapper"

const { Text, Title } = Typography

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

  if (!tab) {
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
