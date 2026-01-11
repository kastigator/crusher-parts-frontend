// src/pages/UsersPage.jsx

import React from "react"
import TabRendererPage from "@/components/common/TabRendererPage"
import UsersMain from "@/components/users/UsersMain"

export default function UsersPage() {
  return (
    <TabRendererPage
      tabKey="users"
      title="Пользователи и роли"
      helpText="Кнопка карандаш — редактирование; Enter — сохранить; Esc — отменить."
    >
      <UsersMain />
    </TabRendererPage>
  )
}
