import React, { useEffect, useMemo, useState } from "react"
import { Button, Card, Checkbox, Col, Input, Row, Space, Tag, Typography, message } from "antd"
import { PlusOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import useCapabilities from "@/hooks/useCapabilities"
import { runTrashDeleteFlow } from "@/utils/trashUi"

const { Paragraph, Text } = Typography

const PRIMARY_PATHS = [
  "/client-request-workspace",
  "/sourcing",
  "/kpi",
  "/catalogs",
  "/users",
]

const PATH_LABELS = {
  "/client-request-workspace": "Заявки клиентов",
  "/sourcing": "Закупочная проработка",
  "/kpi": "Показатели",
  "/catalogs": "Каталоги в меню",
  "/users": "Пользователи и роли",
}

export default function RoleZonesMatrix({ revision = 0, onRolesChanged, onPermissionsChanged, selectedRoleSlug = "" }) {
  const { can, isAdmin } = useCapabilities()
  const [roles, setRoles] = useState([])
  const [tabs, setTabs] = useState([])
  const [permissions, setPermissions] = useState({})
  const [presets, setPresets] = useState({})
  const [newRole, setNewRole] = useState("")
  const [loading, setLoading] = useState(false)
  const [applyingPreset, setApplyingPreset] = useState("")
  const canManageUsersRoles = isAdmin || can("administration.roles.manage")

  useEffect(() => {
    fetchData()
  }, [revision])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [rolesRes, permsRes, modelRes] = await Promise.all([
        axios.get("/roles"),
        axios.get("/role-permissions/raw"),
        axios.get("/role-permissions/access-model"),
      ])

      setRoles(rolesRes.data || [])
      const allZoneTabs = (modelRes.data?.sections || [])
        .flatMap((section) => section.tabs || [])
        .filter((tab) => PRIMARY_PATHS.includes(tab.path))
      const uniqueTabs = Array.from(new Map(allZoneTabs.map((tab) => [tab.id, tab])).values())
      setTabs(uniqueTabs)

      const matrix = {}
      for (const perm of permsRes.data || []) {
        matrix[`${perm.role_id}__${perm.tab_id}`] = perm.can_view === 1
      }
      setPermissions(matrix)

      const nextPresets = {}
      for (const preset of modelRes.data?.presets || []) {
        nextPresets[preset.slug] = preset
      }
      setPresets(nextPresets)
    } catch (err) {
      console.error("Ошибка загрузки ролей:", err)
      message.error("Не удалось загрузить настройки ролей")
    } finally {
      setLoading(false)
    }
  }

  const tabsByPath = useMemo(() => {
    const map = new Map()
    for (const tab of tabs) map.set(tab.path, tab)
    return map
  }, [tabs])

  const selectedRole = useMemo(() => {
    if (!selectedRoleSlug) return null
    return roles.find((role) => role.slug === selectedRoleSlug) || null
  }, [roles, selectedRoleSlug])

  const handleToggle = async (roleId, tabId) => {
    const key = `${roleId}__${tabId}`
    const newValue = !permissions[key]

    setPermissions((prev) => ({ ...prev, [key]: newValue }))

    try {
      await axios.put("/role-permissions", [
        { role_id: roleId, tab_id: tabId, can_view: newValue ? 1 : 0 },
      ])
      onPermissionsChanged?.()
    } catch (err) {
      console.error("Ошибка сохранения зоны роли:", err)
      message.error("Не удалось сохранить настройки роли")
      setPermissions((prev) => ({ ...prev, [key]: !newValue }))
    }
  }

  const handleAddRole = async () => {
    const value = newRole.trim()
    if (!value) return
    try {
      await axios.post("/roles", { name: value })
      setNewRole("")
      await fetchData()
      onRolesChanged?.()
      message.success("Роль добавлена")
    } catch (err) {
      console.error("Ошибка добавления роли:", err)
      message.error(err?.response?.data?.message || "Не удалось добавить роль")
    }
  }

  const handleDeleteRole = async (role) => {
    if (String(role.slug || "").toLowerCase() === "admin") {
      message.warning("Системную роль администратора удалять нельзя")
      return
    }

    try {
      const result = await runTrashDeleteFlow({
        entityType: "roles",
        entityId: role.id,
        deleteUrl: `/roles/${role.id}`,
        successMessage: "Роль перемещена в корзину",
      })
      if (!result?.deleted) return
      await fetchData()
      onRolesChanged?.()
    } catch (err) {
      console.error("Ошибка удаления роли:", err)
      message.error(err?.response?.data?.message || "Не удалось удалить роль")
    }
  }

  const applyPreset = async (roleSlug) => {
    setApplyingPreset(roleSlug)
    try {
      await axios.put(`/role-permissions/presets/${roleSlug}`)
      message.success("Рекомендованные зоны роли применены")
      await fetchData()
      onPermissionsChanged?.()
    } catch (err) {
      console.error("Ошибка применения набора:", err)
      message.error(err?.response?.data?.message || "Не удалось применить набор")
    } finally {
      setApplyingPreset("")
    }
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Paragraph type="secondary" style={{ marginBottom: 0 }}>
        Здесь задается, какие основные разделы человек видит в системе. Сначала определите его
        участок работы, а уже потом уточняйте, какие действия ему разрешены внутри процесса.
      </Paragraph>

      <Space>
        <Input
          placeholder="Новая роль"
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          onPressEnter={handleAddRole}
          style={{ width: 220 }}
          disabled={!canManageUsersRoles}
        />
          <Button icon={<PlusOutlined />} type="primary" onClick={handleAddRole} disabled={!canManageUsersRoles}>
            Добавить роль
          </Button>
      </Space>

      {!selectedRole ? (
        <Text type="secondary">Выберите роль выше, чтобы настроить ее видимые разделы.</Text>
      ) : (
        <Card
          loading={loading}
          title={`Что видит роль: ${selectedRole.name}`}
          extra={
            <Space>
              {presets[selectedRole.slug] ? (
                <Button
                  size="small"
                  onClick={() => applyPreset(selectedRole.slug)}
                  loading={applyingPreset === selectedRole.slug}
                  disabled={!canManageUsersRoles}
                >
                  Применить базовый набор
                </Button>
              ) : null}
              {String(selectedRole.slug || "").toLowerCase() !== "admin" && !presets[selectedRole.slug] ? (
                <Button danger size="small" onClick={() => handleDeleteRole(selectedRole)} disabled={!canManageUsersRoles}>
                  Удалить роль
                </Button>
              ) : null}
            </Space>
          }
        >
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            {presets[selectedRole.slug]?.description ? (
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                {presets[selectedRole.slug].description}
              </Paragraph>
            ) : (
              <Text type="secondary">Пользовательская роль без готовой типовой настройки.</Text>
            )}

            <Row gutter={[12, 12]}>
              {PRIMARY_PATHS.map((path) => {
                const tab = tabsByPath.get(path)
                return (
                  <Col xs={24} md={12} key={path}>
                    <Card size="small">
                      <Space align="start" style={{ width: "100%", justifyContent: "space-between" }}>
                        <Space direction="vertical" size={2}>
                          <Text strong>{PATH_LABELS[path]}</Text>
                          <Text type="secondary">
                            {path === "/client-request-workspace" && "Работа с заявками клиента, КП и контрактом."}
                            {path === "/sourcing" && "Закупочные проработки, запросы поставщикам, предложения, покрытие и решения."}
                            {path === "/kpi" && "Отчеты, показатели и обзорные метрики."}
                            {path === "/catalogs" && "Отдельный раздел каталогов в меню."}
                            {path === "/users" && "Управление пользователями, ролями и доступом."}
                          </Text>
                        </Space>
                        {tab ? (
                          <Checkbox
                            checked={!!permissions[`${selectedRole.id}__${tab.id}`]}
                            onChange={() => handleToggle(selectedRole.id, tab.id)}
                            disabled={!canManageUsersRoles}
                          />
                        ) : (
                          <Text type="secondary">—</Text>
                        )}
                      </Space>
                    </Card>
                  </Col>
                )
              })}
            </Row>

            <Space>
              {presets[selectedRole.slug] ? <Tag color="blue">Стандартная роль</Tag> : <Tag>Пользовательская роль</Tag>}
            </Space>
          </Space>
        </Card>
      )}
    </Space>
  )
}
