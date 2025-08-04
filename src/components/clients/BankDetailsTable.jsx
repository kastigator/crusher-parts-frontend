// src/components/clients/BankDetailsTable.jsx

import React, { useState } from "react"
import { Table, Input, Select, Space, Button, message } from "antd"
import { DeleteOutlined, CloseOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"
import ValueDisplay from "@/components/common/ValueDisplay"

const { Option } = Select
const currencyOptions = ["RUB", "USD", "EUR", "CNY"]

export default function BankDetailsTable({ data, loading, clientId, setData }) {
  const [editingId, setEditingId] = useState(null)
  const [editedRow, setEditedRow] = useState({})

  const isEditing = (record) => record.id === editingId

  const cancelEdit = () => {
    setEditingId(null)
    setEditedRow({})
  }

  const saveEdit = async (record) => {
    try {
      await axios.put(`/client-bank-details/${record.id}`, editedRow)
      setData((prev) =>
        prev.map((r) => (r.id === record.id ? { ...r, ...editedRow } : r))
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
      value={editedRow?.[field]}
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
    <Select
      value={editedRow.currency || record.currency}
      onChange={(val) =>
        setEditedRow((prev) => ({ ...prev, currency: val }))
      }
      size="small"
      style={{ width: 80 }}
    >
      {currencyOptions.map((cur) => (
        <Option key={cur} value={cur}>
          {cur}
        </Option>
      ))}
    </Select>
  )

  const columns = [
    {
      title: "Банк",
      dataIndex: "bank_name",
      render: (_, record) =>
        isEditing(record)
          ? renderInput("bank_name", record)
          : <ValueDisplay value={record.bank_name} />,
      onCell: (record) => ({
        onDoubleClick: () => {
          setEditingId(record.id)
          setEditedRow(record)
        }
      })
    },
    {
      title: "BIC",
      dataIndex: "bic",
      render: (_, record) =>
        isEditing(record)
          ? renderInput("bic", record)
          : <ValueDisplay value={record.bic} />,
      onCell: (record) => ({
        onDoubleClick: () => {
          setEditingId(record.id)
          setEditedRow(record)
        }
      })
    },
    {
      title: "Кор. счёт",
      dataIndex: "correspondent_account",
      render: (_, record) =>
        isEditing(record)
          ? renderInput("correspondent_account", record)
          : <ValueDisplay value={record.correspondent_account} />,
      onCell: (record) => ({
        onDoubleClick: () => {
          setEditingId(record.id)
          setEditedRow(record)
        }
      })
    },
    {
      title: "Валюта",
      dataIndex: "currency",
      render: (_, record) =>
        isEditing(record)
          ? renderCurrencySelect(record)
          : <ValueDisplay value={record.currency} />,
      onCell: (record) => ({
        onDoubleClick: () => {
          setEditingId(record.id)
          setEditedRow(record)
        }
      })
    },
    {
      title: "Расч. счёт",
      dataIndex: "account_number",
      render: (_, record) =>
        isEditing(record)
          ? renderInput("account_number", record)
          : <ValueDisplay value={record.account_number} />,
      onCell: (record) => ({
        onDoubleClick: () => {
          setEditingId(record.id)
          setEditedRow(record)
        }
      })
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
