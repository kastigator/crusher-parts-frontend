import React from "react"
import { Tabs } from "antd"
import PageWrapper from "@/components/common/PageWrapper"
import StandardPartsMain from "@/components/standardParts/StandardPartsMain"
import StandardPartsClassifierMain from "@/components/standardParts/StandardPartsClassifierMain"

export default function StandardPartsPage() {
  return (
    <PageWrapper
      title="Стандартные детали"
      helpText="Канонический каталог стандартных деталей и отдельный рабочий классификатор, где настраиваются классы изделий, их поля и OEM-представления."
    >
      <Tabs
        defaultActiveKey="catalog"
        items={[
          {
            key: "catalog",
            label: "Каталог",
            children: <StandardPartsMain />,
          },
          {
            key: "classifier",
            label: "Классификатор",
            children: <StandardPartsClassifierMain />,
          },
        ]}
      />
    </PageWrapper>
  )
}
