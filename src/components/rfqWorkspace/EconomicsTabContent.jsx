import React from "react"
import { Space, Table } from "antd"

export default function EconomicsTabContent({ shipmentGroups, landedCosts }) {
  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Table
        rowKey="id"
        dataSource={shipmentGroups}
        pagination={false}
        columns={[
          { title: "Группа", dataIndex: "name" },
          { title: "Маршрут", dataIndex: "origin_location" },
          { title: "Транспорт", dataIndex: "transport_mode", width: 120 },
        ]}
      />
      <Table
        rowKey="id"
        dataSource={landedCosts}
        pagination={false}
        columns={[
          { title: "Снимок", dataIndex: "name" },
          { title: "Итого", dataIndex: "landed_total", width: 120 },
          { title: "Валюта", dataIndex: "currency", width: 90 },
        ]}
      />
    </Space>
  )
}
