// src/components/clients/ClientsTable.jsx
import React, { useState } from "react"
import { Table, Input, message, Tabs } from "antd"
import BillingAddressesMain from "./BillingAddressesMain"
import ShippingAddressesMain from "./ShippingAddressesMain"
import BankDetailsMain from "./BankDetailsMain"
import axios from "@/api/axiosInstance"
import ValueDisplay from "@/components/common/ValueDisplay"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"

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

  const deleteClient = async (client) => {
    const { confirmed } = await confirmAction("Удалить клиента?")
    if (!confirmed) return

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
      onCell: (record) => ({ onDoubleClick: () => startEdit(record) })
    },
    {
      title: "Контакт",
      dataIndex: "contact_person",
      render: (_, record) =>
        isEditing(record)
          ? renderInput("contact_person")
          : <ValueDisplay value={record.contact_person} />,
      onCell: (record) => ({ onDoubleClick: () => startEdit(record) })
    },
    {
      title: "Телефон",
      dataIndex: "phone",
      render: (_, record) =>
        isEditing(record)
          ? renderInput("phone")
          : <ValueDisplay value={record.phone} />,
      onCell: (record) => ({ onDoubleClick: () => startEdit(record) })
    },
    {
      title: "Email",
      dataIndex: "email",
      render: (_, record) =>
        isEditing(record)
          ? renderInput("email")
          : <ValueDisplay value={record.email} type="email" />,
      onCell: (record) => ({ onDoubleClick: () => startEdit(record) })
    },
    {
      title: "Действия",
      key: "actions",
      width: 140,
      render: (_, record) => {
        const editing = isEditing(record)
        return (
          <ActionButtons
            onSave={editing ? saveEdit : undefined}
            onCancel={editing ? cancelEdit : undefined}
            onHistory={!editing ? () => setHistoryForId(record.id) : undefined}
            onDelete={!editing ? () => deleteClient(record) : undefined}
            size="small"
          />
        )
      }
    }
  ]

  const expandedRowRender = (client) => {
    if (!client?.id) return null

    return (
      <div style={{ paddingInline: 0 }}>
        <Tabs
          defaultActiveKey="billing"
          destroyInactiveTabPane
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
      </div>
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
