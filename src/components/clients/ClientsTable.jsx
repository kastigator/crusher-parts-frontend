import React, { useState } from "react"
import { Table, Input, Button, Space, Tabs, message } from "antd"
import { DeleteOutlined, ClockCircleOutlined } from "@ant-design/icons"
import BillingAddressesMain from "./BillingAddressesMain"
import ShippingAddressesMain from "./ShippingAddressesMain"
import BankDetailsMain from "./BankDetailsMain"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"
import ValueDisplay from "@/components/common/ValueDisplay"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"

export default function ClientsTable({
  data,
  loading,
  expandedClientId,
  setExpandedClientId,
  onReload
}) {
  const [editingId, setEditingId] = useState(null)
  const [editedRow, setEditedRow] = useState(null)
  const [historyForId, setHistoryForId] = useState(null)

  const isEditing = (record) => record.id === editingId

  const startEdit = (record) => {
    setEditingId(record.id)
    setEditedRow({ ...record })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditedRow(null)
  }

  const saveEdit = async () => {
    if (!editedRow) return
    try {
      await axios.put(`/clients/${editedRow.id}`, editedRow)
      message.success("Изменения сохранены")
      cancelEdit()
      onReload()
    } catch (err) {
      console.error("Ошибка сохранения:", err)
      message.error("Не удалось сохранить изменения")
    }
  }

  const handleDelete = async (client) => {
    const ok = await confirmAction(`Удалить клиента "${client.company_name}" и все связанные записи?`)
    if (!ok) return

    try {
      await axios.delete(`/clients/${client.id}`)
      message.success("Клиент удалён")
      onReload()
    } catch (err) {
      console.error("Ошибка при удалении клиента:", err)
      message.error("Не удалось удалить клиента")
    }
  }

  const renderInput = (field) => (
    <Input
      value={editedRow?.[field] ?? ""}
      onChange={(e) =>
        setEditedRow((prev) => ({ ...prev, [field]: e.target.value }))
      }
      onPressEnter={saveEdit}
      onKeyDown={(e) => {
        if (e.key === "Escape") cancelEdit()
      }}
      autoFocus
      size="small"
    />
  )

  const columns = [
    {
      title: "Компания",
      dataIndex: "company_name",
      render: (_, record) =>
        isEditing(record)
          ? renderInput("company_name")
          : <ValueDisplay value={record.company_name} />,
      onCell: (record) => ({
        onDoubleClick: () => startEdit(record)
      })
    },
    {
      title: "Контакт",
      dataIndex: "contact_person",
      render: (_, record) =>
        isEditing(record)
          ? renderInput("contact_person")
          : <ValueDisplay value={record.contact_person} />,
      onCell: (record) => ({
        onDoubleClick: () => startEdit(record)
      })
    },
    {
      title: "Телефон",
      dataIndex: "phone",
      render: (_, record) =>
        isEditing(record)
          ? renderInput("phone")
          : <ValueDisplay value={record.phone} />,
      onCell: (record) => ({
        onDoubleClick: () => startEdit(record)
      })
    },
    {
      title: "Email",
      dataIndex: "email",
      render: (_, record) =>
        isEditing(record)
          ? renderInput("email")
          : <ValueDisplay value={record.email} type="email" />,
      onCell: (record) => ({
        onDoubleClick: () => startEdit(record)
      })
    },
    {
      title: "Действия",
      key: "actions",
      width: 120,
      render: (_, record) =>
        isEditing(record) ? (
          <Space>
            <Button type="link" onClick={saveEdit}>
              Сохранить
            </Button>
            <Button type="link" onClick={cancelEdit}>
              Отмена
            </Button>
          </Space>
        ) : (
          <Space>
            <Button
              icon={<ClockCircleOutlined />}
              onClick={() => setHistoryForId(record.id)}
              title="История изменений"
            />
            <Button
              danger
              type="link"
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            />
          </Space>
        )
    }
  ]

  const expandedRowRender = (client) => {
    if (!client?.id) return null

    return (
      <Tabs
        defaultActiveKey="billing"
        destroyInactiveTabPane={true}
        items={[
          {
            key: "billing",
            label: "Юридические адреса",
            children: <BillingAddressesMain clientId={client.id} />
          },
          {
            key: "shipping",
            label: "Адреса доставки",
            children: <ShippingAddressesMain clientId={client.id} />
          },
          {
            key: "bank",
            label: "Банковские реквизиты",
            children: <BankDetailsMain clientId={client.id} />
          }
        ]}
      />
    )
  }

  return (
    <>
      <Table
        rowKey="id"
        dataSource={data}
        columns={columns}
        loading={loading}
        expandable={{
          expandedRowRender,
          expandedRowKeys: expandedClientId ? [expandedClientId] : [],
          onExpand: (expanded, record) =>
            setExpandedClientId(expanded ? record.id : null)
        }}
        pagination={{ pageSize: 10 }}
        size="middle"
      />

      {historyForId && (
        <FullHistoryDialog
          entityType="clients-combined"
          entityId={historyForId}
          onClose={() => setHistoryForId(null)}
        />
      )}
    </>
  )
}
