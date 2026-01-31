// src/components/suppliers/SupplierDock.jsx
import React, { useMemo, useState } from "react"
import { Card, Empty, Space, Tag, Tabs, Typography } from "antd"

import SupplierAddressesMain from "./SupplierAddressesMain"
import SupplierBankDetailsMain from "./SupplierBankDetailsMain"
import SupplierContactsMain from "./SupplierContactsMain"
import SupplierQualityMain from "./SupplierQualityMain"

const { Text } = Typography

export default function SupplierDock({ supplier, onChanged }) {
  const supplierId = Number(supplier?.id)
  const [activeKey, setActiveKey] = useState("contacts")

  const header = useMemo(() => {
    if (!supplier) return null
    return (
      <Space size="small" wrap>
        <Text type="secondary">Поставщик:</Text>
        <Tag>{supplier.name || "—"}</Tag>
        {supplier.public_code ? <Tag color="geekblue">{supplier.public_code}</Tag> : null}
        {supplier.country ? <Tag>{supplier.country}</Tag> : null}
        {supplier.contact_person ? <Tag>Контакт: {supplier.contact_person}</Tag> : null}
        {supplier.phone ? <Tag>{supplier.phone}</Tag> : null}
        {supplier.email ? <Tag>{supplier.email}</Tag> : null}
      </Space>
    )
  }, [supplier])

  if (!supplierId) {
    return (
      <Card bodyStyle={{ padding: 24 }}>
        <Empty description="Выберите поставщика" />
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
            children: <SupplierContactsMain supplierId={supplierId} onChanged={onChanged} />,
          },
          {
            key: "addresses",
            label: "Адреса",
            children: <SupplierAddressesMain supplierId={supplierId} onChanged={onChanged} />,
          },
          {
            key: "bank",
            label: "Банк. реквизиты",
            children: <SupplierBankDetailsMain supplierId={supplierId} onChanged={onChanged} />,
          },
          {
            key: "quality",
            label: "Качество",
            children: <SupplierQualityMain supplierId={supplierId} />,
          },
        ]}
      />
    </Card>
  )
}

