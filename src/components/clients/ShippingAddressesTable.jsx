import React, { useEffect, useState } from "react"
import { Table, Input, Button, Popconfirm, Tooltip, Space, message } from "antd"
import { DeleteOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"
import PlaceAddressInput from "@/components/inputs/PlaceAddressInput"

export default function ShippingAddressesTable({ clientId }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editedRow, setEditedRow] = useState({})
  const [newRow, setNewRow] = useState(null)

  const fetchData = async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const res = await axios.get("/client_shipping_addresses", {
        params: { client_id: clientId }
      })
      setData(res.data || [])
    } catch (err) {
      console.error("Ошибка загрузки адресов доставки:", err)
      message.error("Не удалось загрузить адреса доставки")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [clientId])

  const handleSave = async (row) => {
    try {
      if (!row.formatted_address) {
        message.warning("Не заполнен адрес")
        return
      }

      if (!row.id) {
        const res = await axios.post("/client_shipping_addresses", {
          ...row,
          client_id: clientId
        })
        setData(prev => [{ ...row, id: res.data.id }, ...prev])
        setNewRow(null)
      } else {
        await axios.put(`/client_shipping_addresses/${row.id}`, row)
        setData(prev => prev.map(r => (r.id === row.id ? row : r)))
        setEditingId(null)
      }
    } catch (err) {
      console.error("Ошибка сохранения:", err)
      message.error("Не удалось сохранить адрес")
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirmAction("Удалить адрес?")
    if (!ok) return
    try {
      await axios.delete(`/client_shipping_addresses/${id}`)
      setData(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      console.error("Ошибка удаления:", err)
      message.error("Не удалось удалить адрес")
    }
  }

  const columns = [
    {
      title: "Адрес доставки",
      dataIndex: "formatted_address",
      render: (_, record) =>
        (editingId === record.id || record.id === undefined) ? (
          <PlaceAddressInput
            value={record.formatted_address}
            onChange={(val) =>
              record.id
                ? setEditedRow(prev => ({ ...prev, ...val }))
                : setNewRow(prev => ({ ...prev, ...val }))
            }
          />
        ) : (
          record.formatted_address
        )
    },
    {
      title: "Метка",
      dataIndex: "label",
      render: (_, record) =>
        (editingId === record.id || record.id === undefined) ? (
          <Input
            value={record.label}
            onChange={(e) => {
              const val = e.target.value
              record.id
                ? setEditedRow(prev => ({ ...prev, label: val }))
                : setNewRow(prev => ({ ...prev, label: val }))
            }}
          />
        ) : (
          record.label
        )
    },
    {
      title: "Комментарий",
      dataIndex: "comment",
      render: (_, record) =>
        (editingId === record.id || record.id === undefined) ? (
          <Input
            value={record.comment}
            onChange={(e) => {
              const val = e.target.value
              record.id
                ? setEditedRow(prev => ({ ...prev, comment: val }))
                : setNewRow(prev => ({ ...prev, comment: val }))
            }}
          />
        ) : (
          record.comment
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
                <Button type="link" onClick={() => handleSave(isNew ? newRow : editedRow)}>
                  Сохранить
                </Button>
                <Button
                  type="link"
                  onClick={() => {
                    isNew ? setNewRow(null) : setEditingId(null)
                  }}
                >
                  Отмена
                </Button>
              </>
            ) : (
              <>
                <Button type="link" onClick={() => {
                  setEditedRow(record)
                  setEditingId(record.id)
                }}>
                  ✏️
                </Button>
                <Popconfirm
                  title="Удалить адрес?"
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
