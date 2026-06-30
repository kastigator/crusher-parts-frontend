// src/components/supplierParts/SupplierPartDock.jsx
import React, { useMemo, useState, Suspense, lazy } from "react"
import { Card, Tabs, Space, Tag, Typography, Empty } from "antd"
import CatalogPositionLinksTab from "./CatalogPositionLinksTab"
import SupplierPartMaterialsTab from "./SupplierPartMaterialsTab"

const PriceHistoryTab = lazy(() => import("./PriceHistoryTab"))

const { Text } = Typography

/**
 * Нижняя панель деталей поставщика — как в Original Parts.
 * Props:
 * - part: объект выбранной детали (row) | null
 * - onChanged?: () => void   // дернуть, чтобы обновить верхнюю таблицу
 */
export default function SupplierPartDock({
  part,
  onChanged = () => {},
  noTopMargin = false,
}) {
  const [activeKey, setActiveKey] = useState("prices")

  const header = useMemo(() => {
    if (!part) return null
    return (
      <Space wrap size={8}>
        <Text type="secondary">Деталь:</Text>
        <Text strong>{part.supplier_part_number || "—"}</Text>
        {part.description_ru ? <Tag color="blue">{part.description_ru}</Tag> : null}
        {part.description_en ? <Tag>{part.description_en}</Tag> : null}
        {String(part.part_type || "").toUpperCase() === "OEM" ? (
          <Tag color="blue">OEM</Tag>
        ) : (
          <Tag>—</Tag>
        )}
        {part.is_overweight ? <Tag color="red">Тяжелая</Tag> : null}
        {part.is_oversize ? <Tag color="orange">Негабарит</Tag> : null}
      </Space>
    )
  }, [part])

  return (
    <Card
      style={noTopMargin ? undefined : { marginTop: 12 }}
      bodyStyle={{ paddingTop: 8 }}
      title={header}
    >
      {!part ? (
        <Empty description="Выберите деталь в таблице выше" />
      ) : (
        <Tabs
          activeKey={activeKey}
          onChange={setActiveKey}
          destroyInactiveTabPane
          items={[
            {
              key: "prices",
              label: "Цены",
              children: (
                <Suspense fallback={<div style={{ padding: 12 }}>Загрузка...</div>}>
                  <PriceHistoryTab
                    supplierPartId={part.id}
                    onChanged={onChanged}
                  />
                </Suspense>
              ),
            },
          {
            key: "materials",
            label: "Материалы",
            children: <SupplierPartMaterialsTab supplierPartId={part.id} />,
          },
          {
            key: "links",
            label: (
              <Space size={6}>
                Связи с каталогом
                  <Tag color="blue">
                    {part.catalog_position_numbers ? part.catalog_position_numbers.split(",").length : 0}
                  </Tag>
                </Space>
              ),
              children: <CatalogPositionLinksTab supplierPartId={part.id} onChanged={onChanged} />,
            },
          ]}
        />
      )}
    </Card>
  )
}
