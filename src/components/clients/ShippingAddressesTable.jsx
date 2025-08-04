// src/components/clients/ShippingAddressesTable.jsx

import React, { useState } from "react"
import { Table, Input, Button, Space, Typography, message } from "antd"
import { DeleteOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"
import PlaceAddressInput from "@/components/inputs/PlaceAddressInput"
import ValueDisplay from "@/components/common/ValueDisplay"

const { Text } = Typography

export default function ShippingAddressesTable({ clientId, data = [], loading, reloadData }) {
  const [editingId, setEditingId] = useState(null)
  const [editedRow, setEditedRow] = useState(null)

  const isEditing = (record) => editingId !== null && record?.id === editingId

  const handleSave = async (row) => {
    if (!clientId) return
    if (!row.formatted_address?.trim()) {
      message.warning("Поле 'Адрес' обязательно")
      return
    }

    const payload = {
      formatted_address: row.formatted_address.trim(),
      place_id: row.place_id || null,
      lat: row.lat || null,
      lng: row.lng || null,
      postal_code: row.postal_code || null,
      country: row.country || null,
      region: row.region || null,
      city: row.city || null,
      street: row.street || null,
      house: row.house || null,
      building: row.building || null,
      entrance: row.entrance || null,
      comment: row.comment?.trim() || null
    }

    try {
      await axios.put(`/client-shipping-addresses/${row.id}`, payload)
      message.success("Адрес обновлён")
      setEditingId(null)
      setEditedRow(null)
      reloadData()
    } catch (err) {
      console.error("Ошибка при обновлении:", err)
      message.error("Не удалось сохранить адрес")
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirmAction("Удалить адрес?")
    if (!ok) return
    try {
      await axios.delete(`/client-shipping-addresses/${id}`)
      message.success("Адрес удалён")
      reloadData()
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
        const editing = isEditing(record)

        if (editing && editedRow) {
          return (
            <PlaceAddressInput
              debugId={`shipping-row-${record.id}`}
              value={{
                address_line: editedRow.formatted_address,
                lat: editedRow.lat,
                lng: editedRow.lng,
                place_id: editedRow.place_id,
                postal_code: editedRow.postal_code
              }}
              onChange={(val) =>
                setEditedRow((prev) => ({
                  ...prev,
                  formatted_address: val.address_line,
                  place_id: val.place_id,
                  lat: val.lat,
                  lng: val.lng,
                  postal_code: val.postal_code,
                  country: val.country,
                  region: val.region,
                  city: val.city,
                  street: val.street,
                  house: val.house,
                  building: val.building,
                  entrance: val.entrance
                }))
              }
            />
          )
        }

        const parts = [
          record.postal_code,
          record.country,
          record.region,
          record.city,
          record.street,
          record.house,
          record.building ? `стр. ${record.building}` : null,
          record.entrance ? `подъезд ${record.entrance}` : null
        ].filter(Boolean)

        return <Text>{parts.length > 0 ? parts.join(", ") : <i>не указано</i>}</Text>
      }
    },
    {
      title: "Комментарий",
      dataIndex: "comment",
      render: (_, record) =>
        isEditing(record) && editedRow ? (
          <Input
            value={editedRow.comment}
            onChange={(e) =>
              setEditedRow((prev) => ({ ...prev, comment: e.target.value }))
            }
            onPressEnter={() => handleSave(editedRow)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setEditingId(null)
                setEditedRow(null)
              }
            }}
          />
        ) : (
          <ValueDisplay value={record.comment} />
        )
    },
    {
      title: "Действия",
      dataIndex: "actions",
      width: 100,
      render: (_, record) =>
        isEditing(record) && editedRow ? (
          <Space>
            <Button type="link" onClick={() => handleSave(editedRow)}>
              Сохранить
            </Button>
            <Button
              type="link"
              onClick={() => {
                setEditingId(null)
                setEditedRow(null)
              }}
            >
              Отмена
            </Button>
          </Space>
        ) : (
          <Button
            danger
            type="link"
            icon={<DeleteOutlined />}
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
      onRow={(record) => ({
        onDoubleClick: () => {
          if (record?.id !== undefined) {
            setEditedRow({ ...record })
            setEditingId(record.id)
          }
        }
      })}
    />
  )
}
