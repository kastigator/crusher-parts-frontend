import React, { useMemo, useState } from "react"
import TabsTable from "./TabsTable"
import UsersTable from "./UsersTable"
import RolePermissionsMatrix from "./RolePermissionsMatrix"
import ActiveUsersPanel from "./ActiveUsersPanel"
import PageWrapper from "@/components/common/PageWrapper"
import { useAuth } from "@/auth/AuthContext"

export default function UsersMain() {
  const [rolesRevision, setRolesRevision] = useState(0)
  const { user } = useAuth()

  const isAdmin = useMemo(() => {
    const role = String(user?.role || "").toLowerCase()
    return !!(user && (role === "admin" || user.role_id === 1 || user.is_admin))
  }, [user])

  const handleRolesChanged = () => {
    setRolesRevision(prev => prev + 1)
  }

  return (
    <PageWrapper>
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {isAdmin && (
          <section>
            <h2 style={{ fontWeight: 600, fontSize: 16, marginBottom: 12 }}>
              Активные пользователи
            </h2>
            <ActiveUsersPanel />
          </section>
        )}

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
