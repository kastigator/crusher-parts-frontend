// src/components/suppliers/SupplierContactsTable.jsx
import React, { useState } from "react"
import { Table, Input, Checkbox, Tag } from "antd"
import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"

export default function SupplierContactsTable({
  data = [],
  loading,
  onUpdate,
  onDelete,
}) {
  const [editingId, setEditingId] = useState(null)
  const [editedRow, setEditedRow] = useState(null)

  const startEdit = (record) => {
    setEditingId(record.id)
    setEditedRow({ ...record })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditedRow(null)
  }

  const saveEdit = async () => {
    if (!editedRow) return
    try {
      await onUpdate?.(editedRow.id, editedRow)
      setEditingId(null)
      setEditedRow(null)
    } catch (e) {
      if (e?.isVersionConflict) return
      console.error("Ошибка сохранения контакта поставщика:", e)
    }
  }

  const handleDeleteClick = async (record) => {
    const { confirmed } = await confirmAction("Удалить контакт поставщика?")
    if (!confirmed) return
    await onDelete?.(record)
  }

  const renderInput = (key) => ({
    render: (_, record) => {
      const value =
        editingId === record.id ? editedRow?.[key] ?? "" : record[key] ?? ""
      if (editingId === record.id) {
        return (
          <Input
            size="small"
            value={value}
            onChange={(e) =>
              setEditedRow((prev) => ({
                ...prev,
                [key]: e.target.value,
              }))
            }
          />
        )
      }
      return value || ""
    },
  })

  const columns = [
    {
      title: "Имя",
      dataIndex: "name",
      key: "name",
      ...renderInput("name"),
    },
    {
      title: "Роль",
      dataIndex: "role",
      key: "role",
      ...renderInput("role"),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      ...renderInput("email"),
    },
    {
      title: "Телефон",
      dataIndex: "phone",
      key: "phone",
      ...renderInput("phone"),
    },
    {
      title: "Основной",
      dataIndex: "is_primary",
      key: "is_primary",
      width: 100,
      render: (_, record) => {
        const checked =
          editingId === record.id
            ? !!editedRow?.is_primary
            : !!record.is_primary
        if (editingId === record.id) {
          return (
            <Checkbox
              checked={checked}
              onChange={(e) =>
                setEditedRow((prev) => ({
                  ...prev,
                  is_primary: e.target.checked ? 1 : 0,
                }))
              }
            />
          )
        }
        return checked ? <Tag color="green">Да</Tag> : <Tag>Нет</Tag>
      },
    },
    {
      title: "Примечание",
      dataIndex: "notes",
      key: "notes",
      ...renderInput("notes"),
    },
    {
      title: "Версия",
      dataIndex: "version",
      key: "version",
      width: 60,
      render: (v) => <Tag>{v ?? 1}</Tag>,
    },
    {
      title: "Действия",
      key: "actions",
      width: 140,
      render: (_, record) => {
        const editing = editingId === record.id
        return (
          <ActionButtons
            size="small"
            editing={editing}
            onEdit={() => startEdit(record)}
            onCancel={cancelEdit}
            onSave={saveEdit}
            onDelete={() => handleDeleteClick(record)}
          />
        )
      },
    },
  ]

  return (
    <Table
      size="small"
      rowKey="id"
      loading={loading}
      columns={columns}
      dataSource={data}
      pagination={false}
    />
  )
}
