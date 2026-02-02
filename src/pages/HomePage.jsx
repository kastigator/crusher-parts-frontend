import React, { useEffect, useMemo, useState } from "react"
import {
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Modal,
  Row,
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
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [assignSubmitting, setAssignSubmitting] = useState(false)
  const [activeRelease, setActiveRelease] = useState(null)
  const [rfqDeadlineFilter, setRfqDeadlineFilter] = useState("all")
  const [assignForm] = Form.useForm()

  const role = String(user?.role || "").toLowerCase()
  const manager = role === "admin" || role === "nachalnik-otdela-zakupok"

  const fetchSummary = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/dashboard/summary")
      setSummary(data || null)
    } catch (e) {
      console.error("dashboard summary error", e)
      message.error("Не удалось загрузить дашборд")
    } finally {
      setLoading(false)
    }
  }

  const fetchNotifications = async () => {
    try {
      const { data } = await axios.get("/dashboard/notifications", { params: { limit: 20 } })
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : [])
    } catch (e) {
      console.error("dashboard notifications error", e)
    }
  }

  const openNotification = async (note) => {
    if (!note) return
    try {
      await axios.post(`/dashboard/notifications/${note.id}/read`)
      setNotifications((prev) => prev.filter((n) => n.id !== note.id))
    } catch (e) {
      console.error("mark notification read error", e)
    }

    if (note.entity_type === "client_request") {
      navigate("/client-request-workspace")
      return
    }
    if (note.entity_type === "rfq") {
      navigate("/rfq-workspace")
      return
    }
  }

  const markNotificationsForEntity = async (entityType, entityId) => {
    if (!entityType || !entityId) return
    const targets = notifications.filter(
      (n) => n.entity_type === entityType && Number(n.entity_id) === Number(entityId),
    )
    if (!targets.length) return
    await Promise.all(
      targets.map((n) => axios.post(`/dashboard/notifications/${n.id}/read`).catch(() => null)),
    )
    setNotifications((prev) =>
      prev.filter((n) => !(n.entity_type === entityType && Number(n.entity_id) === Number(entityId))),
    )
  }

  useEffect(() => {
    fetchSummary()
    fetchNotifications()
  }, [])

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
        label: `${u.full_name || u.username || `#${u.id}`}${u.role ? ` · ${u.role}` : ""}`,
      })),
    [rfqAssignees],
  )

  const requestColumns = useMemo(
    () => [
      { title: "Заявка", dataIndex: "internal_number", key: "internal_number" },
      { title: "Клиент", dataIndex: "client_name", key: "client_name" },
      {
        title: "Статус",
        dataIndex: "status",
        key: "status",
        render: (value) => <Tag color={statusColor(value)}>{statusLabel(value)}</Tag>,
      },
      { title: "Создано", dataIndex: "created_at", key: "created_at", render: formatDate },
    ],
    [],
  )

  const rfqColumns = useMemo(
    () => [
      { title: "RFQ", dataIndex: "rfq_number", key: "rfq_number" },
      { title: "Заявка", dataIndex: "client_request_number", key: "client_request_number" },
      { title: "Клиент", dataIndex: "client_name", key: "client_name" },
      {
        title: "Статус",
        dataIndex: "status",
        key: "status",
        render: (value) => <Tag color={statusColor(value)}>{statusLabel(value)}</Tag>,
      },
      { title: "Создано", dataIndex: "created_at", key: "created_at", render: formatDate },
    ],
    [],
  )

  const releaseColumns = useMemo(
    () => [
      { title: "Заявка", dataIndex: "internal_number", key: "internal_number" },
      { title: "Клиент", dataIndex: "client_name", key: "client_name" },
      { title: "Поступила", dataIndex: "received_at", key: "received_at", render: formatDate },
      {
        title: "Дедлайн",
        dataIndex: "processing_deadline",
        key: "processing_deadline",
        render: formatDate,
      },
      {
        title: "Релиз",
        dataIndex: "released_to_procurement_at",
        key: "released_to_procurement_at",
        render: formatDate,
      },
      {
        title: "Кем отправлен",
        dataIndex: "released_by_name",
        key: "released_by_name",
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
      { title: "RFQ", dataIndex: "rfq_number", key: "rfq_number" },
      { title: "Заявка", dataIndex: "client_request_number", key: "client_request_number" },
      { title: "Клиент", dataIndex: "client_name", key: "client_name" },
      {
        title: "Кем релиз",
        dataIndex: "released_by_name",
        key: "released_by_name",
        render: (value) => value || "—",
      },
      {
        title: "Ответственный",
        dataIndex: "assigned_user_name",
        key: "assigned_user_name",
        render: (value) => value || "—",
      },
      {
        title: "Статус",
        dataIndex: "status",
        key: "status",
        render: (value) => <Tag color={statusColor(value)}>{statusLabel(value)}</Tag>,
      },
      {
        title: "Дедлайн",
        dataIndex: "processing_deadline",
        key: "processing_deadline",
        render: formatDate,
      },
      {
        title: "Контроль срока",
        dataIndex: "processing_deadline",
        key: "deadline_indicator",
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
              fetchNotifications()
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
              locale={{ emptyText: <Empty description="Нет релизов, ожидающих назначения" /> }}
              onRow={(record) => ({
                onClick: async () => {
                  await markNotificationsForEntity("client_request", record.id)
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
              locale={{ emptyText: <Empty description="Нет RFQ для контроля" /> }}
              onRow={(record) => ({
                onClick: async () => {
                  await markNotificationsForEntity("rfq", record.id)
                  navigate("/rfq-workspace")
                },
                style: { cursor: "pointer" },
              })}
            />
          </Card>
        ) : null}

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card size="small" title="Заявки, где я ответственный">
              <Table
                size="small"
                columns={requestColumns}
                dataSource={assignedRequests}
                rowKey="id"
                pagination={false}
                locale={{ emptyText: <Empty description="Нет назначенных заявок" /> }}
                loading={loading}
                onRow={(record) => ({
                  onClick: async () => {
                    await markNotificationsForEntity("client_request", record.id)
                    navigate("/client-request-workspace")
                  },
                  style: { cursor: "pointer" },
                })}
              />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" title="RFQ, где я ответственный">
              <Table
                size="small"
                columns={rfqColumns}
                dataSource={assignedRfqs}
                rowKey="id"
                pagination={false}
                locale={{ emptyText: <Empty description="Нет назначенных RFQ" /> }}
                loading={loading}
                onRow={(record) => ({
                  onClick: async () => {
                    await markNotificationsForEntity("rfq", record.id)
                    navigate("/rfq-workspace")
                  },
                  style: { cursor: "pointer" },
                })}
              />
            </Card>
          </Col>
        </Row>

        <Card size="small" title="Новые уведомления">
          {notifications.length ? (
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              {notifications.map((n) => (
                <Card
                  key={n.id}
                  size="small"
                  style={{ background: "#f6faff", cursor: "pointer" }}
                  onClick={() => openNotification(n)}
                >
                  <Space direction="vertical" size={6}>
                    <Text strong>{n.title || "Уведомление"}</Text>
                    <Text type="secondary">{n.message || "—"}</Text>
                    <Text type="secondary">{formatDate(n.created_at)}</Text>
                  </Space>
                </Card>
              ))}
            </Space>
          ) : (
            <Empty description="Нет новых уведомлений" />
          )}
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
