// src/components/suppliers/SupplierAddressesTable.jsx
import React, { useState } from "react"
import { Table, Input, Tag, Checkbox } from "antd"
import ValueDisplay from "@/components/common/ValueDisplay"
import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"

export default function SupplierAddressesTable({
  data = [],
  loading,
  onUpdate,      // (id, values) => Promise<void>
  onDelete,      // (record) => Promise<void>
  onReplaceRow,  // (freshRow) => void  (опционально, на будущее)
  onRefresh      // () => Promise<void> (опционально, на будущее)
}) {
  const [editingId, setEditingId] = useState(null)
  const [editedRow, setEditedRow] = useState(null)

  const isEditing = (r) => editingId === r.id
  const startEdit = (record) => {
    setEditingId(record.id)
    setEditedRow({ ...record, version: record.version }) // важно сохранить version
  }
  const cancelEdit = () => { setEditingId(null); setEditedRow(null) }

  const trimToNull = (v) => {
    if (v === undefined || v === null) return null
    const s = String(v).trim()
    return s === "" ? null : s
  }
  const toNumOrNull = (v) => {
    if (v === undefined || v === null || v === "") return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }

  const saveEdit = async (row) => {
    if (!row) return
    const payload = {
      label: trimToNull(row.label),
      type: trimToNull(row.type),
      formatted_address: trimToNull(row.formatted_address),
      city: trimToNull(row.city),
      street: trimToNull(row.street),
      house: trimToNull(row.house),
      building: trimToNull(row.building),
      entrance: trimToNull(row.entrance),
      region: trimToNull(row.region),
      country: trimToNull(row.country),
      is_precise_location: row.is_precise_location ? 1 : 0,
      place_id: trimToNull(row.place_id),
      lat: toNumOrNull(row.lat),
      lng: toNumOrNull(row.lng),
      postal_code: trimToNull(row.postal_code),
      comment: trimToNull(row.comment),
      // is_primary — удалено из схемы
      version: row.version
    }

    if (!payload.formatted_address) {
      // просто не сохраняем пустой адрес
      return
    }

    await onUpdate?.(row.id, payload)
    cancelEdit()
  }

  const deleteRow = async (record) => {
    const { confirmed } = await confirmAction("Удалить адрес?")
    if (!confirmed) return
    await onDelete?.(record) // родитель сам обновит список и/или покажет конфликт
    if (isEditing(record)) cancelEdit()
  }

  const renderInput = (field) => (
    <Input
      value={editedRow?.[field] ?? ""}
      onChange={(e) => setEditedRow((p) => ({ ...p, [field]: e.target.value }))}
      onPressEnter={() => saveEdit(editedRow)}
      onKeyDown={(e) => e.key === "Escape" && cancelEdit()}
      autoFocus={field === "formatted_address"}
      size="small"
    />
  )

  const columns = [
    {
      title: "Метка",
      dataIndex: "label",
      width: 140,
      render: (_, r) => (isEditing(r) ? renderInput("label") : <ValueDisplay value={r.label} />),
      onCell: (record) => ({ onDoubleClick: () => startEdit(record) })
    },
    {
      title: "Тип",
      dataIndex: "type",
      width: 120,
      render: (_, r) => (isEditing(r) ? renderInput("type") : <ValueDisplay value={r.type} />),
      onCell: (record) => ({ onDoubleClick: () => startEdit(record) })
    },
    {
      title: "Адрес",
      dataIndex: "formatted_address",
      render: (_, r) =>
        isEditing(r) ? renderInput("formatted_address") : <ValueDisplay value={r.formatted_address} />,
      onCell: (record) => ({ onDoubleClick: () => startEdit(record) })
    },
    {
      title: "Город",
      dataIndex: "city",
      width: 140,
      render: (_, r) => (isEditing(r) ? renderInput("city") : <ValueDisplay value={r.city} />),
      onCell: (record) => ({ onDoubleClick: () => startEdit(record) })
    },
    {
      title: "Индекс",
      dataIndex: "postal_code",
      width: 120,
      render: (_, r) => (isEditing(r) ? renderInput("postal_code") : <ValueDisplay value={r.postal_code} />),
      onCell: (record) => ({ onDoubleClick: () => startEdit(record) })
    },
    {
      title: "Страна",
      dataIndex: "country",
      width: 90,
      render: (_, r) => (isEditing(r) ? renderInput("country") : <ValueDisplay value={r.country} />),
      onCell: (record) => ({ onDoubleClick: () => startEdit(record) })
    },
    {
      title: "Точная локация",
      dataIndex: "is_precise_location",
      width: 140,
      render: (_, r) =>
        isEditing(r) ? (
          <Checkbox
            checked={!!(editedRow?.is_precise_location ?? r.is_precise_location)}
            onChange={(e) => setEditedRow((p) => ({ ...p, is_precise_location: e.target.checked }))}
          >
            Да
          </Checkbox>
        ) : r.is_precise_location ? (
          <Tag color="blue">GPS</Tag>
        ) : (
          <Tag>—</Tag>
        ),
      onCell: (record) => ({ onDoubleClick: () => startEdit(record) })
    },
    {
      title: "Комментарий",
      dataIndex: "comment",
      render: (_, r) => (isEditing(r) ? renderInput("comment") : <ValueDisplay value={r.comment} />),
      onCell: (record) => ({ onDoubleClick: () => startEdit(record) })
    },
    {
      title: "Действия",
      key: "actions",
      width: 140,
      render: (_, record) => {
        const editing = isEditing(record)
        return (
          <ActionButtons
            onSave={editing ? () => saveEdit(editedRow) : undefined}
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
