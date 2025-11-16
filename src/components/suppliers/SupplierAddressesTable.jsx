// src/components/suppliers/SupplierAddressesTable.jsx
import React, { useState } from "react"
import { Table, Input, Tooltip, Tag, Space, Button } from "antd"
import { CopyOutlined } from "@ant-design/icons"
import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"

const formatFull = (r = {}) =>
  [
    r.label && `[${r.label}]`,
    r.type,
    r.country,
    r.region,
    r.city,
    r.street && `ул. ${r.street}`,
    r.house && `д. ${r.house}`,
    r.building && `стр. ${r.building}`,
    r.entrance && `подъезд ${r.entrance}`,
    r.postal_code && `инд. ${r.postal_code}`,
  ]
    .filter(Boolean)
    .join(", ")

export default function SupplierAddressesTable({
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
      console.error("Ошибка сохранения адреса поставщика:", e)
    }
  }

  const handleDeleteClick = async (record) => {
    const { confirmed } = await confirmAction("Удалить адрес поставщика?")
    if (!confirmed) return
    await onDelete?.(record)
  }

  const copyFullAddress = (record) => {
    const text = formatFull(record)
    if (!text) return
    navigator.clipboard
      .writeText(text)
      .then(() => {})
      .catch((e) => {
        console.error("Не удалось скопировать адрес:", e)
      })
  }

  const renderInput = (key, width) => ({
    render: (_, record) => {
      const value =
        editingId === record.id ? editedRow?.[key] ?? "" : record[key] ?? ""
      if (editingId === record.id) {
        return (
          <Input
            size="small"
            style={width ? { maxWidth: width } : undefined}
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
      title: "Метка",
      dataIndex: "label",
      key: "label",
      ...renderInput("label", 120),
    },
    {
      title: "Тип",
      dataIndex: "type",
      key: "type",
      ...renderInput("type", 120),
    },
    {
      title: "Полный адрес",
      key: "formatted_address",
      render: (_, record) => {
        const text =
          record.formatted_address?.trim() || formatFull(record) || ""
        const short =
          text.length > 80 ? text.slice(0, 77).trimEnd() + "..." : text
        return (
          <Space>
            <Tooltip title={text}>
              <span>{short}</span>
            </Tooltip>
            {text && (
              <Tooltip title="Скопировать полный адрес">
                <Button
                  type="link"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copyFullAddress(record)}
                />
              </Tooltip>
            )}
          </Space>
        )
      },
    },
    {
      title: "Город",
      dataIndex: "city",
      key: "city",
      ...renderInput("city", 120),
    },
    {
      title: "Улица",
      dataIndex: "street",
      key: "street",
      ...renderInput("street", 120),
    },
    {
      title: "Дом",
      dataIndex: "house",
      key: "house",
      ...renderInput("house", 80),
    },
    {
      title: "Стр.",
      dataIndex: "building",
      key: "building",
      ...renderInput("building", 80),
    },
    {
      title: "Подъезд",
      dataIndex: "entrance",
      key: "entrance",
      ...renderInput("entrance", 80),
    },
    {
      title: "Индекс",
      dataIndex: "postal_code",
      key: "postal_code",
      ...renderInput("postal_code", 100),
    },
    {
      title: "Комментарий",
      dataIndex: "comment",
      key: "comment",
      ...renderInput("comment", 200),
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
