// src/components/tnved/TnvedCodesTable.jsx

import React, { useState } from "react"
import { Table, Input, Button, Space, Tooltip } from "antd"
import {
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  ClockCircleOutlined
} from "@ant-design/icons"
import confirmAction from "@/utils/confirmAction"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"

const { TextArea } = Input

export default function TnvedCodesTable({ data, loading, onUpdate, onDelete }) {
  const [editingKey, setEditingKey] = useState("")
  const [editedRow, setEditedRow] = useState(null)
  const [logId, setLogId] = useState(null)

  const isEditing = (record) => record.id === editingKey

  const startEdit = (record) => {
    setEditingKey(record.id)
    setEditedRow({ ...record })
  }

  const cancelEdit = () => {
    setEditingKey("")
    setEditedRow(null)
  }

  const saveEdit = async () => {
    await onUpdate(editingKey, editedRow)
    cancelEdit()
  }

  const handleDelete = async (record) => {
    const confirmed = await confirmAction(`Удалить код ${record.code}?`)
    if (confirmed) {
      await onDelete(record)
    }
  }

  const columns = [
    {
      title: "Код",
      dataIndex: "code",
      width: 120,
      render: (_, record) =>
        isEditing(record) ? (
          <Input
            value={editedRow.code}
            onChange={(e) => setEditedRow({ ...editedRow, code: e.target.value })}
            onPressEnter={saveEdit}
          />
        ) : (
          record.code || ""
        )
    },
    {
      title: "Описание",
      dataIndex: "description",
      width: 300,
      render: (_, record) =>
        isEditing(record) ? (
          <TextArea
            value={editedRow.description || ""}
            onChange={(e) =>
              setEditedRow({ ...editedRow, description: e.target.value })
            }
            autoSize={{ minRows: 2, maxRows: 6 }}
          />
        ) : (
          record.description
            ? record.description.slice(0, 100) + (record.description.length > 100 ? "…" : "")
            : ""
        )
    },
    {
      title: "Пошлина (%)",
      dataIndex: "duty_rate",
      width: 120,
      render: (_, record) =>
        isEditing(record) ? (
          <Input
            value={editedRow.duty_rate}
            type="number"
            onChange={(e) => setEditedRow({ ...editedRow, duty_rate: e.target.value })}
            onPressEnter={saveEdit}
          />
        ) : (
          record.duty_rate || ""
        )
    },
    {
      title: "Примечания",
      dataIndex: "notes",
      width: 200,
      render: (_, record) =>
        isEditing(record) ? (
          <TextArea
            value={editedRow.notes || ""}
            onChange={(e) => setEditedRow({ ...editedRow, notes: e.target.value })}
            autoSize={{ minRows: 2, maxRows: 4 }}
          />
        ) : (
          record.notes
            ? record.notes.slice(0, 80) + (record.notes.length > 80 ? "…" : "")
            : ""
        )
    },
    {
      title: "Действия",
      dataIndex: "actions",
      width: 120,
      render: (_, record) => {
        const editing = isEditing(record)
        return (
          <Space>
            {editing ? (
              <>
                <Tooltip title="Сохранить">
                  <Button icon={<SaveOutlined />} onClick={saveEdit} />
                </Tooltip>
                <Tooltip title="Отмена">
                  <Button icon={<CloseOutlined />} onClick={cancelEdit} />
                </Tooltip>
              </>
            ) : (
              <>
                <Tooltip title="Удалить">
                  <Button icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
                </Tooltip>
                <Tooltip title="История">
                  <Button icon={<ClockCircleOutlined />} onClick={() => setLogId(record.id)} />
                </Tooltip>
              </>
            )}
          </Space>
        )
      }
    }
  ]

  return (
    <>
      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        bordered
        size="small"
        scroll={{ x: true }}
        onRow={(record) => ({
          onDoubleClick: () => startEdit(record)
        })}
        expandable={{
          expandedRowRender: (record) => (
            <div style={{ whiteSpace: "pre-wrap", padding: "8px 24px" }}>
              <b>Описание:</b> {record.description || "—"}
              <br />
              <b>Примечания:</b> {record.notes || "—"}
            </div>
          ),
          rowExpandable: () => true
        }}
      />

      {logId && (
        <FullHistoryDialog
          entityId={logId}
          entityType="tnved_code"
          onClose={() => setLogId(null)}
        />
      )}
    </>
  )
}
