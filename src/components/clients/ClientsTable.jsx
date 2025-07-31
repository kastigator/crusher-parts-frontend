import React, { useState } from "react"
import { Table, Button, Input, Space, Tooltip, Popconfirm } from "antd"
import { DeleteOutlined, HistoryOutlined, DownOutlined, UpOutlined } from "@ant-design/icons"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import confirmAction from "@/utils/confirmAction"
import axios from "@/api/axiosInstance"

export default function ClientsTable({
  data = [],
  loading = false,
  expandedClientId,
  setExpandedClientId
}) {
  const [editingKey, setEditingKey] = useState(null)
  const [editedRow, setEditedRow] = useState({})
  const [logClientId, setLogClientId] = useState(null)

  const isEditing = (record) => record.id === editingKey

  const handleEdit = (record) => {
    setEditingKey(record.id)
    setEditedRow({ ...record })
  }

  const cancelEdit = () => {
    setEditingKey(null)
    setEditedRow({})
  }

  const saveEdit = async (record) => {
    try {
      await axios.put(`/clients/${record.id}`, editedRow)
      setEditingKey(null)
    } catch (err) {
      console.error("Ошибка при сохранении:", err)
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirmAction("Удалить клиента?")
    if (!ok) return
    try {
      await axios.delete(`/clients/${id}`)
      if (expandedClientId === id) setExpandedClientId(null)
    } catch (err) {
      console.error("Ошибка при удалении:", err)
    }
  }

  const columns = [
    {
      title: "",
      dataIndex: "expand",
      width: 40,
      render: (_, record) =>
        record.id ? (
          <Button
            type="link"
            icon={expandedClientId === record.id ? <UpOutlined /> : <DownOutlined />}
            onClick={() =>
              setExpandedClientId(
                expandedClientId === record.id ? null : record.id
              )
            }
          />
        ) : null
    },
    {
      title: "Компания",
      dataIndex: "company_name",
      editable: true,
      render: (_, record) =>
        isEditing(record) ? (
          <Input
            value={editedRow.company_name}
            onChange={(e) =>
              setEditedRow((prev) => ({ ...prev, company_name: e.target.value }))
            }
          />
        ) : (
          record.company_name
        )
    },
    {
      title: "Контакт",
      dataIndex: "contact_person",
      editable: true,
      render: (_, record) =>
        isEditing(record) ? (
          <Input
            value={editedRow.contact_person}
            onChange={(e) =>
              setEditedRow((prev) => ({ ...prev, contact_person: e.target.value }))
            }
          />
        ) : (
          record.contact_person
        )
    },
    {
      title: "Телефон",
      dataIndex: "phone",
      editable: true,
      render: (_, record) =>
        isEditing(record) ? (
          <Input
            value={editedRow.phone}
            onChange={(e) =>
              setEditedRow((prev) => ({ ...prev, phone: e.target.value }))
            }
          />
        ) : (
          record.phone
        )
    },
    {
      title: "Email",
      dataIndex: "email",
      editable: true,
      render: (_, record) =>
        isEditing(record) ? (
          <Input
            value={editedRow.email}
            onChange={(e) =>
              setEditedRow((prev) => ({ ...prev, email: e.target.value }))
            }
          />
        ) : (
          record.email
        )
    },
    {
      title: "Действия",
      dataIndex: "actions",
      width: 120,
      render: (_, record) => {
        const editable = isEditing(record)
        return record.id ? (
          <Space>
            {editable ? (
              <>
                <Button type="link" onClick={() => saveEdit(record)}>
                  Сохранить
                </Button>
                <Button type="link" onClick={cancelEdit}>
                  Отмена
                </Button>
              </>
            ) : (
              <>
                <Tooltip title="Редактировать">
                  <Button type="link" onClick={() => handleEdit(record)}>
                    ✏️
                  </Button>
                </Tooltip>
                <Tooltip title="Удалить">
                  <Popconfirm
                    title="Удалить клиента?"
                    onConfirm={() => handleDelete(record.id)}
                  >
                    <Button danger type="link" icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Tooltip>
                <Tooltip title="История изменений">
                  <Button
                    type="link"
                    icon={<HistoryOutlined />}
                    onClick={() => setLogClientId(record.id)}
                  />
                </Tooltip>
              </>
            )}
          </Space>
        ) : null
      }
    }
  ]

  return (
    <>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={false}
        expandable={{
          expandedRowKeys: expandedClientId ? [expandedClientId] : [],
          onExpand: (expanded, record) =>
            setExpandedClientId(expanded ? record.id : null),
          expandedRowRender: () => null // рендерится в ClientsMain
        }}
        size="small"
      />

      <FullHistoryDialog
        open={!!logClientId}
        onClose={() => setLogClientId(null)}
        clientId={logClientId}
      />
    </>
  )
}
