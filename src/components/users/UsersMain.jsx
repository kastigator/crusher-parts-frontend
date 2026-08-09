import React, { useState } from "react"
import { Alert, Tabs } from "antd"
import UsersTable from "./UsersTable"
import ActiveUsersPanel from "./ActiveUsersPanel"
import CapabilityMatrix from "./CapabilityMatrix"
import RoleZonesMatrix from "./RoleZonesMatrix"
import UserActivityPanel from "./UserActivityPanel"
import RolesPanel from "./RolesPanel"
import SecurityAuditPanel from "./SecurityAuditPanel"

export default function UsersMain() {
  const [rolesRevision, setRolesRevision] = useState(0)
  const [permissionsRevision, setPermissionsRevision] = useState(0)
  const [selectedRoleSlug, setSelectedRoleSlug] = useState("prodavec")
  const [usersSnapshot, setUsersSnapshot] = useState([])

  const handleRolesChanged = () => {
    setRolesRevision((previous) => previous + 1)
    setPermissionsRevision((previous) => previous + 1)
  }

  const handlePermissionsChanged = () => {
    setPermissionsRevision((previous) => previous + 1)
  }

  const items = [
    {
      key: "users",
      label: "Пользователи",
      children: (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Alert
            type="info"
            showIcon
            message="Учетная запись и доступ разделены"
            description="Статус управляет входом, роли назначают обязанности, а эффективные capabilities показывают итоговый доступ. Отключение сохраняет исторические ссылки пользователя."
          />
          <UsersTable rolesRevision={rolesRevision} onUsersLoaded={setUsersSnapshot} />
        </div>
      ),
    },
    {
      key: "roles",
      label: "Роли и полномочия",
      children: (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <RolesPanel
            revision={rolesRevision}
            selectedRoleSlug={selectedRoleSlug}
            onSelectRole={setSelectedRoleSlug}
            onChanged={handleRolesChanged}
          />
          <CapabilityMatrix
            revision={permissionsRevision}
            onChanged={handlePermissionsChanged}
            selectedRoleSlug={selectedRoleSlug}
          />
        </div>
      ),
    },
    {
      key: "security",
      label: "Аудит и сессии",
      children: (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <section>
            <h2 style={{ fontWeight: 600, fontSize: 16 }}>Активные сессии</h2>
            <ActiveUsersPanel />
          </section>
          <section>
            <h2 style={{ fontWeight: 600, fontSize: 16 }}>Аудит безопасности</h2>
            <SecurityAuditPanel />
          </section>
          <section>
            <h2 style={{ fontWeight: 600, fontSize: 16 }}>Операционная активность пользователей</h2>
            <UserActivityPanel users={usersSnapshot} />
          </section>
        </div>
      ),
    },
    {
      key: "legacy",
      label: "Legacy-диагностика",
      children: (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Alert
            type="warning"
            showIcon
            message="Временный compatibility adapter"
            description="Матрица вкладок и URL сохраняется только для доменных callers, еще не мигрированных на capabilities. Она не является каноническим источником Administration access."
          />
          <RoleZonesMatrix
            revision={permissionsRevision}
            onRolesChanged={handleRolesChanged}
            onPermissionsChanged={handlePermissionsChanged}
            selectedRoleSlug={selectedRoleSlug}
          />
        </div>
      ),
    },
  ]

  return <Tabs items={items} destroyInactiveTabPane={false} />
}
