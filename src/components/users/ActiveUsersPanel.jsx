import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Table, Button, Space, Tag, Typography } from "antd"
import { ReloadOutlined } from "@ant-design/icons"
import dayjs from "dayjs"
import axios from "@/api/axiosInstance"

const { Text } = Typography

const ENDPOINTS = ["/users/online", "/sessions/online"]

const formatTime = (value) => {
  if (!value) return "—"
  const d = dayjs(value)
  return d.isValid() ? d.format("YYYY-MM-DD HH:mm:ss") : String(value)
}

const normalizeRow = (row) => {
  const id =
    row.session_id ||
    row.sessionId ||
    row.user_id ||
    row.userId ||
    row.id ||
    row.user?.id ||
    row.user?.user_id
  const name =
    row.full_name ||
    row.fullName ||
    row.username ||
    row.user_name ||
    row.user?.full_name ||
    row.user?.username ||
    (id ? `User #${id}` : "—")
  const role =
    row.role ||
    row.role_name ||
    row.user?.role ||
    row.user?.role_name ||
    row.user?.role_slug ||
    "—"
  const lastActive =
    row.last_active_at ||
    row.last_seen_at ||
    row.last_seen ||
    row.lastSeen ||
    row.updated_at ||
    row.updatedAt ||
    row.login_at ||
    row.loginAt
  const ip =
    row.ip ||
    row.ip_address ||
    row.remote_ip ||
    row.remoteIp ||
    "—"
  const status =
    row.status ||
    row.state ||
    (row.is_active === true || row.active === true ? "active" : null)

  return {
    id: id || `${name}-${ip}-${lastActive || "na"}`,
    name,
    role,
    lastActive,
    ip,
    status,
  }
}

export default function ActiveUsersPanel() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const fetchOnline = useCallback(async () => {
    setLoading(true)
    setError("")
    for (const endpoint of ENDPOINTS) {
      try {
        const { data } = await axios.get(endpoint)
        const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
        const normalized = list.map(normalizeRow)
        setRows(normalized)
        setLoading(false)
        return
      } catch (err) {
        const status = err?.response?.status
        if (status === 404 || status === 501) {
          continue
        }
        setError(err?.response?.data?.message || "Не удалось загрузить список")
        setLoading(false)
        return
      }
    }
    setError("API активных пользователей не настроен")
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchOnline()
  }, [fetchOnline])

  const columns = useMemo(
    () => [
      {
        title: "Пользователь",
        dataIndex: "name",
        ellipsis: true,
      },
      {
        title: "Роль",
        dataIndex: "role",
        width: 160,
        render: (v) => <Tag>{v || "—"}</Tag>,
      },
      {
        title: "Последняя активность",
        dataIndex: "lastActive",
        width: 200,
        render: (v) => formatTime(v),
      },
      {
        title: "IP",
        dataIndex: "ip",
        width: 160,
        render: (v) => v || "—",
      },
      {
        title: "Статус",
        dataIndex: "status",
        width: 120,
        render: (v) =>
          v ? <Tag color="green">{v}</Tag> : <Text type="secondary">—</Text>,
      },
    ],
    [],
  )

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={12}>
      <Space align="center">
        <Button icon={<ReloadOutlined />} onClick={fetchOnline} loading={loading}>
          Обновить
        </Button>
        <Text type="secondary">
          Сейчас в системе: {rows.length}
        </Text>
      </Space>
      {error && <Text type="secondary">{error}</Text>}
      <Table
        rowKey="id"
        size="small"
        className="op-table"
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={false}
      />
    </Space>
  )
}
