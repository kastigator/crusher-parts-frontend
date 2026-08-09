import React, { useEffect, useState } from "react"
import { Alert, Table, Tag, message } from "antd"
import axios from "@/api/axiosInstance"
import useCapabilities from "@/hooks/useCapabilities"

export default function SecurityAuditPanel() {
  const { can } = useCapabilities()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const allowed = can("administration.audit.view")

  useEffect(() => {
    if (!allowed) return
    setLoading(true)
    axios.get("/security-audit", { params: { limit: 100 } })
      .then(({ data }) => setRows(data || []))
      .catch((error) => message.error(error?.response?.data?.message || "Не удалось загрузить аудит"))
      .finally(() => setLoading(false))
  }, [allowed])

  if (!allowed) {
    return <Alert type="info" showIcon message="Нет полномочия administration.audit.view" />
  }

  const columns = [
    { title: "Время", dataIndex: "created_at", width: 190 },
    { title: "Событие", dataIndex: "event_type", render: (value) => <Tag color="blue">{value}</Tag> },
    { title: "Инициатор", dataIndex: "actor_username", render: (value) => value || "Система" },
    { title: "Пользователь", dataIndex: "target_username", render: (value) => value || "—" },
    { title: "Объект", render: (_, row) => row.entity_type ? `${row.entity_type}:${row.entity_id || "—"}` : "—" },
  ]

  return <Table rowKey="id" columns={columns} dataSource={rows} loading={loading} pagination={{ pageSize: 20 }} />
}
