import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Alert, Button, Card, Col, Row, Space, Table, Tag, Typography } from "antd"
import { ReloadOutlined } from "@ant-design/icons"
import dayjs from "dayjs"
import axios from "@/api/axiosInstance"

const { Text } = Typography

const ENDPOINTS = ["/users/online", "/sessions/online"]
const ONLINE_WINDOW_MINUTES = 10

const ROLE_LABELS = {
  admin: "Администратор",
  prodavec: "Продавец",
  zakupshchik: "Закупщик",
  "nachalnik-otdela-zakupok": "Начальник отдела закупок",
  "specialist-po-katalogam": "Специалист по каталогам",
  nablyudatel: "Наблюдатель",
}

const ROLE_ZONE_LABELS = {
  admin: "Система и контроль",
  prodavec: "Заявки клиентов",
  zakupshchik: "RFQ и закупка",
  "nachalnik-otdela-zakupok": "Контроль и утверждение",
  "specialist-po-katalogam": "Каталоги",
  nablyudatel: "Просмотр",
}

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
    roleLabel: ROLE_LABELS[String(role || "").toLowerCase()] || row.role_name || role || "—",
    workZone: ROLE_ZONE_LABELS[String(role || "").toLowerCase()] || "Другая роль",
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
        dataIndex: "roleLabel",
        width: 160,
        render: (v) => <Tag>{v || "—"}</Tag>,
      },
      {
        title: "Рабочая зона",
        dataIndex: "workZone",
        width: 180,
        render: (v) => <Text>{v || "—"}</Text>,
      },
      {
        title: "Последний отклик",
        dataIndex: "lastActive",
        width: 200,
        render: (v) => formatTime(v),
      },
    ],
    [],
  )

  const summary = useMemo(() => {
    const byZone = rows.reduce((acc, row) => {
      acc[row.workZone] = (acc[row.workZone] || 0) + 1
      return acc
    }, {})

    return [
      {
        key: "total",
        title: "Сейчас в системе",
        value: rows.length,
        note: `Активность за последние ${ONLINE_WINDOW_MINUTES} минут`,
      },
      {
        key: "commercial",
        title: "Коммерческий контур",
        value: (byZone["Заявки клиентов"] || 0) + (byZone["Контроль и утверждение"] || 0),
        note: "Заявки клиентов и контроль",
      },
      {
        key: "procurement",
        title: "Закупочный контур",
        value: byZone["RFQ и закупка"] || 0,
        note: "RFQ, логистика, закупка",
      },
      {
        key: "catalogs",
        title: "Каталоги и просмотр",
        value: (byZone["Каталоги"] || 0) + (byZone["Просмотр"] || 0),
        note: "Каталоги, наблюдение, справка",
      },
    ]
  }, [rows])

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={12}>
      <Space align="center">
        <Button icon={<ReloadOutlined />} onClick={fetchOnline} loading={loading}>
          Обновить
        </Button>
        <Text type="secondary">
          Активность за последние {ONLINE_WINDOW_MINUTES} минут
        </Text>
      </Space>

      <Row gutter={[12, 12]}>
        {summary.map((item) => (
          <Col xs={24} sm={12} lg={6} key={item.key}>
            <Card size="small">
              <Space direction="vertical" size={2}>
                <Text type="secondary">{item.title}</Text>
                <Text style={{ fontSize: 24, fontWeight: 700 }}>{item.value}</Text>
                <Text type="secondary">{item.note}</Text>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {error ? (
        <Alert
          type="info"
          showIcon
          message="Список активных пользователей недоступен"
          description={error}
        />
      ) : null}

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
