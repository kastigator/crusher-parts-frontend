// src/components/orders/ClientOrdersTable.jsx
import React from "react"
import { Table, Tag } from "antd"
import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"

const STATUS_COLORS = {
  draft: "default",
  new: "blue",
  submitted: "processing",
  confirmed: "success",
  cancelled: "error",
}

const STATUS_LABELS = {
  draft: "Черновик",
  new: "Новый",
  submitted: "Отправлен",
  confirmed: "Подтверждён",
  cancelled: "Отменён",
}

export default function ClientOrdersTable({
  data = [],
  loading,
  onDelete,
}) {
  const handleDelete = async (record) => {
    const { confirmed } = await confirmAction("Удалить заказ клиента?")
    if (!confirmed) return
    await onDelete?.(record)
  }

  const columns = [
    {
      title: "№ заказа",
      dataIndex: "order_number",
      key: "order_number",
      width: 140,
      render: (value) => value || "—",
    },
    {
      title: "Клиент",
      dataIndex: "client_name",
      key: "client_name",
      width: 240,
      render: (_, record) =>
        record.client_name ||
        (record.client_id ? `Клиент #${record.client_id}` : "—"),
    },
    {
      title: "Статус",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (value) => {
        const color = STATUS_COLORS[value] || "default"
        const label = STATUS_LABELS[value] || value || "—"
        return <Tag color={color}>{label}</Tag>
      },
    },
    {
      title: "Желаемая дата",
      dataIndex: "requested_delivery_date",
      key: "requested_delivery_date",
      width: 150,
      render: (v) => (v ? String(v).slice(0, 10) : "—"),
    },
    {
      title: "Комментарий клиента",
      dataIndex: "client_comment",
      key: "client_comment",
      ellipsis: true,
      render: (v) => v || "—",
    },
    {
      title: "Внутренний комментарий",
      dataIndex: "internal_comment",
      key: "internal_comment",
      ellipsis: true,
      render: (v) => v || "—",
    },
    {
      title: "Создан",
      dataIndex: "created_at",
      key: "created_at",
      width: 160,
      render: (v) => (v ? String(v).replace("T", " ").slice(0, 19) : "—"),
    },
    {
      title: "Действия",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <ActionButtons
          size="small"
          onDelete={() => handleDelete(record)}
          // историю и редактирование подключим позже
          onHistory={null}
          confirmDelete={false}
        />
      ),
    },
  ]

  return (
    <Table
      size="small"
      rowKey="id"
      loading={loading}
      columns={columns}
      dataSource={data}
      pagination={{ pageSize: 50 }}
      className="op-table"
    />
  )
}
