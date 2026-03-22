import React from "react"
import { Card, Input, Space, Table } from "antd"

export default function RequestsListCard({
  requestColumns,
  requests,
  listSearch,
  setListSearch,
  loading,
  openWorkspace,
  activeRequestId,
}) {
  return (
    <Card title="Список заявок" size="small">
      <Space style={{ marginBottom: 12 }}>
        <Input.Search
          allowClear
          style={{ width: 340 }}
          placeholder="Поиск по клиенту, номеру, референсу, контакту"
          value={listSearch}
          onChange={(event) => setListSearch(event.target.value)}
        />
      </Space>
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
