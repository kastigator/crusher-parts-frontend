// src/pages/UsersPage.jsx

import React from "react"
import PageWrapper from "@/components/common/PageWrapper"
import UsersMain from "@/components/users/UsersMain"

export default function UsersPage() {
  return (
    <PageWrapper
      title="Администрирование и управление доступом"
      helpText="На этой странице администратор назначает роли по обязанностям: кто работает с клиентом, кто ведет закупку, кто поддерживает каталоги и кто только наблюдает."
    >
      <UsersMain />
    </PageWrapper>
  )
}
