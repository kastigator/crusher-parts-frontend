import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  DatePicker,
  Drawer,
  Empty,
  Row,
  Segmented,
  Space,
  Table,
  Tag,
  Timeline,
  Typography,
} from "antd"
import { BarChartOutlined, ReloadOutlined } from "@ant-design/icons"
import dayjs from "dayjs"
import axios from "@/api/axiosInstance"
import {
  buildMeaningfulTimeline,
  buildScreenSummary,
  buildTechnicalEvents,
  formatDateTime,
  formatDuration,
  formatSessionStatus,
  getActivityVerdict,
  resolveScreenInfo,
} from "./activityPresentation"

const { Text } = Typography

export default function UserActivityPanel({ users = [] }) {
  const [timelineMode, setTimelineMode] = useState("business")
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [summary, setSummary] = useState([])
  const [drawerUser, setDrawerUser] = useState(null)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [drawerError, setDrawerError] = useState("")
  const [drawerOverview, setDrawerOverview] = useState(null)
  const [drawerSessions, setDrawerSessions] = useState([])
  const [drawerEvents, setDrawerEvents] = useState([])

  const selectedDateParam = selectedDate.format("YYYY-MM-DD")

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const { data } = await axios.get("/user-activity/summary", {
        params: { date: selectedDateParam },
      })
      setSummary(Array.isArray(data?.users) ? data.users : [])
    } catch (err) {
      setError(err?.response?.data?.message || "Не удалось загрузить сводку активности")
    } finally {
      setLoading(false)
    }
  }, [selectedDateParam])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const summaryByUserId = useMemo(() => {
    const map = new Map()
    for (const row of summary) {
      map.set(row.user_id, row)
    }
    return map
  }, [summary])

  const mergedUsers = useMemo(
    () =>
      users.map((user) => ({
        ...user,
        activity: summaryByUserId.get(user.id) || null,
      })),
    [users, summaryByUserId],
  )

  const topSummary = useMemo(() => {
    const activeUsers = summary.filter((row) => row.online_now).length
    const activeToday = summary.filter(
      (row) => Number(row.session_duration_sec || 0) > 0 || Number(row.actions_count || 0) > 0,
    ).length
    const totalSessionSeconds = summary.reduce(
      (acc, row) => acc + Number(row.session_duration_sec || 0),
      0,
    )
    const totalEngagedSeconds = summary.reduce(
      (acc, row) => acc + Number(row.engaged_duration_sec || 0),
      0,
    )

    return [
      { key: "online", title: "Сейчас онлайн", value: activeUsers, note: "Окно 10 минут" },
      { key: "active", title: "Активны сегодня", value: activeToday, note: "Есть сессии или действия" },
      {
        key: "session",
        title: "В системе сегодня",
        value: formatDuration(totalSessionSeconds),
        note: "Сумма длительностей сессий",
      },
      {
        key: "engaged",
        title: "Активное время",
        value: formatDuration(totalEngagedSeconds),
        note: "Событийная оценка вовлеченности",
      },
    ]
  }, [summary])

  const drawerScreenSummary = useMemo(
    () => buildScreenSummary(drawerOverview, drawerEvents),
    [drawerEvents, drawerOverview],
  )

  const drawerMeaningfulTimeline = useMemo(
    () => buildMeaningfulTimeline(drawerEvents),
    [drawerEvents],
  )

  const drawerTimelineItems = useMemo(() => {
    if (timelineMode === "writes") {
      return drawerMeaningfulTimeline.filter((item) => item.event_type === "write_action")
    }
    if (timelineMode === "all") {
      return drawerMeaningfulTimeline
    }
    return drawerMeaningfulTimeline.filter((item) =>
      ["write_action", "login", "logout"].includes(String(item.event_type || "").toLowerCase()),
    )
  }, [drawerMeaningfulTimeline, timelineMode])

  const drawerTechnicalEvents = useMemo(
    () => buildTechnicalEvents(drawerEvents),
    [drawerEvents],
  )

  const drawerVerdict = useMemo(
    () => getActivityVerdict(drawerOverview),
    [drawerOverview],
  )

  const openUserDrawer = useCallback(
    async (user) => {
      setDrawerUser(user)
      setDrawerLoading(true)
      setDrawerError("")
      try {
        const [overviewRes, sessionsRes, timelineRes] = await Promise.all([
          axios.get(`/user-activity/users/${user.id}/overview`, { params: { date: selectedDateParam } }),
          axios.get(`/user-activity/users/${user.id}/sessions`, { params: { date: selectedDateParam } }),
          axios.get(`/user-activity/users/${user.id}/timeline`, {
            params: { date: selectedDateParam, limit: 200 },
          }),
        ])
        setDrawerOverview(overviewRes.data?.user || null)
        setDrawerSessions(sessionsRes.data?.sessions || [])
        setDrawerEvents(timelineRes.data?.events || [])
      } catch (err) {
        setDrawerError(err?.response?.data?.message || "Не удалось загрузить историю пользователя")
      } finally {
        setDrawerLoading(false)
      }
    },
    [selectedDateParam],
  )

  const userColumns = useMemo(
    () => [
      {
        title: "Пользователь",
        dataIndex: "full_name",
        render: (_, record) => record.full_name || record.username || "—",
      },
      {
        title: "Статус",
        key: "online_now",
        width: 120,
        render: (_, record) =>
          record.activity?.online_now ? <Tag color="green">Онлайн</Tag> : <Tag>Оффлайн</Tag>,
      },
      {
        title: "Последняя активность",
        key: "last_seen_at",
        width: 190,
        render: (_, record) => formatDateTime(record.activity?.last_seen_at),
      },
      {
        title: "Сегодня в системе",
        key: "session_duration_sec",
        width: 150,
        render: (_, record) => formatDuration(record.activity?.session_duration_sec),
      },
      {
        title: "Активное время",
        key: "engaged_duration_sec",
        width: 150,
        render: (_, record) => formatDuration(record.activity?.engaged_duration_sec),
      },
      {
        title: "Действий",
        key: "actions_count",
        width: 110,
        render: (_, record) => Number(record.activity?.actions_count || 0),
      },
      {
        title: "Последний экран",
        key: "current_path",
        width: 200,
        render: (_, record) => resolveScreenInfo(record.activity?.current_path).label || "—",
      },
      {
        title: "",
        key: "history",
        width: 120,
        render: (_, record) => (
          <Button icon={<BarChartOutlined />} onClick={() => openUserDrawer(record)}>
            История
          </Button>
        ),
      },
    ],
    [openUserDrawer],
  )

  const sessionColumns = useMemo(
    () => [
      {
        title: "Начало",
        dataIndex: "started_at",
        width: 180,
        render: formatDateTime,
      },
      {
        title: "Последний отклик",
        dataIndex: "last_seen_at",
        width: 180,
        render: formatDateTime,
      },
      {
        title: "Длительность",
        dataIndex: "duration_sec",
        width: 140,
        render: formatDuration,
      },
      {
        title: "Активно",
        dataIndex: "engaged_duration_sec",
        width: 140,
        render: formatDuration,
      },
      {
        title: "Маршрут",
        dataIndex: "top_path",
        render: (value) => resolveScreenInfo(value).label,
      },
      {
        title: "Завершение",
        dataIndex: "status",
        width: 180,
        render: (_, record) => {
          const status = formatSessionStatus(record)
          return <Tag color={status.color}>{status.label}</Tag>
        },
      },
    ],
    [],
  )

  const screenColumns = useMemo(
    () => [
      {
        title: "Экран",
        dataIndex: "screen_label",
        render: (value, record) => (
          <Space direction="vertical" size={0}>
            <Text>{value}</Text>
            <Text type="secondary">{record.section_label}</Text>
          </Space>
        ),
      },
      {
        title: "Время",
        dataIndex: "duration_sec",
        width: 120,
        render: formatDuration,
      },
      {
        title: "Переходов",
        dataIndex: "visits_count",
        width: 120,
        render: (value) => Number(value || 0),
      },
      {
        title: "Последний визит",
        dataIndex: "last_visit_at",
        width: 180,
        render: formatDateTime,
      },
    ],
    [],
  )

  const technicalEventColumns = useMemo(
    () => [
      {
        title: "Время",
        dataIndex: "event_time",
        width: 180,
        render: formatDateTime,
      },
      {
        title: "Событие",
        dataIndex: "event_type",
        width: 220,
        render: (_, record) => <Tag>{record.event_label}</Tag>,
      },
      {
        title: "Экран",
        dataIndex: "screen_label",
        render: (value) => value || "—",
      },
      {
        title: "Сущность",
        key: "entity",
        width: 180,
        render: (_, record) =>
          record.entity_label || (record.entity_type ? `${record.entity_type} #${record.entity_id || "—"}` : "—"),
      },
    ],
    [],
  )

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Space align="center" wrap>
        <DatePicker value={selectedDate} onChange={(value) => value && setSelectedDate(value)} />
        <Button icon={<ReloadOutlined />} onClick={fetchSummary} loading={loading}>
          Обновить сводку
        </Button>
        <Text type="secondary">История активности и времени в системе за выбранный день</Text>
      </Space>

      <Row gutter={[12, 12]}>
        {topSummary.map((item) => (
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
          type="warning"
          showIcon
          message="Сводка активности недоступна"
          description={error}
        />
      ) : null}

      <Table
        rowKey="id"
        size="small"
        className="op-table"
        loading={loading}
        columns={userColumns}
        dataSource={mergedUsers}
        pagination={false}
        scroll={{ x: 1200 }}
      />

      <Drawer
        open={!!drawerUser}
        onClose={() => {
          setDrawerUser(null)
          setDrawerOverview(null)
          setDrawerSessions([])
          setDrawerEvents([])
          setDrawerError("")
          setTimelineMode("business")
        }}
        title={drawerUser ? `История активности: ${drawerUser.full_name || drawerUser.username}` : "История активности"}
        width={920}
      >
        {drawerError ? (
          <Alert type="warning" showIcon message={drawerError} />
        ) : null}

        {!drawerLoading && !drawerOverview ? (
          <Empty description="Нет данных по пользователю" />
        ) : null}

        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {drawerOverview ? (
            <Alert
              type={drawerVerdict.color === "green" ? "success" : drawerVerdict.color === "gold" ? "warning" : "info"}
              showIcon
              message={drawerVerdict.label}
              description={drawerVerdict.note}
            />
          ) : null}

          {drawerOverview ? (
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={12} lg={6}>
                <Card size="small">
                  <Text type="secondary">Статус</Text>
                  <div>{drawerOverview.online_now ? <Tag color="green">Онлайн</Tag> : <Tag>Оффлайн</Tag>}</div>
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card size="small">
                  <Text type="secondary">В системе</Text>
                  <div>{formatDuration(drawerOverview.session_duration_sec)}</div>
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card size="small">
                  <Text type="secondary">Активное время</Text>
                  <div>{formatDuration(drawerOverview.engaged_duration_sec)}</div>
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card size="small">
                  <Text type="secondary">Осмысленных действий</Text>
                  <div>{Number(drawerOverview.actions_count || 0)}</div>
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card size="small">
                  <Text type="secondary">Последний экран</Text>
                  <div>{resolveScreenInfo(drawerOverview.current_path).label}</div>
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card size="small">
                  <Text type="secondary">Сессий за день</Text>
                  <div>{Number(drawerOverview.sessions_in_range || 0)}</div>
                </Card>
              </Col>
            </Row>
          ) : null}

          <div>
            <Typography.Title level={5}>Что тестировал</Typography.Title>
            <Table
              rowKey="screen_key"
              size="small"
              columns={screenColumns}
              dataSource={drawerScreenSummary}
              pagination={false}
              loading={drawerLoading}
              locale={{ emptyText: "Нет данных по экранам" }}
            />
          </div>

          <div>
            <Space
              align="center"
              justify="space-between"
              style={{ width: "100%", marginBottom: 12 }}
              wrap
            >
              <Typography.Title level={5} style={{ margin: 0 }}>
                Основные действия
              </Typography.Title>
              <Segmented
                value={timelineMode}
                onChange={setTimelineMode}
                options={[
                  { label: "Бизнес-действия", value: "business" },
                  { label: "Все смысловые", value: "all" },
                  { label: "Только изменения", value: "writes" },
                ]}
              />
            </Space>
            {drawerTimelineItems.length ? (
              <Timeline
                items={drawerTimelineItems.map((item) => ({
                  color: item.tone || "blue",
                  children: (
                    <Space direction="vertical" size={0}>
                      <Text>{item.label}</Text>
                      <Text type="secondary">
                        {formatDateTime(item.event_time)}
                        {item.secondary ? ` · ${item.secondary}` : ""}
                      </Text>
                    </Space>
                  ),
                }))}
              />
            ) : (
              <Empty
                description={
                  timelineMode === "writes"
                    ? "Нет изменений данных за период"
                    : timelineMode === "business"
                      ? "Нет бизнес-действий за период"
                      : "Нет смысловых действий за период"
                }
              />
            )}
          </div>

          <div>
            <Typography.Title level={5}>Сессии</Typography.Title>
            <Table
              rowKey={(record) => record.id || record.session_id}
              size="small"
              columns={sessionColumns}
              dataSource={drawerSessions}
              pagination={false}
              loading={drawerLoading}
              scroll={{ x: 900 }}
            />
          </div>

          <Collapse
            items={[
              {
                key: "tech-events",
                label: "Технические события",
                children: (
                  <Table
                    rowKey="id"
                    size="small"
                    columns={technicalEventColumns}
                    dataSource={drawerTechnicalEvents}
                    pagination={false}
                    loading={drawerLoading}
                    scroll={{ x: 900 }}
                  />
                ),
              },
            ]}
          />
        </Space>
      </Drawer>
    </Space>
  )
}
