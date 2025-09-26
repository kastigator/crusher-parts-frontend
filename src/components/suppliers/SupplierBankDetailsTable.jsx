// src/components/suppliers/SupplierBankDetailsTable.jsx
import React, { useState } from "react"
import { Table, Input, Tag, Checkbox, message } from "antd"
import ValueDisplay from "@/components/common/ValueDisplay"
import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"
import CurrencySelect from "@/components/inputs/CurrencySelect"

export default function SupplierBankDetailsTable({
  data = [],
  loading,
  onUpdate,   // (id, values) => Promise<void>
  onDelete,   // (record) => Promise<void>
}) {
  const [editingId, setEditingId] = useState(null)
  const [editedRow, setEditedRow] = useState(null)

  const isEditing = (r) => editingId === r.id

  const startEdit = (record) => {
    setEditingId(record.id)
    setEditedRow({ ...record, version: record.version })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditedRow(null)
  }

  const trimToNull = (v) => {
    if (v === undefined || v === null) return null
    const s = String(v).trim()
    return s === "" ? null : s
  }

  const saveEdit = async () => {
    if (!editedRow) return
    const payload = {
      bank_name: trimToNull(editedRow.bank_name),
      account_number: trimToNull(editedRow.account_number),
      iban: trimToNull(editedRow.iban),
      bic: trimToNull(editedRow.bic),
      currency: editedRow.currency ? String(editedRow.currency).trim().toUpperCase().slice(0, 3) : null,
      correspondent_account: trimToNull(editedRow.correspondent_account),
      bank_address: trimToNull(editedRow.bank_address),
      additional_info: trimToNull(editedRow.additional_info),
      is_primary_for_currency: editedRow.is_primary_for_currency ? 1 : 0,
      version: editedRow.version,
    }

    if (!payload.bank_name || !payload.account_number) {
      message.warning("Укажите банк и расчётный счёт")
      return
    }
    if (payload.is_primary_for_currency === 1 && !payload.currency) {
      message.warning("Чтобы пометить как основной для валюты, укажите валюту (ISO3)")
      return
    }

    try {
      await onUpdate?.(editedRow.id, payload)
      cancelEdit()
    } catch (err) {
      console.error("Ошибка при сохранении реквизитов:", err)
      // Родитель покажет модалку конфликта
    }
  }

  const deleteRow = async (record) => {
    const { confirmed } = await confirmAction("Удалить реквизиты?")
    if (!confirmed) return
    try {
      await onDelete?.(record)
      if (isEditing(record)) cancelEdit()
    } catch (err) {
      console.error("Ошибка при удалении реквизитов:", err)
    }
  }

  const renderInput = (field, type = "text") => (
    <Input
      value={editedRow?.[field] ?? ""}
      type={type}
      onChange={(e) => setEditedRow((p) => ({ ...p, [field]: e.target.value }))}
      size="small"
      onKeyDown={(e) => {
        if (e.key === "Enter") saveEdit()
        if (e.key === "Escape") cancelEdit()
      }}
    />
  )

  const renderCurrencySelect = () => (
    <CurrencySelect
      value={editedRow?.currency ?? ""}
      onChange={(val) => setEditedRow((p) => ({ ...p, currency: val || "" }))}
      TextFieldProps={{
        size: "small",
        getPopupContainer: (trigger) =>
          trigger?.closest(".parts-table-wrap") || document.body,
      }}
    />
  )

  const columns = [
    {
      title: "Банк",
      dataIndex: "bank_name",
      render: (_, r) =>
        isEditing(r) ? renderInput("bank_name") : <ValueDisplay value={r.bank_name} />,
      onCell: (record) => ({ onDoubleClick: () => startEdit(record) }),
    },
    {
      title: "BIC",
      dataIndex: "bic",
      width: 120,
      render: (_, r) =>
        isEditing(r) ? renderInput("bic") : <ValueDisplay value={r.bic} />,
      onCell: (record) => ({ onDoubleClick: () => startEdit(record) }),
    },
    {
      title: "IBAN",
      dataIndex: "iban",
      width: 180,
      render: (_, r) =>
        isEditing(r) ? renderInput("iban") : <ValueDisplay value={r.iban} />,
      onCell: (record) => ({ onDoubleClick: () => startEdit(record) }),
    },
    {
      title: "Корр. счёт",
      dataIndex: "correspondent_account",
      width: 160,
      render: (_, r) =>
        isEditing(r) ? renderInput("correspondent_account") : <ValueDisplay value={r.correspondent_account} />,
      onCell: (record) => ({ onDoubleClick: () => startEdit(record) }),
    },
    {
      title: "Валюта",
      dataIndex: "currency",
      width: 120,
      render: (_, r) =>
        isEditing(r) ? renderCurrencySelect() : <ValueDisplay value={r.currency} />,
      onCell: (record) => ({ onDoubleClick: () => startEdit(record) }),
    },
    {
      title: "Расч. счёт",
      dataIndex: "account_number",
      width: 200,
      render: (_, r) =>
        isEditing(r) ? renderInput("account_number") : <ValueDisplay value={r.account_number} />,
      onCell: (record) => ({ onDoubleClick: () => startEdit(record) }),
    },
    {
      title: "Адрес банка",
      dataIndex: "bank_address",
      render: (_, r) =>
        isEditing(r) ? renderInput("bank_address") : <ValueDisplay value={r.bank_address} />,
      onCell: (record) => ({ onDoubleClick: () => startEdit(record) }),
    },
    {
      title: "Доп. инфо",
      dataIndex: "additional_info",
      render: (_, r) =>
        isEditing(r) ? renderInput("additional_info") : <ValueDisplay value={r.additional_info} />,
      onCell: (record) => ({ onDoubleClick: () => startEdit(record) }),
    },
    {
      title: "Статус",
      dataIndex: "is_primary_for_currency",
      width: 220,
      render: (_, r) =>
        isEditing(r) ? (
          <Checkbox
            checked={!!(editedRow?.is_primary_for_currency ?? r.is_primary_for_currency)}
            onChange={(e) => setEditedRow((p) => ({ ...p, is_primary_for_currency: e.target.checked }))}
          >
            Основной для {editedRow?.currency ?? r.currency ?? "—"}
          </Checkbox>
        ) : r.is_primary_for_currency ? (
          <Tag color="green">Основной для {r.currency}</Tag>
        ) : (
          <Tag>Обычный</Tag>
        ),
      onCell: (record) => ({ onDoubleClick: () => startEdit(record) }),
    },
    {
      title: "Действия",
      key: "actions",
      width: 140,
      render: (_, r) => {
        const editing = isEditing(r)
        return (
          <ActionButtons
            onSave={editing ? saveEdit : undefined}
            onCancel={editing ? cancelEdit : undefined}
            onDelete={!editing ? () => deleteRow(r) : undefined}
            confirmDelete={false}
            size="small"
          />
        )
      },
    },
  ]

  return (
    <Table
      rowKey="id"
      className="op-table parts-table"
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={false}
      size="small"
    />
  )
}
