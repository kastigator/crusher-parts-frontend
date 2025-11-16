// src/components/suppliers/SupplierBankDetailsTable.jsx
import React, { useState } from "react"
import { Table, Input, Checkbox, Tag } from "antd"
import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"

export default function SupplierBankDetailsTable({
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
      console.error("Ошибка сохранения банковских реквизитов поставщика:", e)
    }
  }

  const handleDeleteClick = async (record) => {
    const { confirmed } = await confirmAction(
      "Удалить банковские реквизиты поставщика?"
    )
    if (!confirmed) return
    await onDelete?.(record)
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
      title: "Банк",
      dataIndex: "bank_name",
      key: "bank_name",
      ...renderInput("bank_name", 160),
    },
    {
      title: "Счёт",
      dataIndex: "account_number",
      key: "account_number",
      ...renderInput("account_number", 160),
    },
    {
      title: "IBAN",
      dataIndex: "iban",
      key: "iban",
      ...renderInput("iban", 180),
    },
    {
      title: "BIC",
      dataIndex: "bic",
      key: "bic",
      ...renderInput("bic", 120),
    },
    {
      title: "Валюта",
      dataIndex: "currency",
      key: "currency",
      ...renderInput("currency", 80),
    },
    {
      title: "Корр. счёт",
      dataIndex: "correspondent_account",
      key: "correspondent_account",
      ...renderInput("correspondent_account", 160),
    },
    {
      title: "Адрес банка",
      dataIndex: "bank_address",
      key: "bank_address",
      ...renderInput("bank_address", 200),
    },
    {
      title: "Основной по валюте",
      dataIndex: "is_primary_for_currency",
      key: "is_primary_for_currency",
      width: 160,
      render: (_, record) => {
        const checked =
          editingId === record.id
            ? !!editedRow?.is_primary_for_currency
            : !!record.is_primary_for_currency
        if (editingId === record.id) {
          return (
            <Checkbox
              checked={checked}
              onChange={(e) =>
                setEditedRow((prev) => ({
                  ...prev,
                  is_primary_for_currency: e.target.checked ? 1 : 0,
                }))
              }
            />
          )
        }
        return checked ? <Tag color="green">Да</Tag> : <Tag>Нет</Tag>
      },
    },
    {
      title: "Доп. сведения",
      dataIndex: "additional_info",
      key: "additional_info",
      ...renderInput("additional_info", 200),
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
