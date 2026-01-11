import React, { useState } from "react"
import { Table, Input, Checkbox, Tag, message } from "antd"
import ActionButtons from "@/components/common/ActionButtons"
import ValueDisplay from "@/components/common/ValueDisplay"
import CurrencySelect from "@/components/inputs/CurrencySelect"
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
    if (editingId && editingId !== record.id) {
      message.warning("Сначала сохраните или отмените текущие изменения")
      return
    }
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
      console.error(
        "Ошибка при обновлении банковских реквизитов поставщика:",
        e,
      )
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
    const { confirmed } = await confirmAction(
      "Удалить банковские реквизиты поставщика?",
    )
    if (!confirmed) return
    await onDelete?.(record)
  }

  const renderEditableText = (key, type = "text", width) => ({
    render: (_, record) => {
      const isEditing = editingId === record.id
      const value = isEditing ? editedRow?.[key] ?? "" : record[key] ?? ""

      if (isEditing) {
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
            onKeyDown={handleKeyDown}
          />
        )
      }

      return (
        <ValueDisplay
          value={value}
          type={type}
          maxLength={40}
        />
      )
    },
  })

  const columns = [
    {
      title: "Банк",
      dataIndex: "bank_name",
      key: "bank_name",
      ...renderEditableText("bank_name", "text", 160),
    },
    {
      title: "Счет",
      dataIndex: "account_number",
      key: "account_number",
      ...renderEditableText("account_number", "text", 160),
    },
    {
      title: "IBAN",
      dataIndex: "iban",
      key: "iban",
      ...renderEditableText("iban", "text", 180),
    },
    {
      title: "BIC",
      dataIndex: "bic",
      key: "bic",
      ...renderEditableText("bic", "text", 120),
    },
    {
      title: "Валюта",
      dataIndex: "currency",
      key: "currency",
      width: 140,
      render: (_, record) => {
        const isEditing = editingId === record.id
        const value = isEditing ? editedRow?.currency : record.currency

        if (isEditing) {
          return (
            <CurrencySelect
              value={value}
              onChange={(v) =>
                setEditedRow((prev) => ({
                  ...prev,
                  currency: v || "",
                }))
              }
              style={{ minWidth: 120 }}
              onKeyDown={handleKeyDown}
            />
          )
        }

        return (
          <ValueDisplay
            value={value}
            type="text"
            maxLength={16}
          />
        )
      },
    },
    {
      title: "Корр. счет",
      dataIndex: "correspondent_account",
      key: "correspondent_account",
      ...renderEditableText("correspondent_account", "text", 160),
    },
    {
      title: "Адрес банка",
      dataIndex: "bank_address",
      key: "bank_address",
      ...renderEditableText("bank_address", "text", 200),
    },
    {
      title: "Основной по валюте",
      dataIndex: "is_primary_for_currency",
      key: "is_primary_for_currency",
      width: 160,
      render: (_, record) => {
        const isEditing = editingId === record.id
        const checked = isEditing
          ? !!editedRow?.is_primary_for_currency
          : !!record.is_primary_for_currency

        if (isEditing) {
          return (
            <Checkbox
              checked={checked}
              onChange={(e) =>
                setEditedRow((prev) => ({
                  ...prev,
                  is_primary_for_currency: e.target.checked ? 1 : 0,
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
      title: "Доп. сведения",
      dataIndex: "additional_info",
      key: "additional_info",
      ...renderEditableText("additional_info", "text", 200),
    },
    {
      title: "Действия",
      key: "actions",
      width: 160,
      render: (_, record) => (
        <ActionButtons
          size="small"
          onEdit={editingId !== record.id ? () => startEdit(record) : undefined}
          onSave={editingId === record.id ? saveEdit : undefined}
          onCancel={editingId === record.id ? cancelEdit : undefined}
          onDelete={editingId !== record.id ? () => handleDeleteClick(record) : undefined}
          disabledEdit={!!editingId && editingId !== record.id}
          disabledDelete={!!editingId && editingId !== record.id}
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
    />
  )
}
