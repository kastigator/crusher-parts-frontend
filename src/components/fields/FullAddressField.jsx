// src/components/fields/FullAddressField.jsx
import React from "react"
import { Space, Typography } from "antd"
import { EnvironmentOutlined } from "@ant-design/icons"

const { Text } = Typography

const formatFullAddress = (r = {}) => {
  const parts = [
    r.country,
    r.region,
    r.city,
    r.street && `ул. ${r.street}`,
    r.house && `д. ${r.house}`,
    r.building && `стр. ${r.building}`,
    r.entrance && `подъезд ${r.entrance}`,
    r.postal_code && `инд. ${r.postal_code}`,
  ].filter(Boolean)
  return parts.join(", ")
}

const getOneLineAddress = (r = {}) => {
  const composed = formatFullAddress(r)
  if (composed) return composed
  if (r.formatted_address && String(r.formatted_address).trim()) return String(r.formatted_address).trim()
  return "—"
}

export default function FullAddressField({ icon = true, compact = false, ...addr }) {
  const oneLine = getOneLineAddress(addr)

  return (
    <Space align="start" size="small">
      {icon && <EnvironmentOutlined style={{ marginTop: compact ? 0 : 4, color: "#555" }} />}
      <div>
        <Text type={oneLine !== "—" ? undefined : "secondary"}>
          {oneLine !== "—" ? oneLine : <i>не указано</i>}
        </Text>
        {addr.comment && !compact && (
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>{addr.comment}</Text>
          </div>
        )}
      </div>
    </Space>
  )
}
