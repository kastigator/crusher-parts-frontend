// src/components/clients/ShippingAddressesTable.jsx

import React, { useEffect, useState } from "react"
import { Table, Input, Button, Popconfirm, Space, Typography, message } from "antd"
import { DeleteOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"
import PlaceAddressInput from "@/components/inputs/PlaceAddressInput"

const { Text } = Typography

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
      const res = await axios.get("/client-shipping-addresses", {
        params: { client_id: clientId }
      })
      setData(Array.isArray(res.data) ? res.data : [])
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
    if (!clientId) return
    if (!row.formatted_address?.trim()) {
      message.warning("Поле 'Адрес' обязательно")
      return
    }

    const payload = {
      client_id: clientId,
      formatted_address: row.formatted_address.trim(),
      place_id: row.place_id || null,
      lat: row.lat || null,
      lng: row.lng || null,
      postal_code: row.postal_code || null,
      label: row.label?.trim() || null,
      comment: row.comment?.trim() || null
    }

    try {
      if (!row.id) {
        const res = await axios.post("/client-shipping-addresses", payload)
        setData(prev => [res.data, ...prev])
        setNewRow(null)
      } else {
        await axios.put(`/client-shipping-addresses/${row.id}`, payload)
        setData(prev => prev.map(r => (r.id === row.id ? { ...r, ...payload } : r)))
        setEditingId(null)
      }
    } catch (err) {
      console.error("Ошибка при сохранении:", err)
      message.error("Не удалось сохранить адрес")
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirmAction("Удалить адрес?")
    if (!ok) return
    try {
      await axios.delete(`/client-shipping-addresses/${id}`)
      setData(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      console.error("Ошибка при удалении адреса:", err)
      message.error("Не удалось удалить адрес")
    }
  }

  const columns = [
    {
      title: "Адрес доставки",
      dataIndex: "formatted_address",
      render: (_, record) => {
        const isEditing = editingId === record.id || record.id === undefined
        const val = isEditing
          ? record.id
            ? editedRow
            : newRow
          : record

        return isEditing ? (
          <PlaceAddressInput
            value={val}
            onChange={(updated) =>
              record.id
                ? setEditedRow(prev => ({ ...prev, ...updated }))
                : setNewRow(prev => ({ ...prev, ...updated }))
            }
            label=""
            required
          />
        ) : (
          <Text type={!record.place_id ? "danger" : undefined}>
            {record.formatted_address || <i>не указано</i>}
          </Text>
        )
      }
    },
    {
      title: "Метка",
      dataIndex: "label",
      render: (_, record) => {
        const isEditing = editingId === record.id || record.id === undefined
        const value = isEditing
          ? record.id ? editedRow?.label : newRow?.label
          : record.label

        return isEditing ? (
          <Input
            value={value}
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
      }
    },
    {
      title: "Комментарий",
      dataIndex: "comment",
      render: (_, record) => {
        const isEditing = editingId === record.id || record.id === undefined
        const value = isEditing
          ? record.id ? editedRow?.comment : newRow?.comment
          : record.comment

        return isEditing ? (
          <Input
            value={value}
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
      }
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
                  onClick={() => (isNew ? setNewRow(null) : setEditingId(null))}
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
      rowKey={(record) => record.id ?? "new"}
      columns={columns}
      dataSource={mergedData}
      loading={loading}
      pagination={false}
      size="small"
    />
  )
}
