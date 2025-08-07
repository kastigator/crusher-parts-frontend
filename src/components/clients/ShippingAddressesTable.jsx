import React, { useState } from "react"
import { Table, Input, Button, Space, Typography, message, Row, Col, Divider } from "antd"
import { DeleteOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"
import PlaceAddressInput from "@/components/inputs/PlaceAddressInput"
import ValueDisplay from "@/components/common/ValueDisplay"
import logActivity from "@/utils/logActivity"
import logFieldDiffs from "@/utils/logFieldDiffs"

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

      await logFieldDiffs({
        oldData: row,
        newData: payload,
        entity_type: "client_shipping_addresses",
        entity_id: row.id
      })

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
      await logActivity("delete", "client_shipping_addresses", id)
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
                <Col span={4}>
                  <Input
                    placeholder="Строение"
                    value={editedRow.building}
                    onChange={(e) =>
                      setEditedRow((prev) => ({ ...prev, building: e.target.value }))
                    }
                  />
                </Col>
                <Col span={4}>
                  <Input
                    placeholder="Подъезд"
                    value={editedRow.entrance}
                    onChange={(e) =>
                      setEditedRow((prev) => ({ ...prev, entrance: e.target.value }))
                    }
                  />
                </Col>
              </Row>

              <Input.TextArea
                style={{ marginTop: 8 }}
                placeholder="Комментарий"
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
            </>
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
        isEditing(record) && editedRow ? null : (
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
      style={{ width: "100%" }}
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
