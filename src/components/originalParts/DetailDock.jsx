import React, { useMemo } from "react"
import { Card, Tabs, Empty, Tag, Space, Typography } from "antd"

import BomTable from "./BomTable"
import BomTree from "./BomTree"
import UsedInTable from "./UsedInTable"
import AltOriginalsTable from "./AltOriginalsTable"
import SuppliersLinksTab from "./SuppliersLinksTab"
import BundleTab from "./bundle/BundleTab"
import OriginalPartDocumentsTab from "./OriginalPartDocumentsTab"

const { Text } = Typography

export default function DetailDock({
  part,
  modelId,
  manufacturerName,
  modelName,
  onPartsChanged,          // 🔹 новый проп – обновить список деталей
}) {
  const partId = part?.id || null

  const header = useMemo(() => {
    if (!part) return null

    return (
      <Space size="small" wrap>
        <Text type="secondary">Деталь:</Text>
        <Tag>{part?.cat_number}</Tag>

        {part?.description_ru ? (
          <Tag color="blue">{part.description_ru}</Tag>
        ) : null}

        {part?.description_en ? <Tag>{part.description_en}</Tag> : null}

        {manufacturerName ? (
          <Tag color="geekblue">Производитель: {manufacturerName}</Tag>
        ) : null}
        {modelName ? <Tag color="blue">Модель: {modelName}</Tag> : null}
      </Space>
    )
  }, [part, manufacturerName, modelName])

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
          {
            key: "bom",
            label: "Состав (BOM таблица)",
            children: <BomTable part={part} />,
          },
          {
            key: "tree",
            label: "Структура BOM (дерево)",
            children: <BomTree originalPartId={partId} />,
          },
          {
            key: "used",
            label: "Где используется",
            children: <UsedInTable partId={partId} />,
          },
          {
            key: "alt",
            label: "Альтернативные оригиналы",
            children: <AltOriginalsTable originalPartId={partId} />,
          },
          {
            key: "suppliers",
            label: "Связанные поставщики",
            children: <SuppliersLinksTab originalPartId={partId} />,
          },
          {
            key: "bundle",
            label: "Комплекты поставщика",
            children: <BundleTab originalPartId={partId} />,
          },
          {
            key: "documents",
            label: "Документы",
            children: (
              <OriginalPartDocumentsTab
                partId={partId}
                onChanged={onPartsChanged}
              />
            ),
          },
        ]}
      />
    </Card>
  )
}
