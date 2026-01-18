import React from "react"
import { Card, Typography } from "antd"
import PageWrapper from "@/components/common/PageWrapper"

const { Paragraph } = Typography

export default function CoveragePage() {
  return (
    <PageWrapper
      title="Покрытие"
      helpText="Матрица покрытий будет рассчитываться на основе RFQ и ответов поставщиков."
    >
      <Card style={{ maxWidth: 720 }}>
        <Paragraph style={{ marginBottom: 0 }}>
          Здесь появится матрица покрытия по позициям: OEM/аналог, комплекты,
          замены ANY/ALL и перекрытие по поставщикам. На данном этапе расчет
          подключается после наполнения RFQ и ответов.
        </Paragraph>
      </Card>
    </PageWrapper>
  )
}
