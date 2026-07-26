import React from "react"
import TabRendererPage from "@/components/common/TabRendererPage"
import WarehouseMain from "@/components/warehouse/WarehouseMain"

export default function WarehousePage() {
  return (
    <TabRendererPage
      tabKey="warehouse"
      helpText="Остатки, адреса хранения и документы движения по карточкам позиций."
    >
      <WarehouseMain />
    </TabRendererPage>
  )
}
