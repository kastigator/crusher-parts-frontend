import React from "react"
import { Space, Typography } from "antd"
import { EnvironmentOutlined } from "@ant-design/icons"

const { Text } = Typography

export default function FullAddressField({
  formatted_address,
  comment,
  icon = true,
  compact = false
}) {
  return (
    <Space align="start" size="small">
      {icon && (
        <EnvironmentOutlined
          style={{ marginTop: compact ? 0 : 4, color: "#555" }}
        />
      )}
      <div>
        <Text type={formatted_address ? undefined : "secondary"}>
          {formatted_address || <i>не указано</i>}
        </Text>
        {comment && !compact && (
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {comment}
            </Text>
          </div>
        )}
      </div>
    </Space>
  )
}
