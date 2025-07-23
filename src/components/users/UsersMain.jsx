import React, { useEffect, useState } from "react"
import PageWrapper from "@/components/common/PageWrapper.jsx"
import UsersTable from "./UsersTable.jsx"
import RolePermissionsMatrix from "./RolePermissionsMatrix.jsx"
import TabsTable from "./TabsTable.jsx"
import axios from "@/api/axiosInstance.js"

export default function UsersMain() {
  const [allRoles, setAllRoles] = useState([])

  const reloadRoles = async () => {
    const res = await axios.get("/roles")
    const formatted = res.data.map(r => ({
      value: r.id,
      label: r.name,
      slug: r.slug,
      id: r.id, // нужно для RolePermissionsMatrix
      name: r.name
    }))
    setAllRoles(formatted)
  }

  useEffect(() => {
    reloadRoles()
  }, [])

  const rolesForUsers = allRoles
  const rolesForMatrix = allRoles.filter(r => r.slug !== "admin")

  return (
    <PageWrapper>
      <UsersTable roles={rolesForUsers} />
      <RolePermissionsMatrix reloadRoles={reloadRoles} roles={rolesForMatrix} />
      <TabsTable />
    </PageWrapper>
  )
}
