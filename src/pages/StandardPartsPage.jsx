import React from "react"
import PageWrapper from "@/components/common/PageWrapper"
import StandardPartsMain from "@/components/standardParts/StandardPartsMain"

export default function StandardPartsPage() {
  return (
    <PageWrapper
      title="Стандартные детали"
      helpText="Нормализованный каталог стандартных изделий. Здесь создаются и редактируются стандартные позиции, которые затем связываются с OEM и supplier parts."
    >
      <StandardPartsMain />
    </PageWrapper>
  )
}
