import React from "react"
import { Spin, Typography } from "antd"
import { useTabs } from "@/context/TabsContext"
import PageWrapper from "./PageWrapper"

const { Title, Text } = Typography

/**
 * Универсальная оболочка для страниц-вкладок.
 *
 * Props:
 *  - tabKey:   string
 *  - title?:   string
 *  - extra?:   ReactNode
 *  - helpText?: string
 *  - children: ReactNode
 */
export default function TabRendererPage({
  tabKey,
  title,
  extra,
  helpText,
  children,
}) {
  const { tabs, permissions, loading } = useTabs()

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: 48,
        }}
      >
        <Spin size="large" />
      </div>
    )
  }

  const tab = tabs.find((t) => t.tab_name === tabKey)

  if (!tab) {
    return (
      <PageWrapper title={title || tabKey}>
        <Title level={5} type="danger">
          ❗ Вкладка «{tabKey}» не найдена
        </Title>
        <Text type="secondary">
          Проверьте, что вкладка заведена в таблице <code>tabs</code> и
          загружается в <code>TabsContext</code>.
        </Text>
      </PageWrapper>
    )
  }

  if (!permissions.includes(tab.id)) {
    return (
      <PageWrapper title={title || tab.name}>
        <Text type="secondary">
          🚫 У вас нет доступа к вкладке «{tab.name}». Обратитесь к
          администратору для назначения роли.
        </Text>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper
      title={title || tab.name}
      extra={extra}
      helpText={helpText}
    >
      {children}
    </PageWrapper>
  )
}
