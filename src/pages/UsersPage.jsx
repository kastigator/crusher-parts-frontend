// src/pages/UsersPage.jsx

import React from "react"
import TabRendererPage from "@/components/common/TabRendererPage"
import UsersMain from "@/components/users/UsersMain"

export default function UsersPage() {
  return (
    <TabRendererPage
      tabKey="users"
      title="Пользователи и роли"
      helpText="На этой странице администратор назначает роли по обязанностям: кто работает с клиентом, кто ведет закупку, кто поддерживает каталоги и кто только наблюдает."
    >
      <UsersMain />
    </TabRendererPage>
  )
}
