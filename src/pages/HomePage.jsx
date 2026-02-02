import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Empty,
  Form,
  Modal,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd"
import { ReloadOutlined } from "@ant-design/icons"
import { useNavigate } from "react-router-dom"
import dayjs from "dayjs"
import axios from "@/api/axiosInstance"
import { useAuth } from "@/auth/AuthContext"

const { Title, Text } = Typography

const statusLabel = (value) => {
  if (!value) return "—"
  const labels = {
    draft: "Черновик",
    in_progress: "В работе",
    released_to_procurement: "Релиз в закупку",
    structured: "Структура готова",
    sent: "RFQ отправлен",
    responded: "Ответы получены",
    rfq_created: "RFQ создан",
    rfq_sent: "RFQ отправлен",
    responses_received: "Ответы получены",
    selection_done: "Выбор сделан",
    quote_prepared: "КП подготовлено",
    contracted: "Контракт",
    cancelled: "Отменено",
  }
  return labels[value] || value
}

const statusColor = (value) => {
  if (!value) return "default"
  if (value === "released_to_procurement") return "orange"
  if (value === "structured") return "cyan"
  if (value === "sent" || value === "rfq_sent") return "blue"
  if (value === "responded" || value === "responses_received") return "green"
  if (value === "rfq_created") return "geekblue"
  if (value === "contracted") return "purple"
  if (value === "cancelled") return "red"
  if (value === "draft") return "default"
  return "gold"
}

const formatDate = (value) => {
  if (!value) return "—"
  try {
    return dayjs(value).format("DD.MM.YYYY")
  } catch {
    return "—"
  }
}

const CLOSED_REQUEST_STATUSES = ["contracted", "cancelled"]

const REQUEST_STATUS_ORDER = [
  "draft",
  "in_progress",
  "released_to_procurement",
  "rfq_created",
  "rfq_sent",
  "responses_received",
  "selection_done",
  "quote_prepared",
  "contracted",
  "cancelled",
]

const RFQ_STATUS_ORDER = ["draft", "structured", "sent"]

const deadlineIndicator = (value) => {
  if (!value) return { color: "default", text: "Без дедлайна" }
  const today = dayjs().startOf("day")
  const deadline = dayjs(value).startOf("day")
  if (!deadline.isValid()) return { color: "default", text: "—" }
  const diff = deadline.diff(today, "day")
  if (diff < 0) return { color: "red", text: `Просрочено: ${Math.abs(diff)} дн.` }
  if (diff <= 3) return { color: "orange", text: `Осталось: ${diff} дн.` }
  return { color: "green", text: `Осталось: ${diff} дн.` }
}

const HomePage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [assignmentCountMap, setAssignmentCountMap] = useState({})
  const [loading, setLoading] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [assignSubmitting, setAssignSubmitting] = useState(false)
  const [activeRelease, setActiveRelease] = useState(null)
  const [rfqDeadlineFilter, setRfqDeadlineFilter] = useState("all")
  const [assignForm] = Form.useForm()

  const [requestsScope, setRequestsScope] = useState("current")
  const [requestsStage, setRequestsStage] = useState("all")
  const [requestsDeadline, setRequestsDeadline] = useState("all")
  const [requestsOnlyNew, setRequestsOnlyNew] = useState(false)

  const [rfqsScope, setRfqsScope] = useState("current")
  const [rfqsStage, setRfqsStage] = useState("all")
  const [rfqsDeadline, setRfqsDeadline] = useState("all")
  const [rfqsOnlyNew, setRfqsOnlyNew] = useState(false)

  const role = String(user?.role || "").toLowerCase()
  const manager = role === "admin" || role === "nachalnik-otdela-zakupok"

  const buildAssignmentMap = useCallback((rows) => {
    const next = {}
    ;(Array.isArray(rows) ? rows : []).forEach((r) => {
      const entityType = String(r.entity_type || "").trim()
      const entityId = Number(r.entity_id)
      if (!entityType || !Number.isFinite(entityId) || entityId <= 0) return
      const key = `${entityType}:${entityId}`
      const cnt = Number(r.cnt) || 0
      if (cnt > 0) next[key] = cnt
    })
    return next
  }, [])

  const assignmentCountFor = useCallback(
    (entityType, entityId) => Number(assignmentCountMap[`${entityType}:${Number(entityId)}`]) || 0,
    [assignmentCountMap],
  )

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/dashboard/summary")
      setSummary(data || null)
      setAssignmentCountMap(buildAssignmentMap(data?.assignment_notification_counts))
    } catch (e) {
      console.error("dashboard summary error", e)
      message.error("Не удалось загрузить дашборд")
    } finally {
      setLoading(false)
    }
  }, [buildAssignmentMap])

  const markNotificationsReadForEntity = async (entityType, entityId, type) => {
    if (!entityType || !entityId) return
    try {
      await axios.post("/dashboard/notifications/mark-read", {
        entity_type: entityType,
        entity_id: entityId,
        type: type || undefined,
      })
      if (type === "assignment") {
        setAssignmentCountMap((prev) => {
          const key = `${entityType}:${Number(entityId)}`
          if (!prev[key]) return prev
          const next = { ...prev }
          delete next[key]
          return next
        })
      }
    } catch (e) {
      console.error("mark notifications read for entity error", e)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const assignedRequests = summary?.assigned_requests || []
  const assignedRfqs = summary?.assigned_rfqs || []
  const releaseQueue = summary?.release_queue || []
  const rfqAssignees = summary?.rfq_assignees || []
  const managerRfqs = summary?.manager_rfqs || []

  const filteredManagerRfqs = useMemo(() => {
    if (!Array.isArray(managerRfqs)) return []
    const today = dayjs().startOf("day")
    return managerRfqs.filter((row) => {
      const deadline = row?.processing_deadline ? dayjs(row.processing_deadline).startOf("day") : null
      if (rfqDeadlineFilter === "all") return true
      if (rfqDeadlineFilter === "no_deadline") return !deadline || !deadline.isValid()
      if (!deadline || !deadline.isValid()) return false
      const diff = deadline.diff(today, "day")
      if (rfqDeadlineFilter === "overdue") return diff < 0
      if (rfqDeadlineFilter === "due_3_days") return diff >= 0 && diff <= 3
      return true
    })
  }, [managerRfqs, rfqDeadlineFilter])

  const assigneeOptions = useMemo(
    () =>
      rfqAssignees.map((u) => ({
        value: u.id,
        label: `${u.full_name || u.username || `#${u.id}`}${
          u.role_name || u.role_slug ? ` · ${u.role_name || u.role_slug}` : ""
        }`,
      })),
    [rfqAssignees],
  )

  const requestStageOptions = useMemo(() => {
    const stages =
      requestsScope === "closed"
        ? REQUEST_STATUS_ORDER.filter((s) => CLOSED_REQUEST_STATUSES.includes(s))
        : requestsScope === "current"
          ? REQUEST_STATUS_ORDER.filter((s) => !CLOSED_REQUEST_STATUSES.includes(s))
          : REQUEST_STATUS_ORDER

    return [
      { value: "all", label: "Все стадии" },
      ...stages.map((s) => ({ value: s, label: statusLabel(s) })),
    ]
  }, [requestsScope])

  useEffect(() => {
    if (requestsStage === "all") return
    if (requestStageOptions.some((o) => o.value === requestsStage)) return
    setRequestsStage("all")
  }, [requestsStage, requestStageOptions])

  const rfqStageOptions = useMemo(() => {
    return [
      { value: "all", label: "Все стадии" },
      ...RFQ_STATUS_ORDER.map((s) => ({ value: s, label: statusLabel(s) })),
    ]
  }, [])

  useEffect(() => {
    if (rfqsStage === "all") return
    if (rfqStageOptions.some((o) => o.value === rfqsStage)) return
    setRfqsStage("all")
  }, [rfqsStage, rfqStageOptions])

  const applyDeadlineFilter = (rows, deadlineValue, deadlineField) => {
    if (deadlineValue === "all") return rows
    const today = dayjs().startOf("day")
    return rows.filter((row) => {
      const deadlineRaw = row?.[deadlineField]
      const deadline = deadlineRaw ? dayjs(deadlineRaw).startOf("day") : null
      if (deadlineValue === "no_deadline") return !deadline || !deadline.isValid()
      if (!deadline || !deadline.isValid()) return false
      const diff = deadline.diff(today, "day")
      if (deadlineValue === "overdue") return diff < 0
      if (deadlineValue === "due_3_days") return diff >= 0 && diff <= 3
      return true
    })
  }

  const filteredAssignedRequests = useMemo(() => {
    let rows = Array.isArray(assignedRequests) ? assignedRequests : []
    if (requestsScope === "current") {
      rows = rows.filter((r) => !CLOSED_REQUEST_STATUSES.includes(String(r.status || "")))
    } else if (requestsScope === "closed") {
      rows = rows.filter((r) => CLOSED_REQUEST_STATUSES.includes(String(r.status || "")))
    }
    if (requestsStage !== "all") rows = rows.filter((r) => String(r.status || "") === requestsStage)
    if (requestsScope !== "closed") {
      rows = applyDeadlineFilter(rows, requestsDeadline, "processing_deadline")
    }
    if (requestsOnlyNew) {
      rows = rows.filter((r) => assignmentCountFor("client_request", r.id) > 0)
    }
    return rows
  }, [
    assignedRequests,
    requestsScope,
    requestsStage,
    requestsDeadline,
    requestsOnlyNew,
    assignmentCountMap,
  ])

  const filteredAssignedRfqs = useMemo(() => {
    let rows = Array.isArray(assignedRfqs) ? assignedRfqs : []
    if (rfqsScope === "current") {
      rows = rows.filter(
        (r) => !CLOSED_REQUEST_STATUSES.includes(String(r.client_request_status || "")),
      )
    } else if (rfqsScope === "closed") {
      rows = rows.filter((r) =>
        CLOSED_REQUEST_STATUSES.includes(String(r.client_request_status || "")),
      )
    }
    if (rfqsStage !== "all") rows = rows.filter((r) => String(r.status || "") === rfqsStage)
    if (rfqsScope !== "closed") {
      rows = applyDeadlineFilter(rows, rfqsDeadline, "processing_deadline")
    }
    if (rfqsOnlyNew) rows = rows.filter((r) => assignmentCountFor("rfq", r.id) > 0)
    return rows
  }, [assignedRfqs, rfqsScope, rfqsStage, rfqsDeadline, rfqsOnlyNew, assignmentCountMap])

  const requestColumns = useMemo(
    () => [
      {
        title: "",
        key: "new_marker",
        width: 90,
        fixed: "left",
        render: (_, record) => {
          const cnt = Number(assignmentCountMap[`client_request:${Number(record.id)}`]) || 0
          if (!cnt) return null
          return <Tag color="blue">{cnt > 1 ? `Новое (${cnt})` : "Новое"}</Tag>
        },
      },
      {
        title: "Заявка",
        dataIndex: "internal_number",
        key: "internal_number",
        width: 170,
        fixed: "left",
        ellipsis: true,
      },
      { title: "Клиент", dataIndex: "client_name", key: "client_name", width: 220, ellipsis: true },
      {
        title: "Статус",
        dataIndex: "status",
        key: "status",
        width: 160,
        render: (value) => <Tag color={statusColor(value)}>{statusLabel(value)}</Tag>,
      },
      {
        title: "Дедлайн",
        dataIndex: "processing_deadline",
        key: "processing_deadline",
        width: 120,
        render: formatDate,
      },
      {
        title: "Контроль срока",
        dataIndex: "processing_deadline",
        key: "deadline_indicator",
        width: 160,
        render: (value) => {
          const indicator = deadlineIndicator(value)
          return <Tag color={indicator.color}>{indicator.text}</Tag>
        },
      },
      { title: "Создано", dataIndex: "created_at", key: "created_at", width: 120, render: formatDate },
    ],
    [assignmentCountMap],
  )

  const rfqColumns = useMemo(
    () => [
      {
        title: "",
        key: "new_marker",
        width: 90,
        fixed: "left",
        render: (_, record) => {
          const cnt = Number(assignmentCountMap[`rfq:${Number(record.id)}`]) || 0
          if (!cnt) return null
          return <Tag color="blue">{cnt > 1 ? `Новое (${cnt})` : "Новое"}</Tag>
        },
      },
      { title: "RFQ", dataIndex: "rfq_number", key: "rfq_number", width: 190, fixed: "left", ellipsis: true },
      { title: "Клиент", dataIndex: "client_name", key: "client_name", width: 220, ellipsis: true },
      {
        title: "Статус",
        dataIndex: "status",
        key: "status",
        width: 140,
        render: (value) => <Tag color={statusColor(value)}>{statusLabel(value)}</Tag>,
      },
      {
        title: "Дедлайн",
        dataIndex: "processing_deadline",
        key: "processing_deadline",
        width: 120,
        render: formatDate,
      },
      {
        title: "Контроль срока",
        dataIndex: "processing_deadline",
        key: "deadline_indicator",
        width: 160,
        render: (value) => {
          const indicator = deadlineIndicator(value)
          return <Tag color={indicator.color}>{indicator.text}</Tag>
        },
      },
      { title: "Создано", dataIndex: "created_at", key: "created_at", width: 120, render: formatDate },
    ],
    [assignmentCountMap],
  )

  const releaseColumns = useMemo(
    () => [
      { title: "Заявка", dataIndex: "internal_number", key: "internal_number", width: 170, fixed: "left", ellipsis: true },
      { title: "Клиент", dataIndex: "client_name", key: "client_name", width: 220, ellipsis: true },
      { title: "Поступила", dataIndex: "received_at", key: "received_at", width: 120, render: formatDate },
      {
        title: "Дедлайн",
        dataIndex: "processing_deadline",
        key: "processing_deadline",
        width: 120,
        render: formatDate,
      },
      {
        title: "Релиз",
        dataIndex: "released_to_procurement_at",
        key: "released_to_procurement_at",
        width: 120,
        render: formatDate,
      },
      {
        title: "Кем отправлен",
        dataIndex: "released_by_name",
        key: "released_by_name",
        width: 200,
        render: (value) => value || "—",
      },
      {
        title: "Действия",
        key: "actions",
        width: 180,
        render: (_, record) => (
          <Button
            type="primary"
            size="small"
            onClick={(event) => {
              event.stopPropagation()
              setActiveRelease(record)
              assignForm.setFieldsValue({
                assigned_to_user_id: undefined,
                processing_deadline: record.processing_deadline
                  ? dayjs(record.processing_deadline)
                  : null,
              })
              setAssignModalOpen(true)
            }}
          >
            Назначить RFQ
          </Button>
        ),
      },
    ],
    [assignForm],
  )

  const managerRfqColumns = useMemo(
    () => [
      { title: "RFQ", dataIndex: "rfq_number", key: "rfq_number", width: 190, fixed: "left", ellipsis: true },
      { title: "Заявка", dataIndex: "client_request_number", key: "client_request_number", width: 150, ellipsis: true },
      { title: "Клиент", dataIndex: "client_name", key: "client_name", width: 220, ellipsis: true },
      {
        title: "Кем релиз",
        dataIndex: "released_by_name",
        key: "released_by_name",
        width: 200,
        render: (value) => value || "—",
      },
      {
        title: "Ответственный",
        dataIndex: "assigned_user_name",
        key: "assigned_user_name",
        width: 200,
        render: (value) => value || "—",
      },
      {
        title: "Статус",
        dataIndex: "status",
        key: "status",
        width: 140,
        render: (value) => <Tag color={statusColor(value)}>{statusLabel(value)}</Tag>,
      },
      {
        title: "Дедлайн",
        dataIndex: "processing_deadline",
        key: "processing_deadline",
        width: 120,
        render: formatDate,
      },
      {
        title: "Контроль срока",
        dataIndex: "processing_deadline",
        key: "deadline_indicator",
        width: 160,
        render: (value) => {
          const indicator = deadlineIndicator(value)
          return <Tag color={indicator.color}>{indicator.text}</Tag>
        },
      },
    ],
    [],
  )

  const handleAssignRfq = async (values) => {
    if (!activeRelease?.id) return
    setAssignSubmitting(true)
    try {
      await axios.post(`/client-requests/${activeRelease.id}/assign-rfq`, {
        assigned_to_user_id: values.assigned_to_user_id,
        processing_deadline: values.processing_deadline
          ? dayjs(values.processing_deadline).format("YYYY-MM-DD")
          : null,
      })
      message.success("RFQ назначен")
      setAssignModalOpen(false)
      setActiveRelease(null)
      assignForm.resetFields()
      await fetchSummary()
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось назначить RFQ")
    } finally {
      setAssignSubmitting(false)
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Space align="center" style={{ justifyContent: "space-between", width: "100%" }}>
          <div>
            <Title level={3} style={{ marginBottom: 0 }}>
              {user?.full_name || "Пользователь"}
            </Title>
            <Text type="secondary">Мои заявки, RFQ и новые назначения</Text>
          </div>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              fetchSummary()
            }}
          >
            Обновить
          </Button>
        </Space>

        {manager ? (
          <Card size="small" title="Релизы заявок (назначение RFQ)">
            <Table
              size="small"
              columns={releaseColumns}
              dataSource={releaseQueue}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              loading={loading}
              tableLayout="fixed"
              scroll={{ x: "max-content" }}
              locale={{ emptyText: <Empty description="Нет релизов, ожидающих назначения" /> }}
              onRow={(record) => ({
                onClick: async () => {
                  await markNotificationsReadForEntity("client_request", record.id)
                  navigate("/client-request-workspace")
                },
                style: { cursor: "pointer" },
              })}
            />
          </Card>
        ) : null}

        {manager ? (
          <Card size="small" title="RFQ в работе (контроль начальника/админа)">
            <Space style={{ marginBottom: 12 }} wrap>
              <Text type="secondary">Фильтр по срокам:</Text>
              <Segmented
                value={rfqDeadlineFilter}
                onChange={setRfqDeadlineFilter}
                options={[
                  { label: "Все", value: "all" },
                  { label: "Просроченные", value: "overdue" },
                  { label: "≤ 3 дня", value: "due_3_days" },
                  { label: "Без дедлайна", value: "no_deadline" },
                ]}
              />
            </Space>
            <Table
              size="small"
              columns={managerRfqColumns}
              dataSource={filteredManagerRfqs}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              loading={loading}
              tableLayout="fixed"
              scroll={{ x: "max-content" }}
              locale={{ emptyText: <Empty description="Нет RFQ для контроля" /> }}
              onRow={(record) => ({
                onClick: async () => {
                  await markNotificationsReadForEntity("rfq", record.id)
                  navigate("/rfq-workspace")
                },
                style: { cursor: "pointer" },
              })}
            />
          </Card>
        ) : null}

        <Card size="small" title="Заявки, где я ответственный">
          <Space style={{ marginBottom: 12 }} wrap>
            <Text type="secondary">Показать:</Text>
            <Segmented
              value={requestsScope}
              onChange={setRequestsScope}
              options={[
                { label: "Текущие", value: "current" },
                { label: "Закрытые", value: "closed" },
                { label: "Все", value: "all" },
              ]}
            />
            <Select
              value={requestsStage}
              onChange={setRequestsStage}
              options={requestStageOptions}
              style={{ minWidth: 190 }}
            />
            <Segmented
              value={requestsDeadline}
              onChange={setRequestsDeadline}
              disabled={requestsScope === "closed"}
              options={[
                { label: "Все", value: "all" },
                { label: "Просрочено", value: "overdue" },
                { label: "≤ 3 дня", value: "due_3_days" },
                { label: "Без дедлайна", value: "no_deadline" },
              ]}
            />
            <Checkbox checked={requestsOnlyNew} onChange={(e) => setRequestsOnlyNew(e.target.checked)}>
              Только новые назначения
            </Checkbox>
          </Space>
          <Table
            size="small"
            columns={requestColumns}
            dataSource={filteredAssignedRequests}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty description="Нет назначенных заявок" /> }}
            loading={loading}
            tableLayout="fixed"
            scroll={{ x: "max-content" }}
            onRow={(record) => ({
              onClick: async () => {
                await markNotificationsReadForEntity("client_request", record.id, "assignment")
                navigate("/client-request-workspace")
              },
              style: { cursor: "pointer" },
            })}
          />
        </Card>

        <Card size="small" title="RFQ, где я ответственный">
          <Space style={{ marginBottom: 12 }} wrap>
            <Text type="secondary">Показать:</Text>
            <Segmented
              value={rfqsScope}
              onChange={setRfqsScope}
              options={[
                { label: "Текущие", value: "current" },
                { label: "Закрытые", value: "closed" },
                { label: "Все", value: "all" },
              ]}
            />
            <Select
              value={rfqsStage}
              onChange={setRfqsStage}
              options={rfqStageOptions}
              style={{ minWidth: 190 }}
            />
            <Segmented
              value={rfqsDeadline}
              onChange={setRfqsDeadline}
              disabled={rfqsScope === "closed"}
              options={[
                { label: "Все", value: "all" },
                { label: "Просрочено", value: "overdue" },
                { label: "≤ 3 дня", value: "due_3_days" },
                { label: "Без дедлайна", value: "no_deadline" },
              ]}
            />
            <Checkbox checked={rfqsOnlyNew} onChange={(e) => setRfqsOnlyNew(e.target.checked)}>
              Только новые назначения
            </Checkbox>
          </Space>
          <Table
            size="small"
            columns={rfqColumns}
            dataSource={filteredAssignedRfqs}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty description="Нет назначенных RFQ" /> }}
            loading={loading}
            tableLayout="fixed"
            scroll={{ x: "max-content" }}
            onRow={(record) => ({
              onClick: async () => {
                await markNotificationsReadForEntity("rfq", record.id, "assignment")
                navigate("/rfq-workspace")
              },
              style: { cursor: "pointer" },
            })}
          />
        </Card>
      </Space>

      <Modal
        title="Назначить ответственного за RFQ"
        open={assignModalOpen}
        onCancel={() => {
          setAssignModalOpen(false)
          setActiveRelease(null)
        }}
        onOk={() => assignForm.submit()}
        confirmLoading={assignSubmitting}
      >
        <Form form={assignForm} layout="vertical" onFinish={handleAssignRfq}>
          <Form.Item label="Заявка">
            <Text strong>
              {activeRelease?.internal_number || "—"} {activeRelease?.client_name ? `· ${activeRelease.client_name}` : ""}
            </Text>
          </Form.Item>
          <Form.Item
            label="Ответственный (RFQ)"
            name="assigned_to_user_id"
            rules={[{ required: true, message: "Выберите ответственного" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={assigneeOptions}
              placeholder="Выберите пользователя"
            />
          </Form.Item>
          <Form.Item label="Дедлайн обработки" name="processing_deadline">
            <DatePicker format="DD.MM.YYYY" style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default HomePage
