// src/components/clients/BankDetailsTable.jsx

import React, { useState } from "react"
import { Table, Input, Button, Popconfirm, Space, message, Form } from "antd"
import { DeleteOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"

export default function BankDetailsTable({ data, loading, clientId, setData }) {
  const [editingId, setEditingId] = useState(null)
  const [editedRow, setEditedRow] = useState({})
  const [newBank, setNewBank] = useState({
    bic: "",
    bank_name: "",
    correspondent_account: "",
    account_number: ""
  })

  const isEditing = (record) => record.id === editingId

  const saveEdit = async (record) => {
    try {
      await axios.put(`/client-bank-details/${record.id}`, editedRow)
      setEditingId(null)
      const updated = data.map((r) =>
        r.id === record.id ? { ...r, ...editedRow } : r
      )
      setData(updated)
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
    } catch (err) {
      console.error("Ошибка удаления:", err)
      message.error("Не удалось удалить")
    }
  }

  const handleAdd = async () => {
    if (!clientId || !newBank.account_number.trim()) {
      message.warning("Номер счёта обязателен")
      return
    }

    try {
      const res = await axios.post("/client-bank-details", {
        ...newBank,
        client_id: clientId
      })
      setData((prev) => [res.data, ...prev])
      setNewBank({
        bic: "",
        bank_name: "",
        correspondent_account: "",
        account_number: ""
      })
    } catch (err) {
      console.error("Ошибка добавления реквизитов:", err)
      message.error("Не удалось добавить")
    }
  }

  const renderInput = (field, record) => {
    const value = editedRow?.[field]
    return (
      <Input
        value={value}
        onChange={(e) => setEditedRow((prev) => ({ ...prev, [field]: e.target.value }))}
        onKeyDown={(e) => {
          if (e.key === "Enter") saveEdit(record)
          if (e.key === "Escape") setEditingId(null)
        }}
      />
    )
  }

  const columns = [
    {
      title: "Банк",
      dataIndex: "bank_name",
      render: (_, record) =>
        isEditing(record) ? renderInput("bank_name", record) : record.bank_name
    },
    {
      title: "BIC",
      dataIndex: "bic",
      render: (_, record) =>
        isEditing(record) ? renderInput("bic", record) : record.bic
    },
    {
      title: "Кор. счёт",
      dataIndex: "correspondent_account",
      render: (_, record) =>
        isEditing(record)
          ? renderInput("correspondent_account", record)
          : record.correspondent_account
    },
    {
      title: "Расч. счёт",
      dataIndex: "account_number",
      render: (_, record) =>
        isEditing(record)
          ? renderInput("account_number", record)
          : record.account_number
    },
    {
      title: "Действия",
      dataIndex: "actions",
      width: 120,
      render: (_, record) =>
        isEditing(record) ? (
          <Space>
            <Button type="link" onClick={() => saveEdit(record)}>
              Сохранить
            </Button>
            <Button type="link" onClick={() => setEditingId(null)}>
              Отмена
            </Button>
          </Space>
        ) : (
          <Space>
            <Button
              type="link"
              onClick={() => {
                setEditedRow(record)
                setEditingId(record.id)
              }}
            >
              ✏️
            </Button>
            <Popconfirm
              title="Удалить реквизиты?"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button danger type="link" icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        )
    }
  ]

  return (
    <>
      <Form layout="inline" style={{ marginBottom: 16 }} onFinish={handleAdd}>
        <Form.Item label="BIC">
          <Input
            value={newBank.bic}
            onChange={(e) => setNewBank((prev) => ({ ...prev, bic: e.target.value }))}
            placeholder="BIC"
          />
        </Form.Item>
        <Form.Item label="Банк">
          <Input
            value={newBank.bank_name}
            onChange={(e) => setNewBank((prev) => ({ ...prev, bank_name: e.target.value }))}
            placeholder="Название банка"
          />
        </Form.Item>
        <Form.Item label="Кор. счёт">
          <Input
            value={newBank.correspondent_account}
            onChange={(e) =>
              setNewBank((prev) => ({ ...prev, correspondent_account: e.target.value }))
            }
            placeholder="Кор. счёт"
          />
        </Form.Item>
        <Form.Item label="Расч. счёт" required>
          <Input
            value={newBank.account_number}
            onChange={(e) =>
              setNewBank((prev) => ({ ...prev, account_number: e.target.value }))
            }
            placeholder="Расчётный счёт"
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            Добавить
          </Button>
        </Form.Item>
      </Form>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={false}
        size="small"
      />
    </>
  )
}
