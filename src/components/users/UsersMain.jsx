import React, { useEffect, useState } from "react"
import PageWrapper from "@/components/common/PageWrapper.jsx"
import UsersTable from "./UsersTable.jsx"
import RolePermissionsMatrix from "./RolePermissionsMatrix.jsx"
import TabsTable from "./TabsTable.jsx"
import axios from "@/api/axiosInstance.js"

export default function UsersMain() {
  const [roles, setRoles] = useState([])

  const reloadRoles = async () => {
    const res = await axios.get("/roles")
    const formatted = res.data
      .filter(r => r.slug !== "admin")
      .map(r => ({ value: r.id, label: r.name }))
    setRoles(formatted)
  }

  useEffect(() => {
    reloadRoles()
  }, [])

  return (
    <PageWrapper title="Пользователи и доступ">
      <UsersTable roles={roles} />
      <RolePermissionsMatrix reloadRoles={reloadRoles} />
      <TabsTable />
    </PageWrapper>
  )
}
