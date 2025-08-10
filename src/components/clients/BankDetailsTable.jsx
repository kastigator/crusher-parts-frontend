// src/components/clients/BankDetailsTable.jsx
import React, { useState } from "react"
import { Table, Input, message } from "antd"
import axios from "@/api/axiosInstance"
import ValueDisplay from "@/components/common/ValueDisplay"
import { Autocomplete, TextField } from "@mui/material"
import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"

const currencyOptions = ["RUB", "USD", "EUR", "CNY"]

export default function BankDetailsTable({ data, loading, clientId, setData }) {
  const [editingId, setEditingId] = useState(null)
  const [editedRow, setEditedRow] = useState({})

  const isEditing = (record) => editingId === record.id

  const makeEditable = (record) => {
    setEditingId(record.id)
    setEditedRow({ ...record })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditedRow({})
  }

  const saveEdit = async (record) => {
    try {
      // Бэкенд требует version
      const payload = { ...editedRow, version: record.version }

      const { data: fresh } = await axios.put(`/client-bank-details/${record.id}`, payload)

      // Обновляем строку свежими данными с бэка (включая новый version)
      setData((prev) => prev.map((r) => (r.id === record.id ? { ...fresh } : r)))

      message.success("Изменения сохранены")
      cancelEdit()
    } catch (err) {
      console.error("Ошибка при сохранении:", err)
      if (err?.response?.status === 409) {
        message.error("Конфликт версий: запись изменилась. Обновите список.")
      } else {
        message.error("Не удалось сохранить изменения")
      }
    }
  }

  const deleteRow = async (record) => {
    const { confirmed } = await confirmAction("Удалить реквизиты?")
    if (!confirmed) return
    try {
      await axios.delete(`/client-bank-details/${record.id}`, {
        params: { version: record.version }
      })
      setData((prev) => prev.filter((r) => r.id !== record.id))
      message.success("Реквизиты удалены")
    } catch (err) {
      console.error("Ошибка удаления:", err)
      if (err?.response?.status === 409) {
        message.error("Конфликт версий: запись изменилась. Обновите список.")
      } else {
        message.error("Не удалось удалить")
      }
    }
  }

  const renderInput = (field, record) => (
    <Input
      value={editedRow?.[field] ?? ""}
      onChange={(e) =>
        setEditedRow((prev) => ({ ...prev, [field]: e.target.value }))
      }
      size="small"
      autoFocus
      onKeyDown={(e) => {
        if (e.key === "Enter") saveEdit(record)
        if (e.key === "Escape") cancelEdit()
      }}
    />
  )

  const renderCurrencySelect = (record) => (
    <Autocomplete
      options={currencyOptions}
      value={editedRow.currency ?? record.currency ?? ""}
      onChange={(_, val) => setEditedRow((prev) => ({ ...prev, currency: val }))}
      disableClearable
      size="small"
      autoHighlight
      slotProps={{ popper: { disablePortal: true } }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Валюта"
          variant="standard"
          InputProps={{ ...params.InputProps, style: { padding: 0 } }}
        />
      )}
      sx={{ minWidth: 100 }}
    />
  )

  const columns = [
    {
      title: "Банк",
      dataIndex: "bank_name",
      render: (_, record) =>
        isEditing(record)
          ? renderInput("bank_name", record)
          : <ValueDisplay value={record.bank_name} />,
      onCell: (record) => ({ onDoubleClick: () => makeEditable(record) }),
    },
    {
      title: "BIC",
      dataIndex: "bic",
      render: (_, record) =>
        isEditing(record)
          ? renderInput("bic", record)
          : <ValueDisplay value={record.bic} />,
      onCell: (record) => ({ onDoubleClick: () => makeEditable(record) }),
    },
    {
      title: "Кор. счёт",
      dataIndex: "correspondent_account",
      render: (_, record) =>
        isEditing(record)
          ? renderInput("correspondent_account", record)
          : <ValueDisplay value={record.correspondent_account} />,
      onCell: (record) => ({ onDoubleClick: () => makeEditable(record) }),
    },
    {
      title: "Валюта",
      dataIndex: "currency",
      render: (_, record) =>
        isEditing(record)
          ? renderCurrencySelect(record)
          : <ValueDisplay value={record.currency} />,
      onCell: (record) => ({ onDoubleClick: () => makeEditable(record) }),
    },
    {
      title: "Расч. счёт",
      dataIndex: "account_number",
      render: (_, record) =>
        isEditing(record)
          ? renderInput("account_number", record)
          : <ValueDisplay value={record.account_number} />,
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
