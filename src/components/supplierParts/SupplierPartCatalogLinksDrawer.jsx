import React from "react"
import { Drawer, Space, Tag, Typography } from "antd"

import CatalogPositionLinksTab from "./CatalogPositionLinksTab"

const { Text } = Typography

export default function SupplierPartCatalogLinksDrawer({
  open,
  part,
  onClose,
  onChanged = () => {},
}) {
  const supplierPartId = Number(part?.id || 0)
  const title = (
    <Space wrap size={8}>
      <Text>Связи с карточками позиций</Text>
      {part?.supplier_part_number ? <Tag color="geekblue">{part.supplier_part_number}</Tag> : null}
      {part?.supplier_name ? <Tag>{part.supplier_name}</Tag> : null}
    </Space>
  )

  return (
    <Drawer
      title={title}
      open={open}
      onClose={onClose}
      destroyOnHidden
      width={1040}
    >
      {supplierPartId ? (
        <CatalogPositionLinksTab supplierPartId={supplierPartId} onChanged={onChanged} />
      ) : null}
    </Drawer>
  )
}
