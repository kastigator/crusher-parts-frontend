import React from "react"
import { Typography } from "antd"
import PageWrapper from "@/components/common/PageWrapper"
import useCapabilities from "@/hooks/useCapabilities"

const { Text } = Typography

export default function CapabilityAccessRoute({ capability, title = "Доступ", children }) {
  const { can } = useCapabilities()
  if (can(capability)) return children
  return (
    <PageWrapper title={title}>
      <Text type="secondary">
        У вас нет полномочия для этого раздела. Backend также отклонит защищенные действия.
      </Text>
    </PageWrapper>
  )
}
