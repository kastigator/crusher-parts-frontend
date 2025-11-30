import React from "react"
import { Table, Tag, Tooltip, Button, Space, Popconfirm } from "antd"
import { FileOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons"
import "@/styles/tableStyles.css"

export default function MaterialsTable({
  data,
  loading,
  onRowClick,
  onEdit,
  onDelete,
  pagination,
}) {
  const columns = [
    {
      title: "Название",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: 600 }}>{text}</span>
          <span style={{ fontSize: 12, color: "#6b7280" }}>
            {record.category_name || "Без категории"}
          </span>
        </div>
      ),
    },
    {
      title: "Код",
      dataIndex: "code",
      key: "code",
      width: 140,
      render: (v) => v || <span style={{ color: "#9ca3af" }}>—</span>,
    },
    {
      title: "Стандарт",
      dataIndex: "standard",
      key: "standard",
      width: 120,
      render: (v) => v || <span style={{ color: "#9ca3af" }}>—</span>,
    },
    {
      title: "Описание",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (v) =>
        v ? (
          <Tooltip title={v}>
            <span>{v}</span>
          </Tooltip>
        ) : (
          <span style={{ color: "#9ca3af" }}>—</span>
        ),
    },
    {
      title: "",
      key: "actions",
      width: 60,
      render: (_, record) => (
        <Space>
          <Tooltip title="Редактировать">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                onEdit?.(record)
              }}
            />
          </Tooltip>
          <Popconfirm
            title="Удалить материал?"
            okText="Да"
            cancelText="Нет"
            onConfirm={(e) => {
              e?.stopPropagation?.()
              onDelete?.(record)
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Table
      className="op-table"
      size="small"
      rowKey="id"
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={pagination}
      onRow={(record) => ({
        onClick: () => onRowClick?.(record),
      })}
      locale={{
        emptyText: "Нет данных",
      }}
    />
  )
}
