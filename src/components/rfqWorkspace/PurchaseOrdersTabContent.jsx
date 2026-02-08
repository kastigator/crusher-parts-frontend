import React from "react"
import { Table } from "antd"

export default function PurchaseOrdersTabContent({ purchaseOrders, formatDate }) {
  return (
    <Table
      rowKey="id"
      dataSource={purchaseOrders}
      pagination={false}
      columns={[
        { title: "Поставщик", dataIndex: "supplier_name" },
        { title: "Статус", dataIndex: "status", width: 120 },
        { title: "Ссылка", dataIndex: "supplier_reference" },
        { title: "Создано", dataIndex: "created_at", width: 120, render: formatDate },
      ]}
    />
  )
}
