// src/components/clients/ShippingAddressesTable.jsx
import React, { useState } from "react"
import { Table, Input, Typography, message, Row, Col, Divider } from "antd"
import axios from "@/api/axiosInstance"
import PlaceAddressInput from "@/components/inputs/PlaceAddressInput"
import ValueDisplay from "@/components/common/ValueDisplay"
import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"

const { Text } = Typography

export default function ShippingAddressesTable({ clientId, data = [], loading, reloadData }) {
  const [editingId, setEditingId] = useState(null)
  const [editedRow, setEditedRow] = useState(null)

  const isEditing = (record) => editingId !== null && record?.id === editingId

  const cancelEdit = () => {
    setEditingId(null)
    setEditedRow(null)
  }

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
      comment: row.comment?.trim() || null,
      version: row.version, // обязателен
    }

    try {
      await axios.put(`/client-shipping-addresses/${row.id}`, payload)
      message.success("Адрес обновлён")
      cancelEdit()
      reloadData()
    } catch (err) {
      console.error("Ошибка при обновлении:", err)
      if (err?.response?.status === 409) {
        message.error("Конфликт версий: запись изменилась. Обновите список.")
      } else {
        message.error("Не удалось сохранить адрес")
      }
    }
  }

  const deleteRow = async (record) => {
    const { confirmed } = await confirmAction("Удалить адрес?")
    if (!confirmed) return
    try {
      await axios.delete(`/client-shipping-addresses/${record.id}`, {
        params: { version: record.version }
      })
      message.success("Адрес удалён")
      reloadData()
    } catch (err) {
      console.error("Ошибка при удалении адреса:", err)
      if (err?.response?.status === 409) {
        message.error("Конфликт версий: запись изменилась. Обновите список.")
      } else {
        message.error("Не удалось удалить адрес")
      }
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
            <>
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

              <Divider style={{ margin: "8px 0" }} />

              <Row gutter={8}>
                <Col span={6}>
                  <Input
                    placeholder="Страна"
                    value={editedRow.country}
                    onChange={(e) =>
                      setEditedRow((prev) => ({ ...prev, country: e.target.value }))
                    }
                  />
                </Col>
                <Col span={6}>
                  <Input
                    placeholder="Регион"
                    value={editedRow.region}
                    onChange={(e) =>
                      setEditedRow((prev) => ({ ...prev, region: e.target.value }))
                    }
                  />
                </Col>
                <Col span={6}>
                  <Input
                    placeholder="Город"
                    value={editedRow.city}
                    onChange={(e) =>
                      setEditedRow((prev) => ({ ...prev, city: e.target.value }))
                    }
                  />
                </Col>
                <Col span={6}>
                  <Input
                    placeholder="Индекс"
                    value={editedRow.postal_code}
                    onChange={(e) =>
                      setEditedRow((prev) => ({ ...prev, postal_code: e.target.value }))
                    }
                  />
                </Col>
              </Row>

              <Row gutter={8} style={{ marginTop: 8 }}>
                <Col span={8}>
                  <Input
                    placeholder="Улица"
                    value={editedRow.street}
                    onChange={(e) =>
                      setEditedRow((prev) => ({ ...prev, street: e.target.value }))
                    }
                  />
                </Col>
                <Col span={4}>
                  <Input
                    placeholder="Дом"
                    value={editedRow.house}
                    onChange={(e) =>
                      setEditedRow((prev) => ({ ...prev, house: e.target.value }))
                    }
                  />
                </Col>
                <Col span={6}>
                  <Input
                    placeholder="Строение"
                    value={editedRow.building}
                    onChange={(e) =>
                      setEditedRow((prev) => ({ ...prev, building: e.target.value }))
                    }
                  />
                </Col>
                <Col span={6}>
                  <Input
                    placeholder="Подъезд"
                    value={editedRow.entrance}
                    onChange={(e) =>
                      setEditedRow((prev) => ({ ...prev, entrance: e.target.value }))
                    }
                  />
                </Col>
              </Row>
            </>
          )
        }

        return (
          <div onDoubleClick={() => { setEditingId(record.id); setEditedRow({ ...record }) }}>
            <ValueDisplay value={record.formatted_address} />
            {record.comment && (
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Комментарий: {record.comment}</Text>
              </div>
            )}
          </div>
        )
      },
    },
    {
      title: "Действия",
      dataIndex: "actions",
      width: 140,
      render: (_, record) => {
        const editing = isEditing(record)
        return (
          <ActionButtons
            onSave={editing ? () => handleSave(editedRow) : undefined}
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
