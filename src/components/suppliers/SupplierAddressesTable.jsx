// src/components/suppliers/SupplierAddressesTable.jsx
import React, { useState } from "react"
import { Table, Input, Divider, Row, Col, Space, Tooltip, Button, Tag, Checkbox } from "antd"
import { CopyOutlined } from "@ant-design/icons"
import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"

const formatFull = (r = {}) =>
  [
    r.label && `[${r.label}]`,
    r.type,
    r.country,
    r.region,
    r.city,
    r.street && `ул. ${r.street}`,
    r.house && `д. ${r.house}`,
    r.building && `стр. ${r.building}`,
    r.entrance && `подъезд ${r.entrance}`,
    r.postal_code && `инд. ${r.postal_code}`,
  ]
    .filter(Boolean)
    .join(", ")

export default function SupplierAddressesTable({ data = [], loading, onUpdate, onDelete }) {
  const [editingId, setEditingId] = useState(null)
  const [editedRow, setEditedRow] = useState(null)

  const isEditing = (r) => editingId === r.id
  const cancelEdit = () => { setEditingId(null); setEditedRow(null) }

  const onKey = (e) => {
    if (e.key === "Enter") handleSave()
    if (e.key === "Escape") cancelEdit()
  }

  const handleSave = async () => {
    if (!editedRow?.formatted_address?.trim()) return
    try {
      await onUpdate?.(editedRow.id, editedRow)
      cancelEdit()
    } catch (e) { console.error(e) }
  }

  const handleDelete = async (record) => {
    const { confirmed } = await confirmAction("Удалить адрес?")
    if (!confirmed) return
    try {
      await onDelete?.(record)
    } catch (e) { console.error(e) }
  }

  const renderInput = (field) => (
    <Input
      placeholder={field}
      value={editedRow?.[field] ?? ""}
      onChange={(e) => setEditedRow((p) => ({ ...p, [field]: e.target.value }))}
      onKeyDown={onKey}
      autoFocus={field === "formatted_address"}
      size="small"
    />
  )

  const columns = [
    {
      title: "Адрес",
      dataIndex: "formatted_address",
      render: (_, r) => {
        const editing = isEditing(r)
        if (editing && editedRow) {
          return (
            <>
              {renderInput("formatted_address")}
              <Divider style={{ margin: "8px 0" }} />

              <Row gutter={8}>
                <Col span={6}>{renderInput("label")}</Col>
                <Col span={6}>{renderInput("type")}</Col>
                <Col span={6}>{renderInput("country")}</Col>
                <Col span={6}>{renderInput("region")}</Col>
              </Row>

              <Row gutter={8} style={{ marginTop: 8 }}>
                <Col span={6}>{renderInput("city")}</Col>
                <Col span={6}>{renderInput("postal_code")}</Col>
                <Col span={6}>{renderInput("street")}</Col>
                <Col span={3}>{renderInput("house")}</Col>
                <Col span={3}>{renderInput("building")}</Col>
              </Row>

              <Row gutter={8} style={{ marginTop: 8 }}>
                <Col span={6}>{renderInput("entrance")}</Col>
                <Col span={18}>{renderInput("comment")}</Col>
              </Row>

              <Row style={{ marginTop: 8 }}>
                <Col>
                  <Checkbox
                    checked={!!editedRow?.is_precise_location}
                    onChange={(e) =>
                      setEditedRow((p) => ({ ...p, is_precise_location: e.target.checked }))
                    }
                  >
                    Точная локация (GPS)
                  </Checkbox>
                </Col>
              </Row>
            </>
          )
        }

        const oneLine = formatFull(r) || r.formatted_address?.trim() || "—"
        return (
          <div
            onDoubleClick={() => { setEditingId(r.id); setEditedRow({ ...r }) }}
          >
            <div className="cell-ellipsis" style={{ fontWeight: 600 }}>
              {oneLine}
            </div>
            {r.comment && (
              <div style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
                Комментарий: {r.comment}
                <Space size={6} style={{ marginLeft: 8 }}>
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
            )}
            {r.is_precise_location ? <Tag color="blue">GPS</Tag> : null}
          </div>
        )
      },
    },
    {
      title: "Действия",
      key: "actions",
      width: 140,
      render: (_, r) => {
        const editing = isEditing(r)
        return (
          <ActionButtons
            onSave={editing ? handleSave : undefined}
            onCancel={editing ? cancelEdit : undefined}
            onDelete={!editing ? () => handleDelete(r) : undefined}
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
