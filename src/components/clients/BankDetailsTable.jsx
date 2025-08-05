import React, { useState } from "react"
import { Table, Input, Button, message } from "antd"
import { CloseOutlined, DeleteOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"
import ValueDisplay from "@/components/common/ValueDisplay"
import { Autocomplete, TextField } from "@mui/material"

const currencyOptions = ["RUB", "USD", "EUR", "CNY"]

export default function BankDetailsTable({ data, loading, clientId, setData }) {
  const [editingId, setEditingId] = useState(null)
  const [editedRow, setEditedRow] = useState({})

  const isEditing = (record) => editingId === record.id

  const cancelEdit = () => {
    setEditingId(null)
    setEditedRow({})
  }

  const saveEdit = async (record) => {
    try {
      const payload = {
        ...editedRow
      }
      await axios.put(`/client-bank-details/${record.id}`, payload)
      setData((prev) =>
        prev.map((r) => (r.id === record.id ? { ...r, ...payload } : r))
      )
      message.success("Изменения сохранены")
      cancelEdit()
    } catch (err) {
      console.error("Ошибка при сохранении:", err)
      message.error("Не удалось сохранить изменения")
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirmAction("Удалить реквизиты?")
    if (!ok) return
    try {
      await axios.delete(`/client-bank-details/${id}`)
      setData((prev) => prev.filter((r) => r.id !== id))
      message.success("Реквизиты удалены")
    } catch (err) {
      console.error("Ошибка удаления:", err)
      message.error("Не удалось удалить")
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
    <div style={{ position: "relative", zIndex: 1050 }}>
      <Autocomplete
        options={currencyOptions}
        value={editedRow.currency || record.currency || ""}
        onChange={(_, val) =>
          setEditedRow((prev) => ({ ...prev, currency: val }))
        }
        disableClearable
        size="small"
        autoHighlight
        slotProps={{
          popper: {
            disablePortal: true
          }
        }}
        renderInput={(params) => (
          <TextField {...params} label="Валюта" variant="standard" />
        )}
        sx={{ minWidth: 100 }}
      />
    </div>
  )

  const makeEditable = (record) => {
    setEditingId(record.id)
    setEditedRow(record)
  }

  const columns = [
    {
      title: "Банк",
      dataIndex: "bank_name",
      render: (_, record) =>
        isEditing(record)
          ? renderInput("bank_name", record)
          : <ValueDisplay value={record.bank_name} />,
      onCell: (record) => ({ onDoubleClick: () => makeEditable(record) })
    },
    {
      title: "BIC",
      dataIndex: "bic",
      render: (_, record) =>
        isEditing(record)
          ? renderInput("bic", record)
          : <ValueDisplay value={record.bic} />,
      onCell: (record) => ({ onDoubleClick: () => makeEditable(record) })
    },
    {
      title: "Кор. счёт",
      dataIndex: "correspondent_account",
      render: (_, record) =>
        isEditing(record)
          ? renderInput("correspondent_account", record)
          : <ValueDisplay value={record.correspondent_account} />,
      onCell: (record) => ({ onDoubleClick: () => makeEditable(record) })
    },
    {
      title: "Валюта",
      dataIndex: "currency",
      render: (_, record) =>
        isEditing(record)
          ? renderCurrencySelect(record)
          : <ValueDisplay value={record.currency} />,
      onCell: (record) => ({ onDoubleClick: () => makeEditable(record) })
    },
    {
      title: "Расч. счёт",
      dataIndex: "account_number",
      render: (_, record) =>
        isEditing(record)
          ? renderInput("account_number", record)
          : <ValueDisplay value={record.account_number} />,
      onCell: (record) => ({ onDoubleClick: () => makeEditable(record) })
    },
    {
      title: "Действия",
      dataIndex: "actions",
      width: 80,
      render: (_, record) =>
        isEditing(record) ? (
          <Button
            type="link"
            icon={<CloseOutlined />}
            onClick={cancelEdit}
          />
        ) : (
          <Button
            type="link"
            icon={<DeleteOutlined />}
            danger
            onClick={() => handleDelete(record.id)}
          />
        )
    }
  ]

  return (
    <div style={{ position: "relative" }}>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={false}
        size="small"
      />
    </div>
  )
}
