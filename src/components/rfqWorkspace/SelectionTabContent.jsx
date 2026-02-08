import React from "react"
import { Space, Table } from "antd"
import { formatPriceWithCurrency } from "@/utils/priceFormat"

export default function SelectionTabContent({ selections, selectionLines, formatDate }) {
  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Table
        rowKey="id"
        dataSource={selections}
        pagination={false}
        columns={[
          { title: "Статус", dataIndex: "status", width: 120 },
          { title: "Комментарий", dataIndex: "note" },
          { title: "Создано", dataIndex: "created_at", width: 120, render: formatDate },
        ]}
      />
      <Table
        rowKey="id"
        dataSource={selectionLines}
        pagination={false}
        columns={[
          { title: "RFQ item", dataIndex: "rfq_item_id", width: 90 },
          { title: "Компонент", dataIndex: "component_cat_number", width: 160 },
          { title: "Поставщик", dataIndex: "supplier_name", width: 180 },
          { title: "Предложение", dataIndex: "supplier_part_number", width: 160 },
          { title: "Тип", dataIndex: "offer_type", width: 90 },
          {
            title: "Цена",
            dataIndex: "price",
            width: 120,
            render: (value, record) => formatPriceWithCurrency(value, record.currency),
          },
          { title: "Qty", dataIndex: "qty", width: 80 },
          { title: "Комментарий", dataIndex: "decision_note" },
        ]}
      />
    </Space>
  )
}
