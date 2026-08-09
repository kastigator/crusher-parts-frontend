import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Button, Card, Empty, Segmented, Space, Table, Tag, Typography, message } from "antd"
import { ReloadOutlined } from "@ant-design/icons"
import { useNavigate } from "react-router-dom"
import dayjs from "dayjs"
import axios from "@/api/axiosInstance"
import { useAuth } from "@/auth/AuthContext"
import useCapabilities from "@/hooks/useCapabilities"

const { Title, Text } = Typography
const formatDate = (value) => value && dayjs(value).isValid() ? dayjs(value).format("DD.MM.YYYY") : "—"
const statusColor = (value) => ({
  new: "blue", in_progress: "cyan", waiting_responses: "gold", offer_review: "orange",
  decision_pending: "volcano", decision_ready: "purple", decided: "green",
  released_to_pricing: "green", blocked: "red", on_hold: "default",
}[String(value || "")] || "default")

export default function HomePage() {
  const { user } = useAuth()
  const { can } = useCapabilities()
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [caseScope, setCaseScope] = useState("active")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/dashboard/summary")
      setSummary(data || null)
    } catch (error) {
      console.error("dashboard summary error", error)
      message.error("Не удалось загрузить рабочий стол")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const assignedRequests = Array.isArray(summary?.assigned_requests) ? summary.assigned_requests : []
  const assignedCases = Array.isArray(summary?.assigned_sourcing_cases) ? summary.assigned_sourcing_cases : []
  const releaseQueue = Array.isArray(summary?.release_queue) ? summary.release_queue : []
  const managerCases = Array.isArray(summary?.manager_sourcing_cases) ? summary.manager_sourcing_cases : []
  const visibleCases = useMemo(() => {
    const source = summary?.manager ? managerCases : assignedCases
    if (caseScope === "all") return source
    return source.filter((row) => !["archived", "cancelled", "closed"].includes(String(row.status || "")))
  }, [assignedCases, caseScope, managerCases, summary?.manager])

  const requestColumns = [
    { title: "Заявка", dataIndex: "internal_number", width: 170 },
    { title: "Клиент", dataIndex: "client_name" },
    { title: "Статус", dataIndex: "status", width: 180, render: (value) => <Tag>{value || "—"}</Tag> },
    { title: "Дедлайн", dataIndex: "processing_deadline", width: 120, render: formatDate },
    { title: "Создано", dataIndex: "created_at", width: 120, render: formatDate },
  ]
  const caseColumns = [
    { title: "Закупочная проработка", dataIndex: "case_number", width: 180 },
    { title: "Название", dataIndex: "title" },
    { title: "Ответственный", dataIndex: "owner_name", width: 190, render: (value) => value || "—" },
    { title: "Статус", dataIndex: "status", width: 170, render: (value) => <Tag color={statusColor(value)}>{value || "—"}</Tag> },
    { title: "Приоритет", dataIndex: "priority", width: 110 },
    { title: "Позиций", dataIndex: "demand_count", width: 90 },
    { title: "Срок ответа", dataIndex: "response_deadline", width: 130, render: formatDate },
  ]
  const releaseColumns = [
    { title: "Релиз", dataIndex: "release_key", width: 200 },
    { title: "Заявка", dataIndex: "internal_number", width: 160 },
    { title: "Клиент", dataIndex: "client_name" },
    { title: "Позиций", dataIndex: "item_count", width: 90 },
    { title: "Передан", dataIndex: "released_at", width: 120, render: formatDate },
    { title: "Кем", dataIndex: "released_by_name", width: 180, render: (value) => value || "—" },
    { title: "", width: 190, render: () => <Button size="small" type="primary" onClick={() => navigate("/sourcing")}>Открыть проработку</Button> },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Space align="center" style={{ justifyContent: "space-between", width: "100%" }}>
          <div>
            <Title level={3} style={{ marginBottom: 0 }}>{user?.full_name || "Пользователь"}</Title>
            <Text type="secondary">Заявки клиентов и очереди исполнения</Text>
          </div>
          <Button icon={<ReloadOutlined />} onClick={load}>Обновить</Button>
        </Space>

        {summary?.manager && can("sourcing.cases.manage") ? (
          <Card size="small" title="Релизы в закупку без проработки">
            <Table size="small" rowKey="id" loading={loading} columns={releaseColumns} dataSource={releaseQueue}
              pagination={{ pageSize: 10 }} scroll={{ x: "max-content" }}
              locale={{ emptyText: <Empty description="Все релизы приняты в закупочную проработку" /> }} />
          </Card>
        ) : null}

        <Card size="small" title={summary?.manager ? "Закупочные проработки — контроль" : "Мои закупочные проработки"}
          extra={<Segmented value={caseScope} onChange={setCaseScope} options={[{ label: "Активные", value: "active" }, { label: "Все", value: "all" }]} />}>
          <Table size="small" rowKey="id" loading={loading} columns={caseColumns} dataSource={visibleCases}
            pagination={{ pageSize: 10 }} scroll={{ x: "max-content" }}
            locale={{ emptyText: <Empty description="Закупочные проработки не найдены" /> }}
            onRow={() => ({ onClick: () => navigate("/sourcing"), style: { cursor: "pointer" } })} />
        </Card>

        <Card size="small" title="Заявки, где я ответственный">
          <Table size="small" rowKey="id" loading={loading} columns={requestColumns} dataSource={assignedRequests}
            pagination={{ pageSize: 10 }} scroll={{ x: "max-content" }}
            locale={{ emptyText: <Empty description="Нет назначенных заявок" /> }}
            onRow={() => ({ onClick: () => navigate("/client-request-workspace"), style: { cursor: "pointer" } })} />
        </Card>
      </Space>
    </div>
  )
}
