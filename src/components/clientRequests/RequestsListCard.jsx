import React from "react"
import { Card, Table } from "antd"

export default function RequestsListCard({
  requestColumns,
  requests,
  loading,
  openWorkspace,
  activeRequestId,
}) {
  return (
    <Card title="Список заявок" size="small">
      <Table
        rowKey="id"
        columns={requestColumns}
        dataSource={requests}
        loading={loading}
        pagination={{ pageSize: 20 }}
        onRow={(record) => ({
          onClick: () => openWorkspace(record),
        })}
        rowClassName={(record) =>
          Number(record.id) === Number(activeRequestId)
            ? "ant-table-row-selected"
            : ""
        }
      />
    </Card>
  )
}
