// src/components/clients/ClientDock.jsx
import React, { useMemo, useState } from "react"
import { Card, Empty, Space, Tag, Tabs, Typography } from "antd"

import BillingAddressesMain from "./BillingAddressesMain"
import ShippingAddressesMain from "./ShippingAddressesMain"
import BankDetailsMain from "./BankDetailsMain"
import ClientContactsMain from "./ClientContactsMain"
import ClientOrdersTab from "./ClientOrdersTab"
import ClientEquipmentUnitsMain from "./ClientEquipmentUnitsMain"
import ClientPartsMain from "./ClientPartsMain"
import ClientMetaCard from "./ClientMetaCard"

const { Text } = Typography

export default function ClientDock({ client, onChanged }) {
  const clientId = Number(client?.id)
  const [activeKey, setActiveKey] = useState("overview")

  const header = useMemo(() => {
    if (!client) return null
    return (
      <Space size="small" wrap>
        <Text type="secondary">Клиент:</Text>
        <Tag>{client.company_name || "—"}</Tag>
        {client.contact_person ? <Tag>Контакт: {client.contact_person}</Tag> : null}
        {client.phone ? <Tag>{client.phone}</Tag> : null}
        {client.email ? <Tag>{client.email}</Tag> : null}
      </Space>
    )
  }, [client])

  if (!clientId) {
    return (
      <Card bodyStyle={{ padding: 24 }}>
        <Empty description="Выберите клиента" />
      </Card>
    )
  }

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #f0f0f0",
        borderRadius: 8,
        padding: "12px 16px 16px",
      }}
    >
      <div style={{ marginBottom: 8 }}>{header}</div>
      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        destroyInactiveTabPane
        items={[
          {
            key: "overview",
            label: "Обзор",
            children: <ClientMetaCard client={client} onSaved={onChanged} />,
          },
          {
            key: "contacts",
            label: "Контакты и адреса",
            children: (
              <Space direction="vertical" style={{ width: "100%" }} size={16}>
                <ClientContactsMain clientId={clientId} onChanged={onChanged} />
                <BillingAddressesMain clientId={clientId} onChanged={onChanged} />
                <ShippingAddressesMain clientId={clientId} onChanged={onChanged} />
                <BankDetailsMain clientId={clientId} onChanged={onChanged} />
              </Space>
            ),
          },
          {
            key: "equipment",
            label: "Оборудование",
            children: <ClientEquipmentUnitsMain clientId={clientId} onChanged={onChanged} />,
          },
          {
            key: "client-parts",
            label: "Номенклатура клиента",
            children: <ClientPartsMain clientId={clientId} onChanged={onChanged} />,
          },
          {
            key: "orders",
            label: "Заявки и сделки",
            children: <ClientOrdersTab clientId={clientId} />,
          },
        ]}
      />
    </div>
  )
}
