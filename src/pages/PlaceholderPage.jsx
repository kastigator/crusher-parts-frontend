import React from "react"
import { Card, Typography } from "antd"
import PageWrapper from "@/components/common/PageWrapper"

const { Paragraph } = Typography

export default function PlaceholderPage({ title, description, children }) {
  return (
    <PageWrapper title={title}>
      <Card style={{ maxWidth: 720 }}>
        <Paragraph style={{ marginBottom: 0 }}>
          {description || "Раздел в разработке. Скоро здесь появится рабочий интерфейс."}
        </Paragraph>
        {children}
      </Card>
    </PageWrapper>
  )
}
