import React from "react"
import { Space, Typography } from "antd"

const { Title, Text } = Typography

export default function AppPageHeader({
  title,
  subtitle,
  status,
  helpSummary,
  primaryActions,
  secondaryActions,
}) {
  if (!title && !subtitle && !status && !helpSummary && !primaryActions && !secondaryActions) {
    return null
  }

  return (
    <div className="app-page-header">
      <div className="app-page-header__main">
        <div className="app-page-header__title-row">
          {title ? (
            <Title level={3} className="app-page-header__title">
              {title}
            </Title>
          ) : null}
          {status ? <div className="app-page-header__status">{status}</div> : null}
        </div>

        {subtitle ? (
          <Text className="app-page-header__subtitle" type="secondary">
            {subtitle}
          </Text>
        ) : null}

        {helpSummary ? (
          <Text className="app-page-header__help" type="secondary">
            {helpSummary}
          </Text>
        ) : null}
      </div>

      {(secondaryActions || primaryActions) && (
        <Space className="app-page-header__actions" size={12} wrap>
          {secondaryActions}
          {primaryActions}
        </Space>
      )}
    </div>
  )
}
