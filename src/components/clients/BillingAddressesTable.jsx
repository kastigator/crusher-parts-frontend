import React, { useState } from "react"
import { Table, Input, Button, Space, Typography, message } from "antd"
import { DeleteOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"
import PlaceAddressInput from "@/components/inputs/PlaceAddressInput"

const { Text } = Typography

export default function BillingAddressesTable({ clientId, data = [], loading, reloadData }) {
  const [editingId, setEditingId] = useState(null)
  const [editedRow, setEditedRow] = useState({})

  const isEditing = (record) => record.id === editingId

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
      comment: row.comment?.trim() || null
    }

    try {
      await axios.put(`/client-billing-addresses/${row.id}`, payload)
      message.success("Адрес обновлён")
      setEditingId(null)
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
      await axios.delete(`/client-billing-addresses/${id}`)
      message.success("Адрес удалён")
      reloadData()
    } catch (err) {
      console.error("Ошибка при удалении адреса:", err)
      message.error("Не удалось удалить адрес")
    }
  }

  const columns = [
    {
      title: "Юридический адрес",
      dataIndex: "formatted_address",
      render: (_, record) => {
        return isEditing(record) ? (
          <PlaceAddressInput
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
                postal_code: val.postal_code
              }))
            }
          />
        ) : (
          <Text type={!record.place_id ? "danger" : undefined}>
            {record.formatted_address || <i>не указано</i>}
          </Text>
        )
      }
    },
    {
      title: "Комментарий",
      dataIndex: "comment",
      render: (_, record) =>
        isEditing(record) ? (
          <Input
            value={editedRow.comment}
            onChange={(e) =>
              setEditedRow((prev) => ({ ...prev, comment: e.target.value }))
            }
            onPressEnter={() => handleSave(editedRow)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditingId(null)
            }}
          />
        ) : (
          record.comment
        )
    },
    {
      title: "Действия",
      dataIndex: "actions",
      width: 100,
      render: (_, record) =>
        isEditing(record) ? (
          <Space>
            <Button type="link" onClick={() => handleSave(editedRow)}>
              Сохранить
            </Button>
            <Button type="link" onClick={() => setEditingId(null)}>
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
          setEditedRow(record)
          setEditingId(record.id)
        }
      })}
    />
  )
}
