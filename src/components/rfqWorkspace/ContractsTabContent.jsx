import React from "react"
import { Table } from "antd"

export default function ContractsTabContent({ contracts, formatDate }) {
  return (
    <Table
      rowKey="id"
      dataSource={contracts}
      pagination={false}
      columns={[
        { title: "Номер", dataIndex: "contract_number" },
        { title: "Статус", dataIndex: "status", width: 120 },
        { title: "Дата", dataIndex: "contract_date", width: 120, render: formatDate },
      ]}
    />
  )
}
