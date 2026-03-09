import React from "react"
import { Alert, Card, Space, Typography } from "antd"
import PageWrapper from "@/components/common/PageWrapper"

const { Text } = Typography

export default function EconomicsPage() {
  return (
    <PageWrapper
      title="Экономика поставки"
      helpText="Основной сценарный расчёт теперь выполняется внутри RFQ Workspace."
    >
      <Card size="small">
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Alert
            type="info"
            showIcon
            message="Standalone economics page выведена из основного процесса"
            description="Используйте RFQ Workspace: Покрытие -> Сценарии -> Логистика -> Экономика -> Выбор."
          />
          <Text type="secondary">
            Это сделано специально, чтобы не держать параллельный legacy-поток рядом с новым сценарием RFQ.
          </Text>
        </Space>
      </Card>
    </PageWrapper>
  )
}
