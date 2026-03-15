// src/components/clients/ClientDock.jsx
import React, { useMemo, useState } from "react"
import { Card, Empty, Space, Tag, Tabs, Typography } from "antd"

import BillingAddressesMain from "./BillingAddressesMain"
import ShippingAddressesMain from "./ShippingAddressesMain"
import BankDetailsMain from "./BankDetailsMain"
import ClientContactsMain from "./ClientContactsMain"
import ClientOrdersTab from "./ClientOrdersTab"
import ClientEquipmentUnitsMain from "./ClientEquipmentUnitsMain"

const { Text } = Typography

export default function ClientDock({ client, onChanged }) {
  const clientId = Number(client?.id)
  const [activeKey, setActiveKey] = useState("contacts")

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
    <Card title={header} bodyStyle={{ paddingTop: 8 }}>
      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        destroyInactiveTabPane
        items={[
          {
            key: "contacts",
            label: "Контакты",
            children: <ClientContactsMain clientId={clientId} onChanged={onChanged} />,
          },
          {
            key: "billing",
            label: "Юр. адреса",
            children: <BillingAddressesMain clientId={clientId} onChanged={onChanged} />,
          },
          {
            key: "shipping",
            label: "Адреса доставки",
            children: <ShippingAddressesMain clientId={clientId} onChanged={onChanged} />,
          },
          {
            key: "bank",
            label: "Банк. реквизиты",
            children: <BankDetailsMain clientId={clientId} onChanged={onChanged} />,
          },
          {
            key: "equipment",
            label: "Оборудование",
            children: <ClientEquipmentUnitsMain clientId={clientId} onChanged={onChanged} />,
          },
          {
            key: "orders",
            label: "История заказов",
            children: <ClientOrdersTab clientId={clientId} />,
          },
        ]}
      />
    </Card>
  )
}
