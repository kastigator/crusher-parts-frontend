// src/components/suppliers/SuppliersTable.jsx
import React from "react"
import { Table, Tag, Tooltip } from "antd"
import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"
import axios from "@/api/axiosInstance"

export default function SuppliersTable({
  data = [],
  loading,
  onUpdated,
  onDeleted,
  onChanged,
  onEdit,
}) {
  const handleDelete = async (record) => {
    const { confirmed } = await confirmAction("Удалить поставщика?")
    if (!confirmed) return
    try {
      await axios.delete(`/part-suppliers/${record.id}`, {
        params: { version: record.version },
      })
      onDeleted?.(record.id)
    } catch (e) {
      console.error("Ошибка удаления поставщика:", e)
    }
  }

  const columns = [
    {
      title: "Компания",
      dataIndex: "company_name",
      key: "company_name",
      render: (text, record) => {
        const label = text || "(без названия)"
        return (
          <Tooltip title={label}>
            <span>{label}</span>
          </Tooltip>
        )
      },
    },
    {
      title: "Страна",
      dataIndex: "country",
      key: "country",
    },
    {
      title: "Город",
      dataIndex: "city",
      key: "city",
    },
    {
      title: "Примечание",
      dataIndex: "notes",
      key: "notes",
      ellipsis: true,
    },
    {
      title: "Создан",
      dataIndex: "created_at",
      key: "created_at",
      width: 160,
    },
    {
      title: "Действия",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <ActionButtons
          size="small"
          onEdit={() => onEdit?.(record)}
          onDelete={() => handleDelete(record)}
        />
      ),
    },
  ]

  return (
    <Table
      rowKey="id"
      size="small"
      loading={loading}
      columns={columns}
      dataSource={data}
      pagination={{ pageSize: 50 }}
    />
  )
}
