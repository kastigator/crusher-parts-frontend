import React, { useState } from "react"
import { Table, Input, message, Tag, Checkbox } from "antd"
import axios from "@/api/axiosInstance"
import ValueDisplay from "@/components/common/ValueDisplay"
import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"
import CurrencySelect from "@/components/inputs/CurrencySelect"

export default function SupplierBankDetailsTable({ supplierId, data = [], setData, loading, onChanged }) {
  const [editingId, setEditingId] = useState(null)
  const [editedRow, setEditedRow] = useState({})

  const isEditing = (r) => editingId === r.id
  const makeEditable = (record) => {
    setEditingId(record.id)
    setEditedRow({ ...record, version: record.version })
  }
  const cancelEdit = () => {
    setEditingId(null)
    setEditedRow({})
  }

  const doPut = (id, payload) => axios.put(`/supplier-bank-details/${id}`, payload)

  const saveEdit = async (record) => {
    const payload = {
      bank_name: (editedRow.bank_name ?? record.bank_name)?.trim(),
      account_number: (editedRow.account_number ?? record.account_number)?.trim(),
      iban: (editedRow.iban ?? record.iban) || null,
      bic: (editedRow.bic ?? record.bic) || null,
      currency: (editedRow.currency ?? record.currency)?.toUpperCase().slice(0, 3) || null,
      correspondent_account: (editedRow.correspondent_account ?? record.correspondent_account) || null,
      bank_address: (editedRow.bank_address ?? record.bank_address) || null,
      additional_info: (editedRow.additional_info ?? record.additional_info) || null,
      is_primary_for_currency:
        editedRow.is_primary_for_currency != null
          ? (editedRow.is_primary_for_currency ? 1 : 0)
          : (record.is_primary_for_currency ? 1 : 0),
      version: record.version,
    }

    if (!payload.bank_name || !payload.account_number) {
      message.warning("Укажите банк и расчётный счёт")
      return
    }

    try {
      const { data: fresh } = await doPut(record.id, payload)
      setData((prev) => prev.map((r) => (r.id === record.id ? fresh : r)))
      message.success("Изменения сохранены")
      cancelEdit()
      onChanged?.()
    } catch (err) {
      if (err?.response?.status === 409 && err.response.data?.current) {
        // авто-повтор с актуальной версией
        const current = err.response.data.current
        try {
          const { data: fresh2 } = await doPut(record.id, { ...payload, version: current.version })
          setData((prev) => prev.map((r) => (r.id === record.id ? fresh2 : r)))
          message.success("Изменения сохранены")
          cancelEdit()
          onChanged?.()
          return
        } catch (e2) {
          console.error("Повтор после 409 не удался:", e2)
          message.error("Конфликт версий: запись изменилась. Обновите список.")
        }
      } else {
        console.error("Ошибка сохранения:", err)
        message.error("Не удалось сохранить изменения")
      }
    }
  }

  const deleteRow = async (record) => {
    const { confirmed } = await confirmAction("Удалить реквизиты?")
    if (!confirmed) return
    try {
      await axios.delete(`/supplier-bank-details/${record.id}`)
      setData((prev) => prev.filter((r) => r.id !== record.id))
      message.success("Реквизиты удалены")
      onChanged?.()
    } catch (err) {
      console.error("Ошибка удаления:", err)
      message.error("Не удалось удалить реквизиты")
    }
  }

  const renderInput = (field, type = "text") => (
    <Input
      value={editedRow?.[field] ?? ""}
      type={type}
      onChange={(e) => setEditedRow((p) => ({ ...p, [field]: e.target.value }))}
      size="small"
      autoFocus={field === "bank_name"}
      onKeyDown={(e) => {
        if (e.key === "Enter") saveEdit({ ...editedRow })
        if (e.key === "Escape") cancelEdit()
      }}
    />
  )

  const renderCurrencySelect = (record) => (
    <CurrencySelect
      value={editedRow.currency ?? record.currency ?? ""}
      onChange={(val) => setEditedRow((p) => ({ ...p, currency: val || "" }))}
      TextFieldProps={{ size: "small", label: "Валюта" }}
    />
  )

  const columns = [
    {
      title: "Банк",
      dataIndex: "bank_name",
      render: (_, record) =>
        isEditing(record) ? renderInput("bank_name") : <ValueDisplay value={record.bank_name} />,
      onCell: (record) => ({ onDoubleClick: () => makeEditable(record) }),
    },
    {
      title: "BIC",
      dataIndex: "bic",
      width: 120,
      render: (_, record) =>
        isEditing(record) ? renderInput("bic") : <ValueDisplay value={record.bic} />,
      onCell: (record) => ({ onDoubleClick: () => makeEditable(record) }),
    },
    {
      title: "IBAN",
      dataIndex: "iban",
      width: 180,
      render: (_, record) =>
        isEditing(record) ? renderInput("iban") : <ValueDisplay value={record.iban} />,
      onCell: (record) => ({ onDoubleClick: () => makeEditable(record) }),
    },
    {
      title: "Корр. счёт",
      dataIndex: "correspondent_account",
      width: 160,
      render: (_, record) =>
        isEditing(record)
          ? renderInput("correspondent_account")
          : <ValueDisplay value={record.correspondent_account} />,
      onCell: (record) => ({ onDoubleClick: () => makeEditable(record) }),
    },
    {
      title: "Валюта",
      dataIndex: "currency",
      width: 120,
      render: (_, record) =>
        isEditing(record)
          ? renderCurrencySelect(record)
          : <ValueDisplay value={record.currency} />,
      onCell: (record) => ({ onDoubleClick: () => makeEditable(record) }),
    },
    {
      title: "Расч. счёт",
      dataIndex: "account_number",
      width: 200,
      render: (_, record) =>
        isEditing(record)
          ? renderInput("account_number")
          : <ValueDisplay value={record.account_number} />,
      onCell: (record) => ({ onDoubleClick: () => makeEditable(record) }),
    },
    {
      title: "Адрес банка",
      dataIndex: "bank_address",
      render: (_, record) =>
        isEditing(record) ? renderInput("bank_address") : <ValueDisplay value={record.bank_address} />,
      onCell: (record) => ({ onDoubleClick: () => makeEditable(record) }),
    },
    {
      title: "Доп. инфо",
      dataIndex: "additional_info",
      render: (_, record) =>
        isEditing(record) ? renderInput("additional_info") : <ValueDisplay value={record.additional_info} />,
      onCell: (record) => ({ onDoubleClick: () => makeEditable(record) }),
    },
    {
      title: "Статус",
      dataIndex: "is_primary_for_currency",
      width: 200,
      render: (_, r) =>
        isEditing(r)
          ? (
              <Checkbox
                checked={!!(editedRow?.is_primary_for_currency ?? r.is_primary_for_currency)}
                onChange={(e) =>
                  setEditedRow(p => ({ ...p, is_primary_for_currency: e.target.checked }))
                }
              >
                Основной для {editedRow?.currency ?? r.currency ?? "—"}
              </Checkbox>
            )
          : (r.is_primary_for_currency
              ? <Tag color="green">Основной для {r.currency}</Tag>
              : <Tag>Обычный</Tag>
            ),
      onCell: (record) => ({ onDoubleClick: () => makeEditable(record) }),
    },
    {
      title: "Действия",
      dataIndex: "actions",
      width: 140,
      render: (_, record) => {
        const editing = isEditing(record)
        return (
          <ActionButtons
            onSave={editing ? () => saveEdit(record) : undefined}
            onCancel={editing ? cancelEdit : undefined}
            onDelete={!editing ? () => deleteRow(record) : undefined}
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
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={false}
      size="small"
    />
  )
}
