import React, { useEffect, useMemo, useState } from "react"
import { Button, Card, Col, Empty, Row, Space, Table, Tag, Typography, message } from "antd"
import { ReloadOutlined } from "@ant-design/icons"
import { useNavigate } from "react-router-dom"
import axios from "@/api/axiosInstance"
import { useAuth } from "@/auth/AuthContext"

const { Title, Text } = Typography

const statusLabel = (value) => {
  if (!value) return "—"
  const labels = {
    draft: "Черновик",
    structured: "Структура готова",
    sent: "RFQ отправлен",
    responded: "Ответы получены",
  }
  return labels[value] || value
}

const statusColor = (value) => {
  if (!value) return "default"
  if (value === "structured") return "cyan"
  if (value === "sent") return "blue"
  if (value === "responded") return "green"
  if (value === "draft") return "default"
  return "gold"
}

const formatDate = (value) => {
  if (!value) return "—"
  try {
    return new Date(value).toLocaleDateString("ru-RU")
  } catch {
    return "—"
  }
}

const HomePage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)

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
      (n) => n.entity_type === entityType && Number(n.entity_id) === Number(entityId)
    )
    if (!targets.length) return
    await Promise.all(
      targets.map((n) =>
        axios.post(`/dashboard/notifications/${n.id}/read`).catch(() => null)
      )
    )
    setNotifications((prev) =>
      prev.filter(
        (n) =>
          !(n.entity_type === entityType && Number(n.entity_id) === Number(entityId))
      )
    )
  }

  useEffect(() => {
    fetchSummary()
    fetchNotifications()
  }, [])

  const counts = summary?.counts || {}
  const assignedRequests = summary?.assigned_requests || []
  const assignedRfqs = summary?.assigned_rfqs || []

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
    []
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
    []
  )

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
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => { fetchSummary(); fetchNotifications() }}>
              Обновить
            </Button>
          </Space>
        </Space>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Card size="small" title="Мои заявки">
              <Title level={3} style={{ margin: 0 }}>
                {counts.assigned_requests || 0}
              </Title>
              <Text type="secondary">назначено мне</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card size="small" title="Мои RFQ">
              <Title level={3} style={{ margin: 0 }}>
                {counts.assigned_rfqs || 0}
              </Title>
              <Text type="secondary">назначено мне</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card size="small" title="Новые назначения">
              <Title level={3} style={{ margin: 0 }}>
                {counts.unread_notifications || 0}
              </Title>
              <Text type="secondary">непрочитанные</Text>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card
              size="small"
              title="Заявки, где я ответственный"
            >
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
            <Card
              size="small"
              title="RFQ, где я ответственный"
            >
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
    </div>
  )
}

export default HomePage
