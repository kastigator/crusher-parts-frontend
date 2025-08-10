// src/components/clients/BillingAddressesTable.jsx
import React, { useState } from "react"
import { Table, Input, message, Typography, Row, Col, Divider, Space, Tooltip, Button } from "antd"
import axios from "@/api/axiosInstance"
import PlaceAddressInput from "@/components/inputs/PlaceAddressInput"
import ValueDisplay from "@/components/common/ValueDisplay"
import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"
import { CopyOutlined } from "@ant-design/icons"

const { Text } = Typography

// Единственный форматированный вывод адреса
const formatFullAddress = (r = {}) => {
  const parts = [
    r.country,
    r.region,
    r.city,
    r.street && `ул. ${r.street}`,
    r.house && `д. ${r.house}`,
    r.building && `стр. ${r.building}`,
    r.entrance && `подъезд ${r.entrance}`,
    r.postal_code && `инд. ${r.postal_code}`,
  ].filter(Boolean)
  return parts.join(", ")
}

export default function BillingAddressesTable({ clientId, data = [], loading, reloadData }) {
  const [editingId, setEditingId] = useState(null)
  const [editedRow, setEditedRow] = useState(null)

  const isEditing = (record) => editingId !== null && record?.id === editingId

  const cancelEdit = () => {
    setEditingId(null)
    setEditedRow(null)
  }

  // --- SAVE c авто‑ретраем при 409 -----------------------------------------
  const doPut = (id, payload) => axios.put(`/client-billing-addresses/${id}`, payload)

  const handleSave = async (row) => {
    if (!clientId || !row) return
    if (!row.formatted_address?.trim()) {
      message.warning("Поле 'Адрес' обязательно")
      return
    }

    const payload = {
      formatted_address: row.formatted_address.trim(),
      place_id: row.place_id || null,
      lat: row.lat ?? null,
      lng: row.lng ?? null,
      postal_code: row.postal_code || null,
      country: row.country || null,
      region: row.region || null,
      city: row.city || null,
      street: row.street || null,
      house: row.house || null,
      building: row.building || null,
      entrance: row.entrance || null,
      comment: row.comment?.trim() || null,
      version: row.version, // оптимистическая блокировка
    }

    try {
      await doPut(row.id, payload)
      message.success("Адрес обновлён")
      cancelEdit()
      await reloadData?.()
    } catch (err) {
      // Автоматическое примирение версии и один повтор
      if (err?.response?.status === 409 && err.response.data?.current) {
        const current = err.response.data.current
        try {
          await doPut(row.id, { ...payload, version: current.version })
          message.success("Адрес обновлён")
          cancelEdit()
          await reloadData?.()
          return
        } catch (e2) {
          console.error("Повтор после 409 не удался:", e2)
          message.error("Конфликт версий: запись изменилась. Обновите список.")
        }
      } else {
        console.error("Ошибка при обновлении:", err)
        message.error("Не удалось сохранить адрес")
      }
    }
  }

  const deleteRow = async (record) => {
    const { confirmed } = await confirmAction("Удалить адрес?")
    if (!confirmed) return
    try {
      await axios.delete(`/client-billing-addresses/${record.id}`, {
        params: { version: record.version },
      })
      message.success("Адрес удалён")
      await reloadData?.()
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
      title: "Адрес",
      dataIndex: "formatted_address",
      render: (_, record) => {
        const editing = isEditing(record)

        if (editing && editedRow) {
          return (
            <>
              <PlaceAddressInput
                debugId={`table-row-${record.id}`}
                value={{
                  address_line: editedRow.formatted_address,
                  lat: editedRow.lat,
                  lng: editedRow.lng,
                  place_id: editedRow.place_id,
                  postal_code: editedRow.postal_code,
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
                    entrance: val.entrance,
                  }))
                }
              />

              <Divider style={{ margin: "8px 0" }} />

              <Row gutter={8}>
                <Col span={6}>
                  <Input
                    placeholder="Страна"
                    value={editedRow.country}
                    onChange={(e) => setEditedRow((p) => ({ ...p, country: e.target.value }))}
                  />
                </Col>
                <Col span={6}>
                  <Input
                    placeholder="Регион"
                    value={editedRow.region}
                    onChange={(e) => setEditedRow((p) => ({ ...p, region: e.target.value }))}
                  />
                </Col>
                <Col span={6}>
                  <Input
                    placeholder="Город"
                    value={editedRow.city}
                    onChange={(e) => setEditedRow((p) => ({ ...p, city: e.target.value }))}
                  />
                </Col>
                <Col span={6}>
                  <Input
                    placeholder="Индекс"
                    value={editedRow.postal_code}
                    onChange={(e) => setEditedRow((p) => ({ ...p, postal_code: e.target.value }))}
                  />
                </Col>
              </Row>

              <Row gutter={8} style={{ marginTop: 8 }}>
                <Col span={8}>
                  <Input
                    placeholder="Улица"
                    value={editedRow.street}
                    onChange={(e) => setEditedRow((p) => ({ ...p, street: e.target.value }))}
                  />
                </Col>
                <Col span={4}>
                  <Input
                    placeholder="Дом"
                    value={editedRow.house}
                    onChange={(e) => setEditedRow((p) => ({ ...p, house: e.target.value }))}
                  />
                </Col>
                <Col span={6}>
                  <Input
                    placeholder="Строение"
                    value={editedRow.building}
                    onChange={(e) => setEditedRow((p) => ({ ...p, building: e.target.value }))}
                  />
                </Col>
                <Col span={6}>
                  <Input
                    placeholder="Подъезд"
                    value={editedRow.entrance}
                    onChange={(e) => setEditedRow((p) => ({ ...p, entrance: e.target.value }))}
                  />
                </Col>
              </Row>

              <Row style={{ marginTop: 8 }}>
                <Col span={24}>
                  <Input.TextArea
                    placeholder="Комментарий"
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    value={editedRow.comment}
                    onChange={(e) => setEditedRow((p) => ({ ...p, comment: e.target.value }))}
                  />
                </Col>
              </Row>
            </>
          )
        }

        const headline = record.formatted_address || "—"
        const line2 = formatFullAddress(record)
        return (
          <div
            onDoubleClick={() => {
              setEditingId(record.id)
              setEditedRow({ ...record })
            }}
          >
            <div style={{ fontWeight: 600 }}>
              <ValueDisplay value={headline} />
            </div>
            <div style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
              {line2 || "—"}
            </div>
            {record.comment && (
              <div style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
                Комментарий: {record.comment}
                <Space size={6} style={{ marginLeft: 8 }}>
                  <Tooltip title="Скопировать адрес">
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => navigator.clipboard.writeText(`${headline}. ${line2}`)}
                    />
                  </Tooltip>
                </Space>
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
