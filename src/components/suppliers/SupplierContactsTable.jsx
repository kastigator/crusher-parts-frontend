import React, { useState } from "react"
import { Table, Input, message, Tag, Checkbox } from "antd"
import axios from "@/api/axiosInstance"
import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"

export default function SupplierContactsTable({ supplierId, data = [], loading, setData, onChanged }) {
  const [editingId, setEditingId] = useState(null)
  const [editedRow, setEditedRow] = useState(null)

  const isEditing = (record) => editingId !== null && record.id === editingId
  const cancelEdit = () => { setEditingId(null); setEditedRow(null) }

  const doPut = (id, payload) => axios.put(`/supplier-contacts/${id}`, payload)

  const handleSave = async (row) => {
    if (!supplierId || !row) return
    if (!row.name?.trim()) {
      message.warning("Имя контакта обязательно")
      return
    }

    const payload = {
      name: row.name?.trim(),
      role: row.role?.trim() || null,
      email: row.email?.trim() || null,
      phone: row.phone?.trim() || null,
      is_primary: row.is_primary ? 1 : 0,
      notes: row.notes?.trim() || null,
      version: row.version
    }

    try {
      const { data: fresh } = await doPut(row.id, payload)
      setData(prev => prev.map(r => (r.id === row.id ? fresh : r)))
      message.success("Контакт обновлён")
      cancelEdit()
      onChanged?.()
    } catch (err) {
      if (err?.response?.status === 409 && err.response.data?.current) {
        const current = err.response.data.current
        try {
          const { data: fresh2 } = await doPut(row.id, { ...payload, version: current.version })
          setData(prev => prev.map(r => (r.id === row.id ? fresh2 : r)))
          message.success("Контакт обновлён")
          cancelEdit()
          onChanged?.()
          return
        } catch (e2) {
          console.error("Повтор после 409 не удался:", e2)
          message.error("Конфликт версий: запись изменилась. Обновите список.")
        }
      } else {
        console.error("Ошибка при обновлении контакта:", err)
        message.error("Не удалось сохранить контакт")
      }
    }
  }

  const deleteRow = async (record) => {
    const { confirmed } = await confirmAction("Удалить контакт?")
    if (!confirmed) return
    try {
      await axios.delete(`/supplier-contacts/${record.id}`)
      setData(prev => prev.filter(r => r.id !== record.id))
      message.success("Контакт удалён")
      onChanged?.()
    } catch (err) {
      console.error("Ошибка при удалении контакта:", err)
      message.error("Не удалось удалить контакт")
    }
  }

  const renderInput = (field, type = "text") => (
    <Input
      value={editedRow?.[field] ?? ""}
      type={type}
      onChange={(e) => setEditedRow(p => ({ ...p, [field]: e.target.value }))}
      onPressEnter={() => handleSave(editedRow)}
      onKeyDown={(e) => e.key === "Escape" && cancelEdit()}
      autoFocus={field === "name"}
      size="small"
    />
  )

  const columns = [
    {
      title: "Имя",
      dataIndex: "name",
      render: (_, record) =>
        isEditing(record) ? renderInput("name") : (record.name || "—"),
      onCell: (record) => ({
        onDoubleClick: () => { setEditingId(record.id); setEditedRow({ ...record }) }
      }),
    },
    {
      title: "Роль",
      dataIndex: "role",
      width: 160,
      render: (_, record) =>
        isEditing(record) ? renderInput("role") : (record.role || "—"),
      onCell: (record) => ({
        onDoubleClick: () => { setEditingId(record.id); setEditedRow({ ...record }) }
      }),
    },
    {
      title: "Email",
      dataIndex: "email",
      width: 220,
      render: (_, record) =>
        isEditing(record) ? renderInput("email", "email") : (record.email || "—"),
      onCell: (record) => ({
        onDoubleClick: () => { setEditingId(record.id); setEditedRow({ ...record }) }
      }),
    },
    {
      title: "Телефон",
      dataIndex: "phone",
      width: 160,
      render: (_, record) =>
        isEditing(record) ? renderInput("phone") : (record.phone || "—"),
      onCell: (record) => ({
        onDoubleClick: () => { setEditingId(record.id); setEditedRow({ ...record }) }
      }),
    },
    {
      title: "Примечания",
      dataIndex: "notes",
      render: (_, record) =>
        isEditing(record) ? renderInput("notes") : (record.notes || "—"),
      onCell: (record) => ({
        onDoubleClick: () => { setEditingId(record.id); setEditedRow({ ...record }) }
      }),
    },
    {
      title: "Статус",
      dataIndex: "is_primary",
      width: 140,
      render: (_, r) =>
        isEditing(r)
          ? (
              <Checkbox
                checked={!!(editedRow?.is_primary ?? r.is_primary)}
                onChange={(e) => setEditedRow(p => ({ ...p, is_primary: e.target.checked }))}
              >
                Основной
              </Checkbox>
            )
          : (r.is_primary ? <Tag color="green">Основной</Tag> : <Tag>Обычный</Tag>),
      onCell: (record) => ({
        onDoubleClick: () => { setEditingId(record.id); setEditedRow({ ...record }) }
      }),
    },
    {
      title: "Действия",
      key: "actions",
      width: 140,
      render: (_, record) => {
        const editing = isEditing(record)
        return (
          <ActionButtons
            onSave={editing ? () => handleSave(editedRow) : undefined}
            onCancel={editing ? cancelEdit : undefined}
            onDelete={!editing ? () => deleteRow(record) : undefined}
            confirmDelete={false}
            size="small"
          />
        )
      }
    }
  ]

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={false}
      size="small"
    />
  )
}
