import React, { useEffect, useState } from "react"
import { Table, Checkbox, Button, Input, Space, message } from "antd"
import { PlusOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"

export default function RolePermissionsMatrix({ onRolesChanged }) {
  const [roles, setRoles] = useState([])
  const [tabs, setTabs] = useState([])
  const [permissions, setPermissions] = useState({})
  const [newRole, setNewRole] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [rolesRes, tabsRes, permsRes] = await Promise.all([
        axios.get("/roles"),
        axios.get("/tabs"),
        axios.get("/role-permissions/raw")
      ])

      const filteredRoles = (rolesRes.data || []).filter(r => r.slug !== "admin")
      setRoles(filteredRoles)
      setTabs((tabsRes.data || []).filter(t => t.slug !== "users"))

      const matrix = {}
      for (const perm of permsRes.data || []) {
        matrix[`${perm.role_id}__${perm.tab_id}`] = perm.can_view === 1
      }
      setPermissions(matrix)
    } catch (err) {
      console.error("Ошибка загрузки данных:", err)
      message.error("Ошибка загрузки данных")
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (roleId, tabId) => {
    const key = `${roleId}__${tabId}`
    const newValue = !permissions[key]

    setPermissions(prev => ({
      ...prev,
      [key]: newValue
    }))

    try {
      await axios.put("/role-permissions", [
        { role_id: roleId, tab_id: tabId, can_view: newValue ? 1 : 0 }
      ])
    } catch (err) {
      message.error("Ошибка при сохранении")
      console.error("Ошибка при сохранении права:", err)
    }
  }

  const handleAddRole = async () => {
    const value = newRole.trim()
    if (!value) return

    try {
      await axios.post("/roles", { name: value })
      setNewRole("")
      await fetchData()
      onRolesChanged && onRolesChanged()
      message.success("Роль добавлена")
    } catch (err) {
      console.error("Ошибка добавления роли:", err)
      message.error(err.response?.data?.message || "Не удалось добавить роль")
    }
  }

  const handleDeleteRole = async (role) => {
    const { confirmed } = await confirmAction(`Удалить роль "${role.name}"?`)
    if (!confirmed) return

    try {
      const usersRes = await axios.get("/users")
      const usedBy = usersRes.data.filter(u => u.role_id === role.id)

      if (usedBy.length > 0) {
        const names = usedBy.map(u => u.full_name || u.username).join(", ")
        return message.warning(`Роль используется у пользователей: ${names}`)
      }

      await axios.delete(`/roles/${role.id}`)
      await fetchData()
      onRolesChanged && onRolesChanged()
      message.success("Роль удалена")
    } catch (err) {
      console.error("Ошибка удаления роли:", err)
      message.error(err.response?.data?.message || "Не удалось удалить роль")
    }
  }

  const columns = [
    {
      title: "Роль",
      dataIndex: "name",
      key: "name",
      fixed: "left"
    },
    ...tabs.map(tab => ({
      title: tab.name,
      dataIndex: `tab_${tab.id}`,
      align: "center",
      render: (_, role) => (
        <Checkbox
          checked={!!permissions[`${role.id}__${tab.id}`]}
          onChange={() => handleToggle(role.id, tab.id)}
        />
      )
    })),
    {
      title: "",
      key: "actions",
      fixed: "right",
      render: (_, role) => (
        <ActionButtons
          onDelete={() => handleDeleteRole(role)}
          size="small"
        />
      )
    }
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="Новая роль"
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          onPressEnter={handleAddRole}
        />
        <Button
          icon={<PlusOutlined />}
          type="primary"
          onClick={handleAddRole}
        >
          Добавить
        </Button>
      </Space>
      <Table
        rowKey="id"
        dataSource={roles}
        columns={columns}
        loading={loading}
        scroll={{ x: true }}
        pagination={false}
        size="middle"
      />
    </div>
  )
}
