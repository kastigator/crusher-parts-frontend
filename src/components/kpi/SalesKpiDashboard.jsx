import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Typography,
  message,
} from "antd"
import { ReloadOutlined } from "@ant-design/icons"
import dayjs from "dayjs"
import axios from "@/api/axiosInstance"
import { useAuth } from "@/auth/AuthContext"
import confirmAction from "@/utils/confirmAction"
import ActionButtons from "@/components/common/ActionButtons"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const { RangePicker } = DatePicker
const { Text } = Typography

const DEFAULT_RANGE = [dayjs().startOf("month"), dayjs().endOf("month")]

const extractList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== "object") return []
  const candidates = [
    payload.rows,
    payload.data,
    payload.items,
    payload.list,
    payload.results,
  ]
  for (const c of candidates) {
    if (Array.isArray(c)) return c
  }
  return []
}

const pickNumber = (row, keys) => {
  for (const key of keys) {
    if (!key) continue
    const value = row?.[key]
    if (value === undefined || value === null || value === "") continue
    const num = Number(value)
    return Number.isFinite(num) ? num : 0
  }
  return 0
}

const resolveDay = (row) => {
  const raw =
    row?.day || row?.date || row?.period || row?.created_at || row?.createdAt
  if (!raw) return ""
  const parsed = dayjs(raw)
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : String(raw)
}

const formatNumber = (value) => {
  if (value === null || value === undefined) return "—"
  const num = Number(value)
  if (!Number.isFinite(num)) return "—"
  return new Intl.NumberFormat("ru-RU").format(num)
}

const formatMoney = (value, currency = "RUB") => {
  if (value === null || value === undefined) return "—"
  const num = Number(value)
  if (!Number.isFinite(num)) return "—"
  try {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  } catch {
    return String(value)
  }
}

const SummaryCard = ({ title, value, hint, tone }) => (
  <Card
    size="small"
    bodyStyle={{ padding: 12 }}
    style={{
      borderLeft: `3px solid ${tone || "#e5e7eb"}`,
      minHeight: 92,
    }}
  >
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {title}
      </Text>
      <div style={{ fontSize: 20, fontWeight: 600 }}>{value}</div>
      {hint ? (
        <Text type="secondary" style={{ fontSize: 11 }}>
          {hint}
        </Text>
      ) : null}
    </div>
  </Card>
)

export default function SalesKpiDashboard() {
  const { user } = useAuth()
  const [range, setRange] = useState(DEFAULT_RANGE)
  const [sellerId, setSellerId] = useState(null)
  const [users, setUsers] = useState([])

  const [summary, setSummary] = useState(null)
  const [daily, setDaily] = useState([])
  const [targets, setTargets] = useState([])
  const [loading, setLoading] = useState(false)
  const [apiReady, setApiReady] = useState(true)
  const [error, setError] = useState("")
  const [rebuildLoading, setRebuildLoading] = useState(false)
  const [savingTarget, setSavingTarget] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingTarget, setEditingTarget] = useState(null)

  const [targetForm] = Form.useForm()
  const [editForm] = Form.useForm()

  const isAdmin = useMemo(() => {
    const role = String(user?.role || "").toLowerCase()
    return !!(user && (role === "admin" || user.role_id === 1 || user.is_admin))
  }, [user])

  const loadUsers = useCallback(async () => {
    try {
      const { data } = await axios.get("/sales-kpi/sellers")
      const list = Array.isArray(data) ? data : []
      if (list.length) {
        setUsers(list)
        return
      }
    } catch (e) {
      // fallback ниже
    }

    try {
      const { data } = await axios.get("/users")
      setUsers(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error("Не удалось загрузить пользователей для KPI:", e)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const buildSummary = useCallback((payload, dailyRows) => {
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      const base = payload.summary || payload.data || payload
      if (base && typeof base === "object") {
        return {
          orders_count: pickNumber(base, [
            "orders_count",
            "orders",
            "orders_total",
          ]),
          revenue: pickNumber(base, ["revenue", "total_revenue", "sales"]),
          margin: pickNumber(base, ["margin", "profit", "gross_margin"]),
          proposals_sent: pickNumber(base, [
            "proposals_sent",
            "offers_sent",
            "proposals",
          ]),
          proposals_approved: pickNumber(base, [
            "proposals_approved",
            "offers_approved",
            "approved_offers",
          ]),
          currency: base.currency || base.base_currency || "RUB",
        }
      }
    }

    if (!dailyRows.length) return null

    return dailyRows.reduce(
      (acc, row) => ({
        orders_count: acc.orders_count + pickNumber(row, ["orders_count"]),
        revenue: acc.revenue + pickNumber(row, ["revenue"]),
        margin: acc.margin + pickNumber(row, ["margin"]),
        proposals_sent:
          acc.proposals_sent + pickNumber(row, ["proposals_sent"]),
        proposals_approved:
          acc.proposals_approved + pickNumber(row, ["proposals_approved"]),
        currency: acc.currency,
      }),
      {
        orders_count: 0,
        revenue: 0,
        margin: 0,
        proposals_sent: 0,
        proposals_approved: 0,
        currency: "RUB",
      },
    )
  }, [])

  const loadKpi = useCallback(async () => {
    const [from, to] = range || []
    if (!from || !to) return
    setLoading(true)
    setError("")

    const params = {
      date_from: from.format("YYYY-MM-DD"),
      date_to: to.format("YYYY-MM-DD"),
    }
    if (sellerId) params.seller_id = sellerId

    const requests = [
      axios.get("/sales-kpi/summary", { params }),
      axios.get("/sales-kpi/daily", { params }),
      axios.get("/sales-kpi/targets", { params }),
    ]

    try {
      const results = await Promise.allSettled(requests)
      const missingCount = results.filter(
        (r) =>
          r.status === "rejected" &&
          [404, 501].includes(r.reason?.response?.status),
      ).length

      if (missingCount === results.length) {
        setApiReady(false)
        setSummary(null)
        setDaily([])
        setTargets([])
        return
      }

      setApiReady(true)

      const summaryPayload =
        results[0].status === "fulfilled" ? results[0].value?.data : null
      const dailyPayload =
        results[1].status === "fulfilled" ? results[1].value?.data : null
      const targetsPayload =
        results[2].status === "fulfilled" ? results[2].value?.data : null

      const dailyRows = extractList(dailyPayload).map((row) => ({
        ...row,
        day: resolveDay(row),
        orders_count: pickNumber(row, ["orders_count", "orders"]),
        revenue: pickNumber(row, ["revenue", "total_revenue", "sales"]),
        margin: pickNumber(row, ["margin", "profit", "gross_margin"]),
        proposals_sent: pickNumber(row, [
          "proposals_sent",
          "offers_sent",
          "proposals",
        ]),
        proposals_approved: pickNumber(row, [
          "proposals_approved",
          "offers_approved",
          "approved_offers",
        ]),
      }))

      setDaily(dailyRows)
      setTargets(extractList(targetsPayload))
      setSummary(buildSummary(summaryPayload, dailyRows))

      const hasErrors = results.some(
        (r) =>
          r.status === "rejected" &&
          ![404, 501].includes(r.reason?.response?.status),
      )
      if (hasErrors) {
        setError("Часть данных KPI не удалось загрузить.")
      }
    } catch (e) {
      console.error("Ошибка загрузки KPI:", e)
      setError("Не удалось загрузить данные KPI.")
    } finally {
      setLoading(false)
    }
  }, [range, sellerId, buildSummary])

  const handleRebuild = useCallback(async () => {
    const [from, to] = range || []
    if (!from || !to) return
    const { confirmed } = await confirmAction({
      title: "Пересчитать KPI за период?",
      text: `Период: ${from.format("YYYY-MM-DD")} → ${to.format("YYYY-MM-DD")}`,
      confirmLabel: "Пересчитать",
    })
    if (!confirmed) return

    const payload = {
      date_from: from.format("YYYY-MM-DD"),
      date_to: to.format("YYYY-MM-DD"),
    }
    if (sellerId) payload.seller_id = sellerId

    setRebuildLoading(true)
    try {
      await axios.post("/sales-kpi/rebuild", payload)
      message.success("KPI пересчитан")
      await loadKpi()
    } catch (e) {
      if (e?.response?.status === 409) {
        message.warning("Пересчёт KPI уже выполняется")
      } else {
        console.error("Ошибка пересчёта KPI:", e)
        message.error("Не удалось пересчитать KPI")
      }
    } finally {
      setRebuildLoading(false)
    }
  }, [range, sellerId, loadKpi])

  const handleCreateTarget = async (values) => {
    const [start, end] = values.period || []
    if (!start || !end) {
      message.warning("Выберите период цели")
      return
    }

    const payload = {
      seller_user_id: values.seller_user_id,
      period_start: start.format("YYYY-MM-DD"),
      period_end: end.format("YYYY-MM-DD"),
      target_revenue: values.target_revenue ?? null,
      target_margin: values.target_margin ?? null,
      target_orders: values.target_orders ?? null,
      target_proposals: values.target_proposals ?? null,
    }

    setSavingTarget(true)
    try {
      await axios.post("/sales-kpi/targets", payload)
      message.success("Цель KPI добавлена")
      targetForm.resetFields()
      await loadKpi()
    } catch (e) {
      if (e?.response?.status === 409) {
        message.error("Цель на этот период уже существует")
      } else {
        console.error("Ошибка создания цели KPI:", e)
        message.error("Не удалось добавить цель")
      }
    } finally {
      setSavingTarget(false)
    }
  }

  const openEditTarget = (row) => {
    setEditingTarget(row)
    editForm.setFieldsValue({
      seller_user_id: row.seller_user_id,
      period: [
        row.period_start ? dayjs(row.period_start) : null,
        row.period_end ? dayjs(row.period_end) : null,
      ],
      target_revenue: row.target_revenue ?? null,
      target_margin: row.target_margin ?? null,
      target_orders: row.target_orders ?? null,
      target_proposals: row.target_proposals ?? null,
    })
    setEditOpen(true)
  }

  const handleUpdateTarget = async () => {
    if (!editingTarget) return
    try {
      const values = await editForm.validateFields()
      const [start, end] = values.period || []
      if (!start || !end) {
        message.warning("Выберите период цели")
        return
      }

      const payload = {
        seller_user_id: values.seller_user_id,
        period_start: start.format("YYYY-MM-DD"),
        period_end: end.format("YYYY-MM-DD"),
        target_revenue: values.target_revenue ?? null,
        target_margin: values.target_margin ?? null,
        target_orders: values.target_orders ?? null,
        target_proposals: values.target_proposals ?? null,
      }

      setSavingTarget(true)
      await axios.put(`/sales-kpi/targets/${editingTarget.id}`, payload)
      message.success("Цель KPI обновлена")
      setEditOpen(false)
      setEditingTarget(null)
      await loadKpi()
    } catch (e) {
      if (e?.response?.status === 409) {
        message.error("Цель на этот период уже существует")
      } else {
        console.error("Ошибка обновления цели KPI:", e)
        message.error("Не удалось обновить цель")
      }
    } finally {
      setSavingTarget(false)
    }
  }

  const handleDeleteTarget = async (row) => {
    const { confirmed } = await confirmAction("Удалить цель KPI?")
    if (!confirmed) return
    try {
      await axios.delete(`/sales-kpi/targets/${row.id}`)
      message.success("Цель KPI удалена")
      await loadKpi()
    } catch (e) {
      console.error("Ошибка удаления цели KPI:", e)
      message.error("Не удалось удалить цель")
    }
  }

  const closeEditTarget = () => {
    setEditOpen(false)
    setEditingTarget(null)
  }

  useEffect(() => {
    loadKpi()
  }, [loadKpi])

  const currency = summary?.currency || "RUB"

  const sellerOptions = useMemo(
    () =>
      users.map((u) => ({
        value: u.id,
        label: u.full_name || u.username || `User #${u.id}`,
      })),
    [users],
  )

  const chartData = useMemo(() => {
    return daily
      .filter((row) => row.day)
      .sort((a, b) => String(a.day).localeCompare(String(b.day)))
  }, [daily])

  const targetsData = useMemo(() => {
    const list = Array.isArray(targets) ? targets : []
    return list.slice().sort((a, b) => {
      const aStart = a.period_start || a.periodStart || ""
      const bStart = b.period_start || b.periodStart || ""
      return String(bStart).localeCompare(String(aStart))
    })
  }, [targets])

  const columns = [
    {
      title: "Продавец",
      dataIndex: "seller",
      width: 200,
      render: (_, row) =>
        row.seller_name ||
        row.seller_user_name ||
        row.user_name ||
        row.username ||
        (row.seller_user_id || row.user_id
          ? `User #${row.seller_user_id || row.user_id}`
          : "—"),
    },
    {
      title: "Период",
      dataIndex: "period",
      width: 180,
      render: (_, row) => {
        const from = row.period_start || row.periodStart
        const to = row.period_end || row.periodEnd
        if (!from && !to) return "—"
        const left = from ? dayjs(from).format("YYYY-MM-DD") : "?"
        const right = to ? dayjs(to).format("YYYY-MM-DD") : "?"
        return `${left} → ${right}`
      },
    },
    {
      title: "План, выручка",
      dataIndex: "target_revenue",
      align: "right",
      render: (v, row) =>
        formatMoney(v ?? row.targetRevenue, row.currency || currency),
    },
    {
      title: "План, маржа",
      dataIndex: "target_margin",
      align: "right",
      render: (v, row) =>
        formatMoney(v ?? row.targetMargin, row.currency || currency),
    },
    {
      title: "План, заказы",
      dataIndex: "target_orders",
      align: "right",
      render: (v, row) => formatNumber(v ?? row.targetOrders),
    },
    {
      title: "План, предложения",
      dataIndex: "target_proposals",
      align: "right",
      render: (v, row) => formatNumber(v ?? row.targetProposals),
    },
    {
      title: "Факт, выручка",
      dataIndex: "actual_revenue",
      align: "right",
      render: (v, row) =>
        formatMoney(v ?? row.actualRevenue, row.currency || currency),
    },
    {
      title: "Факт, маржа",
      dataIndex: "actual_margin",
      align: "right",
      render: (v, row) =>
        formatMoney(v ?? row.actualMargin, row.currency || currency),
    },
    {
      title: "Факт, заказы",
      dataIndex: "actual_orders",
      align: "right",
      render: (v, row) => formatNumber(v ?? row.actualOrders),
    },
    {
      title: "Факт, предложения",
      dataIndex: "actual_proposals",
      align: "right",
      render: (_, row) =>
        `${formatNumber(row.actual_proposals_sent ?? row.actualProposalsSent)} / ${formatNumber(
          row.actual_proposals_approved ?? row.actualProposalsApproved,
        )}`,
    },
  ]

  if (isAdmin) {
    columns.push({
      title: "Действия",
      dataIndex: "actions",
      width: 120,
      fixed: "right",
      render: (_, row) => (
        <ActionButtons
          onEdit={() => openEditTarget(row)}
          onDelete={() => handleDeleteTarget(row)}
        />
      ),
    })
  }

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={16}>
      <Card size="small">
        <Space wrap size={12} align="center" style={{ width: "100%" }}>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Период
            </Text>
            <div>
              <RangePicker
                value={range}
                onChange={(next) => setRange(next || DEFAULT_RANGE)}
              />
            </div>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Продавец
            </Text>
            <div>
              <Select
                allowClear
                placeholder="Все"
                style={{ minWidth: 220 }}
                value={sellerId || undefined}
                onChange={(value) => setSellerId(value || null)}
                options={sellerOptions}
                showSearch
                optionFilterProp="label"
              />
            </div>
          </div>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadKpi}
            loading={loading}
          >
            Обновить
          </Button>
          {isAdmin && (
            <Button onClick={handleRebuild} loading={rebuildLoading}>
              Пересчитать
            </Button>
          )}
        </Space>
      </Card>

      <Alert
        type="info"
        showIcon
        message="Как пользоваться KPI"
        description={
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div>1) Выберите период и продавца → нажмите «Обновить».</div>
            <div>
              2) Администратор использует «Пересчитать», если менялись офферы
              или их статусы.
            </div>
            <div>
              3) Планы задаются внизу: выручка, маржа, заказы, предложения.
            </div>
            <div>
              Формулы: заказы = одобренные позиции (approved), предложения
              отправлены = статус proposed, согласованы = approved; выручка/маржа
              считаются по client_price/landed_cost × qty.
            </div>
            <div>
              Пример: период 2026-01-01 → 2026-01-31, продавец «Иван» — увидите
              все предложения и заказы этого продавца за январь.
            </div>
          </div>
        }
      />

      {!apiReady && (
        <Alert
          type="warning"
          showIcon
          message="API KPI пока не подключён"
          description="Когда бэкенд будет готов, дашборд автоматически начнёт подгружать данные."
        />
      )}

      {error && (
        <Alert type="error" showIcon message={error} />
      )}

      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} lg={6}>
          <SummaryCard
            title="Заказы"
            value={formatNumber(summary?.orders_count)}
            tone="#2563eb"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <SummaryCard
            title="Выручка"
            value={formatMoney(summary?.revenue, currency)}
            tone="#16a34a"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <SummaryCard
            title="Маржа"
            value={formatMoney(summary?.margin, currency)}
            tone="#f97316"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <SummaryCard
            title="Предложения"
            value={`${formatNumber(summary?.proposals_sent)} / ${formatNumber(
              summary?.proposals_approved,
            )}`}
            hint="Отправлено / согласовано"
            tone="#9333ea"
          />
        </Col>
      </Row>

      <Card
        title="Динамика по дням"
        size="small"
        bodyStyle={{ height: 320 }}
        loading={loading}
      >
        {chartData.length === 0 ? (
          <Empty description="Нет данных за период" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis
                yAxisId="left"
                tickFormatter={(v) => formatNumber(v)}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(v) => formatNumber(v)}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === "Выручка" || name === "Маржа") {
                    return formatMoney(value, currency)
                  }
                  return formatNumber(value)
                }}
                labelFormatter={(label) => `Дата: ${label}`}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                name="Выручка"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="margin"
                name="Маржа"
                stroke="#16a34a"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="orders_count"
                name="Заказы"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card title="Цели KPI" size="small" loading={loading}>
        {isAdmin && (
          <Form
            form={targetForm}
            layout="inline"
            onFinish={handleCreateTarget}
            style={{ marginBottom: 12 }}
          >
            <Form.Item
              name="seller_user_id"
              label="Продавец"
              rules={[{ required: true, message: "Выберите продавца" }]}
            >
              <Select
                placeholder="Выберите"
                style={{ minWidth: 200 }}
                options={sellerOptions}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
            <Form.Item
              name="period"
              label="Период"
              rules={[{ required: true, message: "Выберите период" }]}
            >
              <RangePicker />
            </Form.Item>
            <Form.Item name="target_revenue" label="План, выручка">
              <InputNumber min={0} style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="target_margin" label="План, маржа">
              <InputNumber min={0} style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="target_orders" label="План, заказы">
              <InputNumber min={0} precision={0} style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="target_proposals" label="План, предложения">
              <InputNumber min={0} precision={0} style={{ width: 160 }} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={savingTarget}>
                Добавить цель
              </Button>
            </Form.Item>
          </Form>
        )}
        <Table
          rowKey={(row) =>
            row.id ||
            `${row.seller_user_id || row.user_id || "u"}-${
              row.period_start || row.periodStart || "p"
            }`
          }
          columns={columns}
          dataSource={targetsData}
          pagination={{ pageSize: 10 }}
          size="small"
          scroll={{ x: 1200 }}
          locale={{
            emptyText: apiReady
              ? "Нет целей KPI"
              : "API KPI пока не подключён",
          }}
        />
      </Card>

      <Modal
        open={editOpen}
        title="Редактировать цель KPI"
        onCancel={closeEditTarget}
        onOk={handleUpdateTarget}
        confirmLoading={savingTarget}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="seller_user_id"
            label="Продавец"
            rules={[{ required: true, message: "Выберите продавца" }]}
          >
            <Select
              placeholder="Выберите"
              options={sellerOptions}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item
            name="period"
            label="Период"
            rules={[{ required: true, message: "Выберите период" }]}
          >
            <RangePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="target_revenue" label="План, выручка">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="target_margin" label="План, маржа">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="target_orders" label="План, заказы">
            <InputNumber min={0} precision={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="target_proposals" label="План, предложения">
            <InputNumber min={0} precision={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}
