// src/components/common/TabRendererPage.jsx

import React from 'react'
import { useTabs } from '@/context/TabsContext'
import PageWrapper from './PageWrapper'
import { Spin, Typography } from 'antd'

export default function TabRendererPage({ tabKey, title, children }) {
  const { tabs, permissions, loading } = useTabs()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
        <Spin size="large" />
      </div>
    )
  }

  const tab = tabs.find(t => t.tab_name === tabKey)

  if (!tab) {
    return (
      <div style={{ padding: 32 }}>
        <Typography.Title level={5} type="danger">
          ❗ Вкладка "{tabKey}" не найдена
        </Typography.Title>
      </div>
    )
  }

  if (!permissions.includes(tab.id)) {
    return (
      <div style={{ padding: 32 }}>
        <Typography.Text type="secondary">
          🚫 У вас нет доступа к вкладке «{tab.name}»
        </Typography.Text>
      </div>
    )
  }

  return (
    <PageWrapper title={title || tab.name}>
      {children}
    </PageWrapper>
  )
}
