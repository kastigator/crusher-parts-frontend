import React from "react"
import TabRendererPage from "@/components/common/TabRendererPage"
import MaterialsMain from "@/components/materials/MaterialsMain"

export default function MaterialsPage() {
  return (
    <TabRendererPage
      tabKey="materials"
      helpText="Поиск по названию/коду; выберите категорию слева. Нажмите строку — детали материала."
    >
      <MaterialsMain />
    </TabRendererPage>
  )
}
