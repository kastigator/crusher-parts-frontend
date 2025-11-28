import React, { useState } from "react"
import {
  Table,
  Input,
  Divider,
  Row,
  Col,
  Space,
  Tooltip,
  Button,
  Tag,
  Checkbox,
  message,
} from "antd"
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

export default function SupplierAddressesTable({
  data = [],
  loading,
  onUpdate,
  onDelete,
}) {
  const [editingId, setEditingId] = useState(null)
  const [editedRow, setEditedRow] = useState(null)

  const isEditing = (record) => editingId === record.id

  const startEdit = (record) => {
    setEditingId(record.id)
    setEditedRow({ ...record })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditedRow(null)
  }

  const updateField = (field, value) =>
    setEditedRow((prev) => ({ ...(prev || {}), [field]: value }))

  const handleSave = async () => {
    if (!editedRow) return
    if (!editedRow.formatted_address?.trim()) {
      message.warning("Поле адреса обязательно")
      return
    }

    try {
      await onUpdate?.(editedRow.id, editedRow)
      cancelEdit()
    } catch (err) {
      console.error("Ошибка при обновлении адреса поставщика:", err)
      message.error("Не удалось обновить адрес поставщика")
    }
  }

  const handleKeyDown = (e) => {
    if (!editingId) return
    if (e.key === "Enter") {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      e.preventDefault()
      cancelEdit()
    }
  }

  const handleDelete = async (record) => {
    const { confirmed } = await confirmAction("Удалить адрес?")
    if (!confirmed) return
    await onDelete?.(record)
  }

  const renderInput = (field, placeholder) => (
    <Input
      size="small"
      placeholder={placeholder}
      value={editedRow?.[field] ?? ""}
      onChange={(e) => updateField(field, e.target.value)}
      onKeyDown={handleKeyDown}
    />
  )

  const columns = [
    {
      title: "Адрес",
      dataIndex: "formatted_address",
      render: (_, record) => {
        const editing = isEditing(record)

        if (editing && editedRow) {
          return (
            <>
              {renderInput("formatted_address", "Полный адрес")}
              <Divider style={{ margin: "8px 0" }} />

              <Row gutter={8}>
                <Col span={6}>{renderInput("label", "Метка")}</Col>
                <Col span={6}>{renderInput("type", "Тип")}</Col>
                <Col span={6}>{renderInput("country", "Страна")}</Col>
                <Col span={6}>{renderInput("region", "Регион")}</Col>
              </Row>

              <Row gutter={8} style={{ marginTop: 8 }}>
                <Col span={6}>{renderInput("city", "Город")}</Col>
                <Col span={6}>{renderInput("postal_code", "Индекс")}</Col>
                <Col span={6}>{renderInput("street", "Улица")}</Col>
                <Col span={3}>{renderInput("house", "Дом")}</Col>
                <Col span={3}>{renderInput("building", "Стр.")}</Col>
              </Row>

              <Row gutter={8} style={{ marginTop: 8 }}>
                <Col span={6}>{renderInput("entrance", "Подъезд / вход")}</Col>
                <Col span={18}>{renderInput("comment", "Комментарий")}</Col>
              </Row>

              <Row style={{ marginTop: 8 }}>
                <Col>
                  <Checkbox
                    checked={!!editedRow.is_precise_location}
                    onChange={(e) =>
                      updateField(
                        "is_precise_location",
                        e.target.checked ? 1 : 0,
                      )
                    }
                    onKeyDown={handleKeyDown}
                  >
                    Точный адрес (GPS)
                  </Checkbox>
                </Col>
              </Row>
            </>
          )
        }

        const oneLine =
          record.formatted_address?.trim() || formatFull(record) || "-"

        return (
          <div onDoubleClick={() => startEdit(record)}>
            <Space size={6}>
              <Tooltip title={oneLine}>
                <span className="cell-ellipsis">{oneLine}</span>
              </Tooltip>

              {oneLine !== "-" && (
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
              )}

              {record.is_precise_location ? <Tag color="blue">GPS</Tag> : null}
            </Space>

            {record.comment && !record.formatted_address && (
              <div style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
                Комментарий: {record.comment}
              </div>
            )}
          </div>
        )
      },
    },
    {
      title: "Действия",
      key: "actions",
      width: 90,
      align: "center",
      render: (_, record) => (
        <ActionButtons
          size="small"
          onDelete={() => handleDelete(record)}
          confirmDelete={false}
        />
      ),
    },
  ]

  return (
    <Table
      className="op-table"
      rowKey="id"
      columns={columns}
      dataSource={Array.isArray(data) ? data : []}
      loading={loading}
      pagination={false}
      size="small"
      tableLayout="fixed"
    />
  )
}
