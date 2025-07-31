import React, { useEffect, useState } from "react"
import { Table, Input, Button, Popconfirm, Tooltip, Space, message } from "antd"
import { DeleteOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import fetchBankByBic from "@/utils/fetchBankByBic"
import confirmAction from "@/utils/confirmAction"

export default function BankDetailsTable({ clientId }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editedRow, setEditedRow] = useState({})
  const [newRow, setNewRow] = useState(null)

  const fetchData = async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const res = await axios.get("/client_bank_details", {
        params: { client_id: clientId }
      })
      setData(res.data || [])
    } catch (err) {
      console.error("Ошибка при загрузке банковских реквизитов:", err)
      message.error("Не удалось загрузить банковские реквизиты")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [clientId])

  const handleSave = async (row) => {
    try {
      if (!row.bank_name || !row.bic || !row.checking_account) {
        message.warning("Поля 'Банк', 'BIC', 'Расч. счёт' обязательны")
        return
      }

      if (!row.id) {
        const res = await axios.post("/client_bank_details", {
          ...row,
          client_id: clientId
        })
        setData(prev => [{ ...row, id: res.data.id }, ...prev])
        setNewRow(null)
      } else {
        await axios.put(`/client_bank_details/${row.id}`, row)
        setData(prev => prev.map(r => (r.id === row.id ? row : r)))
        setEditingId(null)
      }
    } catch (err) {
      console.error("Ошибка при сохранении:", err)
      message.error("Не удалось сохранить реквизиты")
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirmAction("Удалить реквизиты?")
    if (!ok) return
    try {
      await axios.delete(`/client_bank_details/${id}`)
      setData(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      console.error("Ошибка при удалении:", err)
      message.error("Не удалось удалить реквизиты")
    }
  }

  const handleBicLookup = async (value, isNew) => {
    if (value.length !== 9) return
    const data = await fetchBankByBic(value)
    if (!data) return
    const updates = {
      bank_name: data.name,
      correspondent_account: data.corr_account
    }

    if (isNew) {
      setNewRow(prev => ({ ...prev, ...updates }))
    } else {
      setEditedRow(prev => ({ ...prev, ...updates }))
    }
  }

  const columns = [
    {
      title: "Банк",
      dataIndex: "bank_name",
      render: (_, record) =>
        (editingId === record.id || record.id === undefined) ? (
          <Input
            value={
              record.id === undefined ? newRow?.bank_name : editedRow?.bank_name
            }
            onChange={(e) => {
              const val = e.target.value
              record.id
                ? setEditedRow((prev) => ({ ...prev, bank_name: val }))
                : setNewRow((prev) => ({ ...prev, bank_name: val }))
            }}
          />
        ) : (
          record.bank_name
        )
    },
    {
      title: "BIC",
      dataIndex: "bic",
      render: (_, record) =>
        (editingId === record.id || record.id === undefined) ? (
          <Input
            value={record.id === undefined ? newRow?.bic : editedRow?.bic}
            onChange={(e) => {
              const val = e.target.value
              if (record.id) {
                setEditedRow((prev) => ({ ...prev, bic: val }))
                if (val.length === 9) handleBicLookup(val, false)
              } else {
                setNewRow((prev) => ({ ...prev, bic: val }))
                if (val.length === 9) handleBicLookup(val, true)
              }
            }}
          />
        ) : (
          record.bic
        )
    },
    {
      title: "Кор. счёт",
      dataIndex: "correspondent_account",
      render: (_, record) =>
        (editingId === record.id || record.id === undefined) ? (
          <Input
            value={
              record.id === undefined
                ? newRow?.correspondent_account
                : editedRow?.correspondent_account
            }
            onChange={(e) => {
              const val = e.target.value
              record.id
                ? setEditedRow((prev) => ({ ...prev, correspondent_account: val }))
                : setNewRow((prev) => ({ ...prev, correspondent_account: val }))
            }}
          />
        ) : (
          record.correspondent_account
        )
    },
    {
      title: "Расч. счёт",
      dataIndex: "checking_account",
      render: (_, record) =>
        (editingId === record.id || record.id === undefined) ? (
          <Input
            value={
              record.id === undefined
                ? newRow?.checking_account
                : editedRow?.checking_account
            }
            onChange={(e) => {
              const val = e.target.value
              record.id
                ? setEditedRow((prev) => ({ ...prev, checking_account: val }))
                : setNewRow((prev) => ({ ...prev, checking_account: val }))
            }}
          />
        ) : (
          record.checking_account
        )
    },
    {
      title: "Действия",
      dataIndex: "actions",
      width: 120,
      render: (_, record) => {
        const isEditing = editingId === record.id
        const isNew = record.id === undefined

        return (
          <Space>
            {(isEditing || isNew) ? (
              <>
                <Button
                  type="link"
                  onClick={() => handleSave(isNew ? newRow : editedRow)}
                >
                  Сохранить
                </Button>
                <Button
                  type="link"
                  onClick={() =>
                    isNew ? setNewRow(null) : setEditingId(null)
                  }
                >
                  Отмена
                </Button>
              </>
            ) : (
              <>
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
              </>
            )}
          </Space>
        )
      }
    }
  ]

  const mergedData = newRow ? [newRow, ...data] : data

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={mergedData}
      loading={loading}
      pagination={false}
      size="small"
    />
  )
}
