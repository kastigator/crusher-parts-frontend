import React from "react"
import { Space, Typography } from "antd"

const { Text, Title } = Typography

export default function EntityHeader({
  title,
  status,
  meta = [],
  primaryActions,
  secondaryActions,
}) {
  const metaItems = (Array.isArray(meta) ? meta : []).filter(Boolean)

  return (
    <div className="entity-header">
      <div className="entity-header__content">
        <div className="entity-header__title-row">
          {title ? (
            <Title level={5} className="entity-header__title">
              {title}
            </Title>
          ) : null}
          {status ? <div className="entity-header__status">{status}</div> : null}
        </div>

        {metaItems.length ? (
          <Space className="entity-header__meta" size={[8, 8]} wrap>
            {metaItems.map((item, index) => (
              <Text key={index} type="secondary">
                {item}
              </Text>
            ))}
          </Space>
        ) : null}
      </div>

      {(secondaryActions || primaryActions) && (
        <Space className="entity-header__actions" size={8} wrap>
          {secondaryActions}
          {primaryActions}
        </Space>
      )}
    </div>
  )
}
