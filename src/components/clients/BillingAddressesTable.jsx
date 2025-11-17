// src/components/clients/BillingAddressesTable.jsx
import React, { useState } from "react"
import { Table, Input, Row, Col, Divider, Space, Tooltip, Button } from "antd"
import { CopyOutlined } from "@ant-design/icons"

import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"

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

export default function BillingAddressesTable({
  data = [],
  loading,
  onUpdate,
  onDelete,
}) {
  const [editingId, setEditingId] = useState(null)
  const [editedRow, setEditedRow] = useState(null)

  const isEditing = (record) => editingId === record.id

  const cancelEdit = () => {
    setEditingId(null)
    setEditedRow(null)
  }

  const handleSave = async () => {
    if (!editedRow?.formatted_address?.trim()) return
    try {
      await onUpdate?.(editingId, { ...editedRow })
      cancelEdit()
    } catch (err) {
      console.error("Ошибка при сохранении адреса:", err)
    }
  }

  const handleDelete = async (record) => {
    const { confirmed } = await confirmAction("Удалить адрес?")
    if (!confirmed) return
    try {
      await onDelete?.(record)
    } catch (err) {
      console.error("Ошибка при удалении адреса:", err)
    }
  }

  const onKey = (e) => {
    if (e.key === "Enter") handleSave()
    if (e.key === "Escape") cancelEdit()
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
              {/* Полный адрес одной строкой (без карты) */}
              <Row className="table-section">
                <Col span={24}>
                  <Input
                    placeholder="Полный адрес"
                    value={editedRow.formatted_address}
                    onChange={(e) =>
                      setEditedRow((p) => ({
                        ...p,
                        formatted_address: e.target.value,
                      }))
                    }
                    onKeyDown={onKey}
                  />
                </Col>
              </Row>

              <Divider style={{ margin: "8px 0" }} />

              <Row gutter={8} className="table-section">
                <Col span={6}>
                  <Input
                    placeholder="Страна"
                    value={editedRow.country}
                    onChange={(e) =>
                      setEditedRow((p) => ({ ...p, country: e.target.value }))
                    }
                    onKeyDown={onKey}
                  />
                </Col>
                <Col span={6}>
                  <Input
                    placeholder="Регион"
                    value={editedRow.region}
                    onChange={(e) =>
                      setEditedRow((p) => ({ ...p, region: e.target.value }))
                    }
                    onKeyDown={onKey}
                  />
                </Col>
                <Col span={6}>
                  <Input
                    placeholder="Город"
                    value={editedRow.city}
                    onChange={(e) =>
                      setEditedRow((p) => ({ ...p, city: e.target.value }))
                    }
                    onKeyDown={onKey}
                  />
                </Col>
                <Col span={6}>
                  <Input
                    placeholder="Индекс"
                    value={editedRow.postal_code}
                    onChange={(e) =>
                      setEditedRow((p) => ({
                        ...p,
                        postal_code: e.target.value,
                      }))
                    }
                    onKeyDown={onKey}
                  />
                </Col>
              </Row>

              <Row gutter={8} className="table-section">
                <Col span={8}>
                  <Input
                    placeholder="Улица"
                    value={editedRow.street}
                    onChange={(e) =>
                      setEditedRow((p) => ({ ...p, street: e.target.value }))
                    }
                    onKeyDown={onKey}
                  />
                </Col>
                <Col span={4}>
                  <Input
                    placeholder="Дом"
                    value={editedRow.house}
                    onChange={(e) =>
                      setEditedRow((p) => ({ ...p, house: e.target.value }))
                    }
                    onKeyDown={onKey}
                  />
                </Col>
                <Col span={6}>
                  <Input
                    placeholder="Строение"
                    value={editedRow.building}
                    onChange={(e) =>
                      setEditedRow((p) => ({ ...p, building: e.target.value }))
                    }
                    onKeyDown={onKey}
                  />
                </Col>
                <Col span={6}>
                  <Input
                    placeholder="Подъезд"
                    value={editedRow.entrance}
                    onChange={(e) =>
                      setEditedRow((p) => ({ ...p, entrance: e.target.value }))
                    }
                    onKeyDown={onKey}
                  />
                </Col>
              </Row>

              <Row className="table-section">
                <Col span={24}>
                  <Input.TextArea
                    placeholder="Комментарий"
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    value={editedRow.comment}
                    onChange={(e) =>
                      setEditedRow((p) => ({ ...p, comment: e.target.value }))
                    }
                    onKeyDown={onKey}
                  />
                </Col>
              </Row>
            </>
          )
        }

        const built = formatFullAddress(record)?.trim()
        const oneLine =
          built && built.length > 0
            ? built
            : record.formatted_address?.trim() || "—"

        return (
          <div
            onDoubleClick={() => {
              setEditingId(record.id)
              setEditedRow({ ...record })
            }}
          >
            <div className="cell-ellipsis">{oneLine}</div>
            {record.comment && (
              <div style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
                Комментарий: {record.comment}
              </div>
            )}
            <Space size={6} style={{ marginTop: 4 }}>
              <Tooltip title="Скопировать адрес">
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={(e) => {
                    e.stopPropagation()
                    navigator.clipboard.writeText(oneLine)
                  }}
                />
              </Tooltip>
            </Space>
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
            onSave={editing ? handleSave : undefined}
            onCancel={editing ? cancelEdit : undefined}
            onDelete={!editing ? () => handleDelete(record) : undefined}
            confirmDelete={false}
            size="small"
          />
        )
      },
    },
  ]

  return (
    <Table
      className="op-table parts-table"
      rowKey="id"
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={false}
      size="small"
    />
  )
}
