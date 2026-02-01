import React from "react"
import TabRendererPage from "@/components/common/TabRendererPage"
import TnvedCodesMain from "@/components/tnved/TnvedCodesMain"

export default function TnvedCodesPage() {
  return (
    <TabRendererPage
      tabKey="tnved_codes"
      helpText="Клик по строке — открыть детали кода. Кнопка карандаш — редактирование; Enter — сохранить; Esc — отменить."
    >
      <TnvedCodesMain />
    </TabRendererPage>
  )
}
