import React from "react"
import { Card, Input, Space, Table } from "antd"

export default function RequestsListCard({
  requestColumns,
  requests,
  listSearch,
  setListSearch,
  toolbarExtra = null,
  loading,
  openWorkspace,
  activeRequestId,
  cardless = false,
  pageSize = 6,
  maxTableHeight = 300,
  title = "Список заявок",
}) {
  const content = (
    <>
      <Space style={{ marginBottom: 12, width: "100%" }} wrap align="start">
        <Input.Search
          allowClear
          style={{ width: 340, maxWidth: "100%" }}
          placeholder="Поиск по клиенту, номеру, референсу, контакту"
          value={listSearch}
          onChange={(event) => setListSearch(event.target.value)}
        />
        {toolbarExtra}
      </Space>
      <Table
        rowKey="id"
        columns={requestColumns}
        dataSource={requests}
        loading={loading}
        size="small"
        pagination={{ pageSize, size: "small", showSizeChanger: false }}
        scroll={{ x: true, y: maxTableHeight }}
        onRow={(record) => ({
          onClick: () => openWorkspace(record),
        })}
        rowClassName={(record) =>
          Number(record.id) === Number(activeRequestId)
            ? "ant-table-row-selected"
            : ""
          }
      />
    </>
  )

  if (cardless) return content

  return (
    <Card title={title} size="small">
      {content}
    </Card>
  )
}
