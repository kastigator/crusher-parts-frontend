import React, { useState } from "react"
import { Table, Input, Checkbox, Tag } from "antd"
import ActionButtons from "@/components/common/ActionButtons"
import ValueDisplay from "@/components/common/ValueDisplay"
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
      console.error("Ошибка при обновлении контакта поставщика:", e)
    }
  }

  const handleKeyDown = (e) => {
    if (!editingId) return

    if (e.key === "Enter") {
      e.preventDefault()
      saveEdit()
    }
    if (e.key === "Escape") {
      e.preventDefault()
      cancelEdit()
    }
  }

  const handleDeleteClick = async (record) => {
    const { confirmed } = await confirmAction("Удалить контакт поставщика?")
    if (!confirmed) return
    await onDelete?.(record)
  }

  const renderEditableText = (key, type = "text") => ({
    render: (_, record) => {
      const isEditing = editingId === record.id
      const value = isEditing ? editedRow?.[key] ?? "" : record[key] ?? ""

      if (isEditing) {
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
            onKeyDown={handleKeyDown}
          />
        )
      }

      return (
        <ValueDisplay
          value={value}
          type={type}
          onDoubleClick={() => startEdit(record)}
        />
      )
    },
  })

  const columns = [
    {
      title: "Имя",
      dataIndex: "name",
      key: "name",
      ...renderEditableText("name", "text"),
    },
    {
      title: "Роль",
      dataIndex: "role",
      key: "role",
      ...renderEditableText("role", "text"),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      ...renderEditableText("email", "email"),
    },
    {
      title: "Телефон",
      dataIndex: "phone",
      key: "phone",
      ...renderEditableText("phone", "phone"),
    },
    {
      title: "Основной",
      dataIndex: "is_primary",
      key: "is_primary",
      width: 110,
      render: (_, record) => {
        const isEditing = editingId === record.id
        const checked = isEditing
          ? !!editedRow?.is_primary
          : !!record.is_primary

        if (isEditing) {
          return (
            <Checkbox
              checked={checked}
              onChange={(e) =>
                setEditedRow((prev) => ({
                  ...prev,
                  is_primary: e.target.checked ? 1 : 0,
                }))
              }
              onKeyDown={handleKeyDown}
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
      ...renderEditableText("notes", "text"),
    },
    {
      title: "Действия",
      key: "actions",
      width: 80,
      render: (_, record) => (
        <ActionButtons
          size="small"
          onDelete={() => handleDeleteClick(record)}
        />
      ),
    },
  ]

  return (
    <Table
      className="op-table"
      size="small"
      rowKey="id"
      loading={loading}
      columns={columns}
      dataSource={Array.isArray(data) ? data : []}
      pagination={false}
      tableLayout="fixed"
      onRow={(record) => ({
        onDoubleClick: () => startEdit(record),
      })}
    />
  )
}
