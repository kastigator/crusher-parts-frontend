import React from "react"
import { Table } from "antd"

export default function SalesTabContent({ salesQuotes, formatDate }) {
  return (
    <Table
      rowKey="id"
      dataSource={salesQuotes}
      pagination={false}
      columns={[
        { title: "Статус", dataIndex: "status", width: 120 },
        { title: "Валюта", dataIndex: "currency", width: 90 },
        { title: "Создано", dataIndex: "created_at", width: 120, render: formatDate },
      ]}
    />
  )
}
