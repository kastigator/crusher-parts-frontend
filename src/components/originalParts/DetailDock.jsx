// src/components/originalParts/DetailDock.jsx
import React from "react"
import { Card, Empty, Tabs, Typography } from "antd"
import BomTable from "./BomTable"
import BomTree from "./BomTree"
import UsedInTable from "./UsedInTable"
import SubstitutionsTable from "./SubstitutionsTable"

const { Text } = Typography

export default function DetailDock({ part, modelId, manufacturerName, modelName }) {
  return (
    <Card style={{ marginTop: 12, borderRadius: 10 }} bodyStyle={{ padding: 12 }}>
      {!part ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Выберите деталь в таблице, чтобы увидеть её состав (BOM)."
        />
      ) : (
        <>
          <div style={{ marginBottom: 8 }}>
            <Text strong>Деталь:</Text>{" "}
            <Text code>{part.cat_number || `ID:${part.id}`}</Text>{" "}
            <Text type="secondary">{part.description_ru || part.description_en || ""}</Text>
          </div>

          <Tabs
            defaultActiveKey="bom"
            items={[
              {
                key: "bom",
                label: "BOM (таблица)",
                children: (
                  <BomTable
                    parentId={part.id}
                    parentPart={part}
                    modelId={modelId}
                    manufacturerName={manufacturerName}
                    modelName={modelName}
                  />
                ),
              },
              { key: "tree", label: "BOM (дерево)", children: <BomTree rootId={part.id} /> },
              { key: "used", label: "Где используется", children: <UsedInTable partId={part.id} /> },
              { key: "subs", label: "Замены (комплекты)", children: <SubstitutionsTable originalPartId={part.id} /> },
            ]}
          />
        </>
      )}
    </Card>
  )
}
