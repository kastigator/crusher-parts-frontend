import React, { useState } from "react"
import TabsTable from "./TabsTable"
import UsersTable from "./UsersTable"
import RolePermissionsMatrix from "./RolePermissionsMatrix"
import PageWrapper from "@/components/common/PageWrapper"

export default function UsersMain() {
  const [rolesRevision, setRolesRevision] = useState(0)

  const handleRolesChanged = () => {
    setRolesRevision(prev => prev + 1)
  }

  return (
    <PageWrapper>
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        <section>
          <h2 style={{ fontWeight: 600, fontSize: 16, marginBottom: 12 }}>
            Таблица вкладок
          </h2>
          <TabsTable />
        </section>

        <section>
          <h2 style={{ fontWeight: 600, fontSize: 16, marginBottom: 12 }}>
            Таблица пользователей
          </h2>
          <UsersTable rolesRevision={rolesRevision} />
        </section>

        <section>
          <h2 style={{ fontWeight: 600, fontSize: 16, marginBottom: 12 }}>
            Права доступа по ролям
          </h2>
          <RolePermissionsMatrix onRolesChanged={handleRolesChanged} />
        </section>
      </div>
    </PageWrapper>
  )
}
