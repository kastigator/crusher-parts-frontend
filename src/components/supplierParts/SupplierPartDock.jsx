// src/components/supplierParts/SupplierPartDock.jsx
import React, { useMemo, useState } from "react"
import { Card, Tabs, Space, Tag, Typography, Empty } from "antd"
import OriginalsLinkTab from "./OriginalsLinkTab"
import SupplierPartMaterialsTab from "./SupplierPartMaterialsTab"
import PriceHistoryTab from "./PriceHistoryTab"

const { Text } = Typography

/**
 * Нижняя панель деталей поставщика — как в Original Parts.
 * Props:
 * - part: объект выбранной детали (row) | null
 * - onChanged?: () => void   // дернуть, чтобы обновить верхнюю таблицу
 */
export default function SupplierPartDock({ part, onChanged = () => {} }) {
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
    <Card style={{ marginTop: 12 }} bodyStyle={{ paddingTop: 8 }} title={header}>
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
                <PriceHistoryTab
                  supplierPartId={part.id}
                  onChanged={onChanged}
                />
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
                Привязки к оригиналам
                  <Tag color="blue">
                    {part.original_cat_numbers ? part.original_cat_numbers.split(",").length : 0}
                  </Tag>
                </Space>
              ),
              children: <OriginalsLinkTab supplierPartId={part.id} onChanged={onChanged} />,
            },
          ]}
        />
      )}
    </Card>
  )
}
