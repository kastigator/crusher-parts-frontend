// src/components/clients/ClientsTable.jsx

import React from "react"
import { Table, Tabs, Button, Space, message } from "antd"
import BillingAddressesMain from "./BillingAddressesMain"
import ShippingAddressesMain from "./ShippingAddressesMain"
import BankDetailsMain from "./BankDetailsMain"
import { DeleteOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"

export default function ClientsTable({
  data,
  loading,
  expandedClientId,
  setExpandedClientId,
  onReload
}) {
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

  const columns = [
    {
      title: "Компания",
      dataIndex: "company_name",
      key: "company_name"
    },
    {
      title: "Контакт",
      dataIndex: "contact_person",
      key: "contact_person"
    },
    {
      title: "Телефон",
      dataIndex: "phone",
      key: "phone"
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email"
    },
    {
      title: "Действия",
      key: "actions",
      width: 100,
      render: (_, record) => (
        <Space>
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
      pagination={false}
    />
  )
}
