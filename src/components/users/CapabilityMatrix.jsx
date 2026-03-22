import React, { useEffect, useMemo, useState } from "react"
import { Alert, Button, Card, Checkbox, Col, Row, Space, Tooltip, Typography, message } from "antd"
import axios from "@/api/axiosInstance"

const { Text } = Typography

const SECTION_LABELS = {
  workspaces: "Доступ к контурам работы",
  catalogs: "Каталоги и справочники",
  workflow: "Действия внутри процесса",
  administration: "Администрирование",
  other: "Прочее",
}

export default function CapabilityMatrix({ revision = 0, onChanged, selectedRoleSlug = "" }) {
  const [roles, setRoles] = useState([])
  const [capabilities, setCapabilities] = useState([])
  const [assignments, setAssignments] = useState({})
  const [presets, setPresets] = useState({})
  const [loading, setLoading] = useState(false)
  const [applyingPreset, setApplyingPreset] = useState("")

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await axios.get("/capabilities/matrix")
        setRoles((data.roles || []).filter((role) => role.slug !== "admin"))
        setCapabilities(data.capabilities || [])
        setPresets(data.presets || {})
        const matrix = {}
        for (const item of data.assignments || []) {
          matrix[`${item.role_id}__${item.capability_id}`] = item.is_allowed === 1
        }
        setAssignments(matrix)
      } catch (err) {
        console.error("Ошибка загрузки capabilities:", err)
        message.error("Не удалось загрузить capabilities")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [revision])

  const grouped = useMemo(() => {
    const groups = new Map()
    for (const capability of capabilities) {
      const key = capability.section || "other"
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(capability)
    }
    return Array.from(groups.entries())
  }, [capabilities])

  const selectedRole = useMemo(() => {
    if (!selectedRoleSlug) return null
    return roles.find((role) => role.slug === selectedRoleSlug) || null
  }, [roles, selectedRoleSlug])

  const visibleGroups = useMemo(() => {
    if (!selectedRole) return []

    const allowAdministrationSection =
      selectedRole.slug === "admin" || selectedRole.slug === "nachalnik-otdela-zakupok"

    return grouped.filter(([section, items]) => {
      if (section !== "administration") return true
      if (allowAdministrationSection) return true
      return items.some((capability) => !!assignments[`${selectedRole.id}__${capability.id}`])
    })
  }, [assignments, grouped, selectedRole])

  const toggleAssignment = async (roleId, capabilityId) => {
    const key = `${roleId}__${capabilityId}`
    const next = !assignments[key]
    setAssignments((prev) => ({ ...prev, [key]: next }))

    try {
      await axios.put("/capabilities/matrix", [
        {
          role_id: roleId,
          capability_id: capabilityId,
          is_allowed: next ? 1 : 0,
        },
      ])
      onChanged?.()
    } catch (err) {
      console.error("Ошибка сохранения capabilities:", err)
      message.error("Не удалось сохранить capability")
      setAssignments((prev) => ({ ...prev, [key]: !next }))
    }
  }

  const applyPreset = async (roleSlug) => {
    setApplyingPreset(roleSlug)
    try {
      await axios.put(`/capabilities/presets/${roleSlug}`)
      message.success("Capability-пресет применен")
      onChanged?.()
    } catch (err) {
      console.error("Ошибка применения capability-пресета:", err)
      message.error(err?.response?.data?.message || "Не удалось применить capability-пресет")
    } finally {
      setApplyingPreset("")
    }
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="Здесь настраиваются реальные полномочия роли"
        description="Если человек видит раздел, но не может в нем работать, обычно не хватает именно этих прав. Для типовых ролей достаточно применить готовый набор и затем точечно скорректировать исключения."
      />
      {!selectedRole ? (
        <Text type="secondary">Выберите роль выше, чтобы настроить ее действия.</Text>
      ) : (
        <Card
          loading={loading}
          title={`Что может делать роль: ${selectedRole.name}`}
          extra={
            presets[selectedRole.slug] ? (
              <Button
                size="small"
                onClick={() => applyPreset(selectedRole.slug)}
                loading={applyingPreset === selectedRole.slug}
              >
                Применить базовые действия
              </Button>
            ) : null
          }
        >
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            {visibleGroups.map(([section, items]) => (
              <Card key={section} size="small" title={SECTION_LABELS[section] || section}>
                <Row gutter={[12, 12]}>
                  {items.map((capability) => (
                    <Col xs={24} md={12} key={capability.id}>
                      <Card size="small">
                        <Space align="start" style={{ width: "100%", justifyContent: "space-between" }}>
                          <Space direction="vertical" size={2}>
                            <Tooltip title={capability.description}>
                              <Text strong>{capability.name}</Text>
                            </Tooltip>
                            <Text type="secondary">{capability.description}</Text>
                          </Space>
                          <Checkbox
                            checked={!!assignments[`${selectedRole.id}__${capability.id}`]}
                            onChange={() => toggleAssignment(selectedRole.id, capability.id)}
                          />
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card>
            ))}
          </Space>
        </Card>
      )}
    </Space>
  )
}
