import React, { useMemo, useState } from "react"
import { Col, Row } from "antd"
import UsersTable from "./UsersTable"
import ActiveUsersPanel from "./ActiveUsersPanel"
import CapabilityMatrix from "./CapabilityMatrix"
import RoleResponsibilityGuide, { ROLE_GUIDE } from "./RoleResponsibilityGuide"
import RoleZonesMatrix from "./RoleZonesMatrix"
import { useAuth } from "@/auth/AuthContext"

export default function UsersMain() {
  const [rolesRevision, setRolesRevision] = useState(0)
  const [permissionsRevision, setPermissionsRevision] = useState(0)
  const [selectedRoleSlug, setSelectedRoleSlug] = useState(ROLE_GUIDE[0]?.slug || "prodavec")
  const { user } = useAuth()

  const isAdmin = useMemo(() => {
    const role = String(user?.role || "").toLowerCase()
    return !!(user && (role === "admin" || user.role_id === 1 || user.is_admin))
  }, [user])

  const handleRolesChanged = () => {
    setRolesRevision(prev => prev + 1)
    setPermissionsRevision(prev => prev + 1)
  }

  const handlePermissionsChanged = () => {
    setPermissionsRevision(prev => prev + 1)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {isAdmin && (
        <section>
          <h2 style={{ fontWeight: 600, fontSize: 16, marginBottom: 12 }}>
            Кто сейчас в системе
          </h2>
          <ActiveUsersPanel />
        </section>
      )}

      <Row gutter={[24, 24]} align="top">
        <Col xs={24} xxl={14}>
          <section>
            <h2 style={{ fontWeight: 600, fontSize: 16, marginBottom: 12 }}>
              Пользователи
            </h2>
            <UsersTable rolesRevision={rolesRevision} />
          </section>
        </Col>
        <Col xs={24} xxl={10}>
          <section>
            <h2 style={{ fontWeight: 600, fontSize: 16, marginBottom: 12 }}>
              Роли по ответственности
            </h2>
            <RoleResponsibilityGuide
              selectedRoleSlug={selectedRoleSlug}
              onSelectRole={setSelectedRoleSlug}
            />
          </section>
        </Col>
      </Row>

      <section>
        <h2 style={{ fontWeight: 600, fontSize: 16, marginBottom: 12 }}>
          Настройка роли
        </h2>
        <RoleZonesMatrix
          revision={permissionsRevision}
          onRolesChanged={handleRolesChanged}
          onPermissionsChanged={handlePermissionsChanged}
          selectedRoleSlug={selectedRoleSlug}
        />
      </section>

      <section>
        <CapabilityMatrix
          revision={permissionsRevision}
          onChanged={handlePermissionsChanged}
          selectedRoleSlug={selectedRoleSlug}
        />
      </section>
    </div>
  )
}
