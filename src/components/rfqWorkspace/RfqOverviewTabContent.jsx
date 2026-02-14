import React from "react"
import { Space, Table, Tag, Typography } from "antd"

const { Text } = Typography

export default function RfqOverviewTabContent({
  structure,
  activeRfqId,
  rfqTreeData,
  openKitPreview,
  altPartsMap,
  openAltModal,
}) {
  const rfqStructureColumns = [
    {
      title: "Позиция",
      dataIndex: "item",
      render: (_, record) => {
        if (record.type === "DEMAND") {
          const cat = record.original_cat_number || record.client_part_number || "-"
          return (
            <Space>
              <Tag>{record.line_number}</Tag>
              <Text strong>{cat}</Text>
            </Space>
          )
        }
        if (record.type === "BOM_COMPONENT") {
          return record.cat_number || "-"
        }
        return "-"
      },
    },
    {
      title: "Описание",
      dataIndex: "description",
      render: (value) => {
        return value || "-"
      },
    },
    {
      title: "Признаки",
      dataIndex: "flags",
      width: 160,
      render: (_, record) => {
        const tags = []
        if (record.has_bom) {
          tags.push(<Tag key="assembly" color="blue">Сборка</Tag>)
        }
        if ((record.bundle_count || 0) > 0) {
          tags.push(
            <Tag
              key="kit"
              color="green"
              style={{ cursor: "pointer" }}
              onClick={() => openKitPreview(record.original_part_id)}
            >
              Комплект
            </Tag>
          )
        }
        const altCount =
          record.original_part_id && altPartsMap[record.original_part_id]
            ? altPartsMap[record.original_part_id].length
            : 0
        if (altCount > 0) {
          tags.push(
            <Tag
              key="alt"
              color="orange"
              style={{ cursor: "pointer" }}
              onClick={() => openAltModal(record.original_part_id)}
            >
              Альтернативы {altCount}
            </Tag>
          )
        }
        return tags.length ? <Space size={4} wrap>{tags}</Space> : "—"
      },
    },
    {
      title: "Кол-во",
      dataIndex: "qty",
      width: 100,
      render: (_, record) => {
        if (record.type === "DEMAND") return record.requested_qty ?? "-"
        if (record.type === "BOM_COMPONENT") return record.required_qty ?? "-"
        return "-"
      },
    },
    {
      title: "Ед.",
      dataIndex: "uom",
      width: 80,
      render: (_, record) => {
        if (record.type === "DEMAND") return record.uom || "-"
        if (record.type === "BOM_COMPONENT") return record.uom || "-"
        return "-"
      },
    },
    {
      title: "Тип",
      dataIndex: "type",
      width: 120,
      render: (value, record) => {
        if (record.type === "DEMAND") return <Tag>Заявка</Tag>
        if (record.type === "BOM_COMPONENT") return <Tag>Компонент</Tag>
        return "-"
      },
    },
  ]

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Space wrap align="center">
        <Tag color="blue">Структура (обзор)</Tag>
        <Text type="secondary">
          Показываем состав заявки и признаки сборок/комплектов.
        </Text>
      </Space>
      <Table
        rowKey="key"
        loading={!structure && !!activeRfqId}
        dataSource={rfqTreeData}
        pagination={false}
        columns={rfqStructureColumns}
        onRow={(record) => {
          if (Number(record.bundle_count || 0) > 0) {
            return { style: { background: "#f1fff2" } }
          }
          if (record.type === "DEMAND" && record.has_bom) {
            return { style: { background: "#f0f7ff" } }
          }
          return {}
        }}
      />
    </Space>
  )
}
