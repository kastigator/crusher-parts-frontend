// src/components/originalParts/DetailDock.jsx
import React, { useMemo } from "react"
import { Card, Tabs, Empty, Tag, Space, Typography } from "antd"
import BomTable from "./BomTable"
import BomTree from "./BomTree"
import UsedInTable from "./UsedInTable"
import AltOriginalsTable from "./AltOriginalsTable" // 🔹 новое название
import SuppliersLinksTab from "./SuppliersLinksTab"
import BundleTab from "./bundle/BundleTab"

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
          { key: "bom", label: "Состав (BOM таблица)", children: <BomTable part={part} /> },
          { key: "tree", label: "Структура BOM (дерево)", children: <BomTree originalPartId={partId} /> },
          { key: "used", label: "Где используется", children: <UsedInTable partId={partId} /> },
          { key: "alt", label: "Альтернативные оригиналы", children: <AltOriginalsTable originalPartId={partId} /> },
          { key: "suppliers", label: "Связанные поставщики", children: <SuppliersLinksTab originalPartId={partId} /> },
          { key: "bundle", label: "Комплекты поставщика", children: <BundleTab originalPartId={partId} /> },
        ]}
      />
    </Card>
  )
}
