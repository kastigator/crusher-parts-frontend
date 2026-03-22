import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Modal,
  Empty,
  Form,
  InputNumber,
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
import KpiHelpDrawer from "@/components/kpi/KpiHelpDrawer"
import KpiDetailsDrawer from "@/components/kpi/KpiDetailsDrawer"
import {
  addPlanSeriesToChart,
  aggregateKpiSeries,
  getAggregationTitle,
  getTooltipLabelPrefix,
  KPI_CHART_MODE_OPTIONS,
  KPI_AGGREGATION_OPTIONS,
  pickApplicableTarget,
} from "@/components/kpi/kpiChartUtils"
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
const KPI_CURRENCY_OPTIONS = ["RUB", "USD", "EUR", "CNY"].map((code) => ({
  value: code,
  label: code,
}))
const PROCUREMENT_SERIES = [
  {
    key: "landed_amount",
    label: "Сумма выбора",
    color: "#2563eb",
    axis: "left",
  },
  {
    key: "rfqs_count",
    label: "RFQ",
    color: "#16a34a",
    axis: "right",
  },
  {
    key: "invites_count",
    label: "Приглашения",
    color: "#0ea5e9",
    axis: "right",
  },
  {
    key: "responses_count",
    label: "Ответы",
    color: "#22c55e",
    axis: "right",
  },
  {
    key: "selections_count",
    label: "Выборы",
    color: "#f97316",
    axis: "right",
  },
  {
    key: "purchase_orders_count",
    label: "Заказы",
    color: "#9333ea",
    axis: "right",
  },
  {
    key: "quality_events_count",
    label: "Инциденты",
    color: "#dc2626",
    axis: "right",
  },
]
const PROCUREMENT_TARGET_FIELD_MAP = {
  rfqs_count: "target_rfqs",
  invites_count: "target_invites",
  selections_count: "target_selections",
  purchase_orders_count: "target_purchase_orders",
  landed_amount: "target_landed_amount",
}
const PROCUREMENT_KPI_HELP_SECTIONS = [
  {
    title: "Что считается в закупочном KPI",
    body:
      "Закупочный KPI отражает воронку работы закупщика: сколько RFQ он открыл, сколько поставщиков пригласил, сколько ответов получил, сколько выборов утвердил и сколько заказов поставщикам оформил.",
  },
  {
    title: "Как понимать отклик поставщиков",
    body:
      "Отклик поставщиков считается как отношение полученных ответов к приглашениям. Это показатель качества работы с базой поставщиков и полноты реакции рынка, а не только скорости самого закупщика.",
  },
  {
    title: "Как считается сумма выбора",
    body:
      "Сумма выбора строится по утвержденным выборам закупки. Если выборы были в разных валютах, они сначала нормируются в выбранную валюту экрана, и только после этого суммируются.",
  },
  {
    title: "Как трактовать скорость",
    body:
      "Среднее время до выбора показывает, сколько занимает путь от создания RFQ до утвержденного выбора. Среднее время до первого ответа показывает реакцию поставщиков. Если временные метки в данных повреждены, такие строки исключаются из расчета.",
  },
  {
    title: "Что значит инцидент поставщика",
    body:
      "Инциденты поставщиков — это негативный показатель: жалобы, задержки и другие quality events, привязанные к выбору или заказу поставщику. Рост этого числа ухудшает оценку закупочного контура, даже если объём высокий.",
  },
]

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

const formatPercent = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return "—"
  return `${new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(num)}%`
}

const formatHours = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return "—"
  return `${new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(num)} ч`
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

export default function ProcurementKpiDashboard({
  lockedBuyerId = null,
  canSelectAnyBuyer = true,
}) {
  const { user } = useAuth()
  const [range, setRange] = useState(DEFAULT_RANGE)
  const [buyerId, setBuyerId] = useState(null)
  const [baseCurrency, setBaseCurrency] = useState("RUB")
  const [aggregation, setAggregation] = useState("week")
  const [chartMode, setChartMode] = useState("fact")
  const [users, setUsers] = useState([])

  const [summary, setSummary] = useState(null)
  const [daily, setDaily] = useState([])
  const [targets, setTargets] = useState([])
  const [loading, setLoading] = useState(false)
  const [apiReady, setApiReady] = useState(true)
  const [error, setError] = useState("")
  const [savingTarget, setSavingTarget] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingTarget, setEditingTarget] = useState(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [visibleSeries, setVisibleSeries] = useState([
    "landed_amount",
    "rfqs_count",
    "responses_count",
    "selections_count",
  ])
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsTitle, setDetailsTitle] = useState("")
  const [detailsRows, setDetailsRows] = useState([])
  const [detailsType, setDetailsType] = useState("procurement")

  const [targetForm] = Form.useForm()
  const [editForm] = Form.useForm()

  const isAdmin = useMemo(() => {
    const role = String(user?.role || "").toLowerCase()
    return !!(user && (role === "admin" || user.role_id === 1 || user.is_admin))
  }, [user])

  const effectiveBuyerId = lockedBuyerId || buyerId || null

  useEffect(() => {
    if (lockedBuyerId && buyerId !== lockedBuyerId) {
      setBuyerId(lockedBuyerId)
    }
  }, [lockedBuyerId, buyerId])

  const loadUsers = useCallback(async () => {
    try {
      const { data } = await axios.get("/procurement-kpi/buyers")
      const list = Array.isArray(data) ? data : []
      if (list.length) {
        setUsers(list)
        return
      }
    } catch (_e) {
      // fallback ниже
    }

    try {
      const { data } = await axios.get("/users")
      setUsers(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error("Не удалось загрузить пользователей для закупочного KPI:", e)
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
          rfqs_count: pickNumber(base, ["rfqs_count"]),
          invites_count: pickNumber(base, ["invites_count"]),
          responses_count: pickNumber(base, ["responses_count"]),
          selections_count: pickNumber(base, ["selections_count"]),
          purchase_orders_count: pickNumber(base, ["purchase_orders_count"]),
          quality_events_count: pickNumber(base, ["quality_events_count"]),
          landed_amount: pickNumber(base, ["landed_amount"]),
          response_rate_pct: pickNumber(base, ["response_rate_pct"]),
          avg_hours_to_selection: pickNumber(base, ["avg_hours_to_selection"]),
          avg_hours_to_first_response: pickNumber(base, ["avg_hours_to_first_response"]),
          currency: base.currency || base.base_currency || "RUB",
        }
      }
    }

    if (!dailyRows.length) return null

    const total = dailyRows.reduce(
      (acc, row) => ({
        rfqs_count: acc.rfqs_count + pickNumber(row, ["rfqs_count"]),
        invites_count: acc.invites_count + pickNumber(row, ["invites_count"]),
        responses_count: acc.responses_count + pickNumber(row, ["responses_count"]),
        selections_count: acc.selections_count + pickNumber(row, ["selections_count"]),
        purchase_orders_count:
          acc.purchase_orders_count + pickNumber(row, ["purchase_orders_count"]),
        quality_events_count:
          acc.quality_events_count + pickNumber(row, ["quality_events_count"]),
        landed_amount: acc.landed_amount + pickNumber(row, ["landed_amount"]),
        currency: acc.currency,
      }),
      {
        rfqs_count: 0,
        invites_count: 0,
        responses_count: 0,
        selections_count: 0,
        purchase_orders_count: 0,
        quality_events_count: 0,
        landed_amount: 0,
        currency: "RUB",
      },
    )

    return {
      ...total,
      response_rate_pct: total.invites_count
        ? (total.responses_count / total.invites_count) * 100
        : 0,
      avg_hours_to_selection: 0,
      avg_hours_to_first_response: 0,
    }
  }, [])

  const loadKpi = useCallback(async () => {
    const [from, to] = range || []
    if (!from || !to) return
    setLoading(true)
    setError("")

    const params = {
      date_from: from.format("YYYY-MM-DD"),
      date_to: to.format("YYYY-MM-DD"),
      base_currency: baseCurrency,
    }
    if (effectiveBuyerId) params.buyer_id = effectiveBuyerId

    const requests = [
      axios.get("/procurement-kpi/summary", { params }),
      axios.get("/procurement-kpi/daily", { params }),
      axios.get("/procurement-kpi/targets", { params }),
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
        rfqs_count: pickNumber(row, ["rfqs_count"]),
        invites_count: pickNumber(row, ["invites_count"]),
        responses_count: pickNumber(row, ["responses_count"]),
        selections_count: pickNumber(row, ["selections_count"]),
        purchase_orders_count: pickNumber(row, ["purchase_orders_count"]),
        quality_events_count: pickNumber(row, ["quality_events_count"]),
        landed_amount: pickNumber(row, ["landed_amount"]),
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
        setError("Часть данных закупочного KPI не удалось загрузить.")
      }
    } catch (e) {
      console.error("Ошибка загрузки закупочного KPI:", e)
      setError("Не удалось загрузить данные закупочного KPI.")
    } finally {
      setLoading(false)
    }
  }, [range, effectiveBuyerId, baseCurrency, buildSummary])

  const handleCreateTarget = async (values) => {
    const [start, end] = values.period || []
    if (!start || !end) {
      message.warning("Выберите период цели")
      return
    }

    const payload = {
      buyer_user_id: values.buyer_user_id,
      period_start: start.format("YYYY-MM-DD"),
      period_end: end.format("YYYY-MM-DD"),
      target_rfqs: values.target_rfqs ?? null,
      target_invites: values.target_invites ?? null,
      target_selections: values.target_selections ?? null,
      target_purchase_orders: values.target_purchase_orders ?? null,
      target_landed_amount: values.target_landed_amount ?? null,
      target_currency: baseCurrency,
    }

    setSavingTarget(true)
    try {
      await axios.post("/procurement-kpi/targets", payload)
      message.success("Цель закупочного KPI добавлена")
      targetForm.resetFields()
      await loadKpi()
    } catch (e) {
      if (e?.response?.status === 409) {
        message.error("Цель на этот период уже существует")
      } else {
        console.error("Ошибка создания цели закупочного KPI:", e)
        message.error("Не удалось добавить цель")
      }
    } finally {
      setSavingTarget(false)
    }
  }

  const openEditTarget = (row) => {
    setEditingTarget(row)
    editForm.setFieldsValue({
      buyer_user_id: row.buyer_user_id,
      period: [
        row.period_start ? dayjs(row.period_start) : null,
        row.period_end ? dayjs(row.period_end) : null,
      ],
      target_rfqs: row.target_rfqs ?? null,
      target_invites: row.target_invites ?? null,
      target_selections: row.target_selections ?? null,
      target_purchase_orders: row.target_purchase_orders ?? null,
      target_landed_amount: row.target_landed_amount ?? null,
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
        buyer_user_id: values.buyer_user_id,
        period_start: start.format("YYYY-MM-DD"),
        period_end: end.format("YYYY-MM-DD"),
        target_rfqs: values.target_rfqs ?? null,
        target_invites: values.target_invites ?? null,
        target_selections: values.target_selections ?? null,
        target_purchase_orders: values.target_purchase_orders ?? null,
        target_landed_amount: values.target_landed_amount ?? null,
        target_currency: baseCurrency,
      }

      setSavingTarget(true)
      await axios.put(`/procurement-kpi/targets/${editingTarget.id}`, payload)
      message.success("Цель закупочного KPI обновлена")
      setEditOpen(false)
      setEditingTarget(null)
      await loadKpi()
    } catch (e) {
      if (e?.response?.status === 409) {
        message.error("Цель на этот период уже существует")
      } else {
        console.error("Ошибка обновления цели закупочного KPI:", e)
        message.error("Не удалось обновить цель")
      }
    } finally {
      setSavingTarget(false)
    }
  }

  const handleDeleteTarget = async (row) => {
    const { confirmed } = await confirmAction("Удалить цель закупочного KPI?")
    if (!confirmed) return
    try {
      await axios.delete(`/procurement-kpi/targets/${row.id}`)
      message.success("Цель закупочного KPI удалена")
      await loadKpi()
    } catch (e) {
      console.error("Ошибка удаления цели закупочного KPI:", e)
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

  const buyerOptions = useMemo(
    () =>
      users.map((u) => ({
        value: u.id,
        label: u.full_name || u.username || `User #${u.id}`,
      })),
    [users],
  )

  const chartData = useMemo(
    () =>
      aggregateKpiSeries(daily, aggregation, [
        "rfqs_count",
        "invites_count",
        "responses_count",
        "selections_count",
        "purchase_orders_count",
        "quality_events_count",
        "landed_amount",
      ]),
    [aggregation, daily],
  )

  const activeTarget = useMemo(
    () =>
      pickApplicableTarget({
        targets,
        userId: effectiveBuyerId,
        range,
        userField: "buyer_user_id",
      }),
    [effectiveBuyerId, range, targets],
  )

  const chartSeries = useMemo(
    () => PROCUREMENT_SERIES.filter((item) => visibleSeries.includes(item.key)),
    [visibleSeries],
  )

  const chartDataWithPlan = useMemo(() => {
    if (chartMode !== "fact_plan" || !activeTarget) return chartData
    return addPlanSeriesToChart({
      rows: chartData,
      visibleSeries,
      target: activeTarget,
      mapping: PROCUREMENT_TARGET_FIELD_MAP,
    })
  }, [activeTarget, chartData, chartMode, visibleSeries])

  const toggleSeries = useCallback((seriesKey) => {
    setVisibleSeries((current) =>
      current.includes(seriesKey)
        ? current.filter((key) => key !== seriesKey)
        : [...current, seriesKey],
    )
  }, [])

  const openDetails = useCallback(
    async (metric, title, type = "procurement") => {
      if (!effectiveBuyerId) {
        message.info("Сначала выберите закупщика")
        return
      }
      setDetailsOpen(true)
      setDetailsLoading(true)
      setDetailsTitle(title)
      setDetailsRows([])
      setDetailsType(type)
      try {
        const { data } = await axios.get("/procurement-kpi/details", {
          params: {
            buyer_id: effectiveBuyerId,
            date_from: range?.[0]?.format("YYYY-MM-DD"),
            date_to: range?.[1]?.format("YYYY-MM-DD"),
            metric,
            base_currency: baseCurrency,
          },
        })
        setDetailsRows(Array.isArray(data?.rows) ? data.rows : [])
      } catch (e) {
        console.error("Ошибка загрузки деталей закупочного KPI:", e)
        message.error("Не удалось загрузить детали показателя")
      } finally {
        setDetailsLoading(false)
      }
    },
    [baseCurrency, effectiveBuyerId, range],
  )

  const targetsData = useMemo(() => {
    const list = Array.isArray(targets) ? targets : []
    return list.slice().sort((a, b) => {
      const aStart = a.period_start || ""
      const bStart = b.period_start || ""
      return String(bStart).localeCompare(String(aStart))
    })
  }, [targets])

  const columns = [
    {
      title: "Закупщик",
      dataIndex: "buyer",
      width: 220,
      render: (_, row) =>
        row.buyer_name ||
        row.user_name ||
        row.username ||
        (row.buyer_user_id ? `User #${row.buyer_user_id}` : "—"),
    },
    {
      title: "Период",
      dataIndex: "period",
      width: 180,
      render: (_, row) => {
        const from = row.period_start
        const to = row.period_end
        if (!from && !to) return "—"
        const left = from ? dayjs(from).format("YYYY-MM-DD") : "?"
        const right = to ? dayjs(to).format("YYYY-MM-DD") : "?"
        return `${left} → ${right}`
      },
    },
    {
      title: "План, RFQ",
      dataIndex: "target_rfqs",
      align: "right",
      render: (v) => formatNumber(v),
    },
    {
      title: "План, приглашения",
      dataIndex: "target_invites",
      align: "right",
      render: (v) => formatNumber(v),
    },
    {
      title: "План, выборы",
      dataIndex: "target_selections",
      align: "right",
      render: (v) => formatNumber(v),
    },
    {
      title: "План, заказы",
      dataIndex: "target_purchase_orders",
      align: "right",
      render: (v) => formatNumber(v),
    },
    {
      title: "План, сумма выбора",
      dataIndex: "target_landed_amount",
      align: "right",
      render: (v, row) => formatMoney(v, row.currency || currency),
    },
    {
      title: "Факт, RFQ",
      dataIndex: "actual_rfqs",
      align: "right",
      render: (v) => formatNumber(v),
    },
    {
      title: "Факт, приглашения",
      dataIndex: "actual_invites",
      align: "right",
      render: (v) => formatNumber(v),
    },
    {
      title: "Факт, выборы",
      dataIndex: "actual_selections",
      align: "right",
      render: (v) => formatNumber(v),
    },
    {
      title: "Факт, заказы",
      dataIndex: "actual_purchase_orders",
      align: "right",
      render: (v) => formatNumber(v),
    },
    {
      title: "Факт, сумма выбора",
      dataIndex: "actual_landed_amount",
      align: "right",
      render: (v, row) => formatMoney(v, row.currency || currency),
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
              Закупщик
            </Text>
            <div>
              <Select
                allowClear
                placeholder="Все"
                style={{ minWidth: 220 }}
                value={effectiveBuyerId || undefined}
                onChange={(value) => setBuyerId(value || null)}
                options={buyerOptions}
                showSearch
                optionFilterProp="label"
                disabled={!canSelectAnyBuyer}
              />
            </div>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Нормировать в валюте
            </Text>
            <div>
              <Select
                style={{ minWidth: 120 }}
                value={baseCurrency}
                onChange={setBaseCurrency}
                options={KPI_CURRENCY_OPTIONS}
              />
            </div>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Агрегация графика
            </Text>
            <div>
              <Select
                style={{ minWidth: 150 }}
                value={aggregation}
                onChange={setAggregation}
                options={KPI_AGGREGATION_OPTIONS}
              />
            </div>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Режим графика
            </Text>
            <div>
              <Select
                style={{ minWidth: 170 }}
                value={chartMode}
                onChange={setChartMode}
                options={KPI_CHART_MODE_OPTIONS}
                disabled={!effectiveBuyerId}
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
          <Button onClick={() => setHelpOpen(true)}>Справка</Button>
        </Space>
      </Card>

      {!apiReady && (
        <Alert
          type="warning"
          showIcon
          message="API закупочного KPI пока не подключён"
          description="Когда бэкенд будет готов, дашборд автоматически начнёт подгружать данные."
        />
      )}

      {error && <Alert type="error" showIcon message={error} />}

      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} lg={6}>
          <div onClick={() => openDetails("rfqs_count", "RFQ закупщика")} style={{ cursor: "pointer" }}>
            <SummaryCard
              title="RFQ"
              value={formatNumber(summary?.rfqs_count)}
              hint="Нажмите, чтобы открыть список"
              tone="#2563eb"
            />
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div onClick={() => openDetails("invites_count", "Приглашения поставщикам")} style={{ cursor: "pointer" }}>
            <SummaryCard
              title="Приглашения поставщикам"
              value={formatNumber(summary?.invites_count)}
              hint="Нажмите, чтобы открыть список"
              tone="#0ea5e9"
            />
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div onClick={() => openDetails("responses_count", "Ответы поставщиков")} style={{ cursor: "pointer" }}>
            <SummaryCard
              title="Ответы поставщиков"
              value={formatNumber(summary?.responses_count)}
              hint="Нажмите, чтобы открыть список"
              tone="#16a34a"
            />
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <SummaryCard
            title="Отклик поставщиков"
            value={formatPercent(summary?.response_rate_pct)}
            hint="Ответы / приглашения"
            tone="#22c55e"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div onClick={() => openDetails("selections_count", "Утверждённые выборы закупки")} style={{ cursor: "pointer" }}>
            <SummaryCard
              title="Утвержденные выборы"
              value={formatNumber(summary?.selections_count)}
              hint="Нажмите, чтобы открыть список"
              tone="#f97316"
            />
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div onClick={() => openDetails("purchase_orders_count", "Заказы поставщикам")} style={{ cursor: "pointer" }}>
            <SummaryCard
              title="Заказы поставщикам"
              value={formatNumber(summary?.purchase_orders_count)}
              hint="Нажмите, чтобы открыть список"
              tone="#9333ea"
            />
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div onClick={() => openDetails("landed_amount", "Сумма утверждённого выбора", "procurement_landed")} style={{ cursor: "pointer" }}>
            <SummaryCard
              title="Сумма выбора"
              value={formatMoney(summary?.landed_amount, currency)}
              hint="Нажмите, чтобы открыть список выборов"
              tone="#7c3aed"
            />
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div onClick={() => openDetails("quality_events_count", "Инциденты поставщиков", "quality_events")} style={{ cursor: "pointer" }}>
            <SummaryCard
              title="Инциденты поставщиков"
              value={formatNumber(summary?.quality_events_count)}
              hint="Нажмите, чтобы открыть список"
              tone="#dc2626"
            />
          </div>
        </Col>
        <Col xs={24} sm={12} lg={12}>
          <SummaryCard
            title="Среднее время до выбора"
            value={formatHours(summary?.avg_hours_to_selection)}
            hint="От создания RFQ до утвержденного выбора"
            tone="#f59e0b"
          />
        </Col>
        <Col xs={24} sm={12} lg={12}>
          <SummaryCard
            title="Среднее время до первого ответа"
            value={formatHours(summary?.avg_hours_to_first_response)}
            hint="От отправки RFQ до первого ответа поставщика"
            tone="#14b8a6"
          />
        </Col>
      </Row>

      <Card
        title={getAggregationTitle(aggregation)}
        size="small"
        bodyStyle={{ height: 340 }}
        loading={loading}
        extra={
          <Space size={[8, 8]} wrap>
            <Checkbox.Group
              value={visibleSeries}
              onChange={(next) => setVisibleSeries(next)}
              options={PROCUREMENT_SERIES.map((item) => ({
                value: item.key,
                label: item.label,
              }))}
            />
            <Button size="small" onClick={() => setVisibleSeries(PROCUREMENT_SERIES.map((item) => item.key))}>
              Все линии
            </Button>
            <Button
              size="small"
              onClick={() =>
                setVisibleSeries([
                  "rfqs_count",
                  "invites_count",
                  "responses_count",
                  "selections_count",
                  "purchase_orders_count",
                ])
              }
            >
              Объём
            </Button>
            <Button
              size="small"
              onClick={() =>
                setVisibleSeries([
                  "landed_amount",
                  "rfqs_count",
                  "responses_count",
                  "selections_count",
                ])
              }
            >
              Основные
            </Button>
            <Button
              size="small"
              onClick={() => setVisibleSeries(["landed_amount"])}
            >
              Деньги
            </Button>
            <Button
              size="small"
              onClick={() =>
                setVisibleSeries(["responses_count", "quality_events_count"])
              }
            >
              Качество
            </Button>
          </Space>
        }
      >
        {chartMode === "fact_plan" && !activeTarget ? (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="Для этого фильтра не найдена цель KPI. График показывает только факт."
          />
        ) : null}
        {chartData.length === 0 ? (
          <Empty description="Нет данных за период" />
        ) : chartSeries.length === 0 ? (
          <Empty description="Выберите хотя бы одну линию" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartDataWithPlan} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period_label" />
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
                  if (String(name || "").includes("Сумма выбора")) {
                    return formatMoney(value, currency)
                  }
                  return formatNumber(value)
                }}
                labelFormatter={(label) =>
                  `${getTooltipLabelPrefix(aggregation)}: ${label}`
                }
              />
              <Legend onClick={(payload) => payload?.dataKey && toggleSeries(payload.dataKey)} />
              {chartSeries.map((series) => (
                <React.Fragment key={series.key}>
                  <Line
                    yAxisId={series.axis}
                    type="monotone"
                    dataKey={series.key}
                    name={series.label}
                    stroke={series.color}
                    strokeWidth={2}
                    dot={false}
                  />
                  {chartMode === "fact_plan" && activeTarget ? (
                    <Line
                      yAxisId={series.axis}
                      type="monotone"
                      dataKey={`plan_${series.key}`}
                      name={`${series.label} · план`}
                      stroke={series.color}
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      strokeOpacity={0.5}
                      dot={false}
                    />
                  ) : null}
                </React.Fragment>
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card title="Цели закупочного KPI" size="small" loading={loading}>
        {isAdmin && (
          <Form
            form={targetForm}
            layout="inline"
            onFinish={handleCreateTarget}
            style={{ marginBottom: 12 }}
          >
            <Form.Item
              name="buyer_user_id"
              label="Закупщик"
              rules={[{ required: true, message: "Выберите закупщика" }]}
            >
              <Select
                placeholder="Выберите"
                style={{ minWidth: 220 }}
                options={buyerOptions}
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
            <Form.Item name="target_rfqs" label="План, RFQ">
              <InputNumber min={0} precision={0} style={{ width: 130 }} />
            </Form.Item>
            <Form.Item name="target_invites" label="План, приглашения">
              <InputNumber min={0} precision={0} style={{ width: 150 }} />
            </Form.Item>
            <Form.Item name="target_selections" label="План, выборы">
              <InputNumber min={0} precision={0} style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="target_purchase_orders" label="План, заказы">
              <InputNumber min={0} precision={0} style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="target_landed_amount" label="План, сумма">
              <InputNumber min={0} style={{ width: 160 }} />
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
            `${row.buyer_user_id || "u"}-${row.period_start || "p"}`
          }
          columns={columns}
          dataSource={targetsData}
          pagination={{ pageSize: 10 }}
          size="small"
          scroll={{ x: 1600 }}
          locale={{
            emptyText: apiReady
              ? "Нет целей закупочного KPI"
              : "API закупочного KPI пока не подключён",
          }}
        />
      </Card>

      <Modal
        open={editOpen}
        title="Редактировать цель закупочного KPI"
        onCancel={closeEditTarget}
        onOk={handleUpdateTarget}
        confirmLoading={savingTarget}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="buyer_user_id"
            label="Закупщик"
            rules={[{ required: true, message: "Выберите закупщика" }]}
          >
            <Select
              placeholder="Выберите"
              options={buyerOptions}
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
          <Form.Item name="target_rfqs" label="План, RFQ">
            <InputNumber min={0} precision={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="target_invites" label="План, приглашения">
            <InputNumber min={0} precision={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="target_selections" label="План, выборы">
            <InputNumber min={0} precision={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="target_purchase_orders" label="План, заказы">
            <InputNumber min={0} precision={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="target_landed_amount" label="План, сумма выбора">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      <KpiHelpDrawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="Справка по закупочному KPI"
        intro="Здесь оценивается работа закупщика по его процессной воронке: от RFQ до заказа поставщику. Экран помогает видеть не только объём, но и качество реакции поставщиков и устойчивость исполнения."
        sections={PROCUREMENT_KPI_HELP_SECTIONS}
      />
      <KpiDetailsDrawer
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={detailsTitle}
        loading={detailsLoading}
        rows={detailsRows}
        type={detailsType}
        currency={currency}
      />
    </Space>
  )
}
