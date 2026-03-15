import React from "react"
import PageWrapper from "@/components/common/PageWrapper"
import EquipmentClassifierMain from "@/components/equipmentClassifier/EquipmentClassifierMain"

export default function EquipmentClassifierPage() {
  return (
    <PageWrapper
      title="Классификатор оборудования"
      helpText="Это инженерное дерево типов оборудования. Сначала вы настраиваете типы и подтипы техники, затем к этим узлам привязываются модели оборудования, а уже через модели в нужный каталог проваливаются OEM детали и машины клиентов."
    >
      <EquipmentClassifierMain />
    </PageWrapper>
  )
}
