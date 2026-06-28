import React, { useMemo } from "react"
import { Card, Tabs, Empty, Tag, Space, Typography } from "antd"

import BomTree from "./BomTree"
import UsedInTable from "./UsedInTable"
import AltOriginalsTable from "./AltOriginalsTable"
import SuppliersLinksTab from "./SuppliersLinksTab"
import BundleTab from "./bundle/BundleTab"
import OriginalPartDocumentsTab from "./OriginalPartDocumentsTab"
import OriginalPartMaterialsTab from "./OriginalPartMaterialsTab"
import OriginalPartPresentationProfileTab from "./OriginalPartPresentationProfileTab"
import OriginalPartUnitOverridesTab from "./OriginalPartUnitOverridesTab"

const { Text } = Typography

export default function DetailDock({
  part,
  modelId,
  manufacturerName,
  modelName,
  onOpenPart,
  onPartsChanged,          // 🔹 новый проп – обновить список деталей
}) {
  const partId = part?.id || null

  const header = useMemo(() => {
    if (!part) return null

    return (
      <Space size="small" wrap>
        <Text type="secondary">OEM деталь:</Text>
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
            label: "BOM",
            children: (
              <BomTree
                part={part}
                modelId={modelId}
                manufacturerName={manufacturerName}
                modelName={modelName}
                onOpenPart={onOpenPart}
              />
            ),
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
            key: "materials",
            label: "Материалы",
            children: <OriginalPartMaterialsTab partId={partId} />,
          },
          {
            key: "presentation-profile",
            label: "Номера и видимость",
            children: <OriginalPartPresentationProfileTab partId={partId} />,
          },
          {
            key: "unit-overrides",
            label: "По машинам клиентов",
            children: <OriginalPartUnitOverridesTab partId={partId} part={part} />,
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
