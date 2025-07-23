import React from 'react'
import TableWrapper from '@/components/common/TableWrapper'
import UsersTable from './UsersTable'
import TabsTable from './TabsTable'
import RolePermissionsMatrix from './RolePermissionsMatrix'
import useRoles from '@/hooks/useRoles'

export default function UsersMain() {
  const { roles, reloadRoles } = useRoles()

  return (
    <>
      <TableWrapper title="Пользователи">
        <UsersTable roleOptions={roles} />
      </TableWrapper>

      <TableWrapper title="Управление вкладками">
        <TabsTable />
      </TableWrapper>

      <TableWrapper title="Права доступа к вкладкам">
        <RolePermissionsMatrix onRolesUpdated={reloadRoles} />
      </TableWrapper>
    </>
  )
}
