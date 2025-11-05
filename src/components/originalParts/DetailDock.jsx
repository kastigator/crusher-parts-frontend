// src/components/originalParts/DetailDock.jsx
import React, { useMemo } from "react"
import { Card, Tabs, Empty, Tag, Space, Typography } from "antd"
import BomTable from "./BomTable"
import BomTree from "./BomTree"
import UsedInTable from "./UsedInTable"
import SubstitutionsTable from "./SubstitutionsTable"
import SuppliersLinksTab from "./SuppliersLinksTab"
import BundleTab from "./bundle/BundleTab"   // ← НОВОЕ

const { Text } = Typography

export default function DetailDock({ part }) {
  const partId = part?.id || null

  const header = useMemo(() => {
    if (!part) return null
    return (
      <Space size="small" wrap>
        <Text type="secondary">Деталь:</Text>
        <Tag>{part?.cat_number}</Tag>
        {part?.description_ru ? <Tag color="blue">{part.description_ru}</Tag> : null}
        {part?.description_en ? <Tag>{part.description_en}</Tag> : null}
      </Space>
    )
  }, [part])

  if (!partId) {
    return (
      <Card bodyStyle={{ padding: 24 }}>
        <Empty description="Выберите деталь в таблице выше" />
      </Card>
    )
  }

  return (
    <Card title={header} bodyStyle={{ paddingTop: 8 }}>
      <Tabs
        defaultActiveKey="bom"
        destroyInactiveTabPane
        items={[
          { key: "bom", label: "BOM (таблица)", children: <BomTable part={part} /> },
          { key: "tree", label: "BOM (дерево)", children: <BomTree originalPartId={partId} /> },
          { key: "used", label: "Где используется", children: <UsedInTable partId={partId} /> },
          { key: "subs", label: "Замены (комплекты)", children: <SubstitutionsTable originalPartId={partId} /> },
          { key: "suppliers", label: "Поставщики", children: <SuppliersLinksTab originalPartId={partId} /> },
          { key: "bundle", label: "Комплект (сборный)", children: <BundleTab originalPartId={partId} /> },
        ]}
      />
    </Card>
  )
}
