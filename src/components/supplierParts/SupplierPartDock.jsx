// src/components/supplierParts/SupplierPartDock.jsx
import React from "react"
import { Card, Col, Row } from "antd"
import PriceHistoryTab from "./PriceHistoryTab"
import OriginalsLinkTab from "./OriginalsLinkTab"

export default function SupplierPartDock({ supplierPart }) {
  if (!supplierPart) return null
  return (
    <Row gutter={[12, 12]}>
      <Col xs={24} lg={12}>
        <Card title="История цен" size="small" bodyStyle={{ paddingTop: 8 }}>
          <PriceHistoryTab supplierPartId={supplierPart.id} />
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card title="Привязки к оригиналам" size="small" bodyStyle={{ paddingTop: 8 }}>
          <OriginalsLinkTab supplierPart={supplierPart} />
        </Card>
      </Col>
    </Row>
  )
}
