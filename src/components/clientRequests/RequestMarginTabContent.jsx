import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Alert, Button, Card, Drawer, InputNumber, Popconfirm, Select, Space, Table, Tag, Typography, message } from "antd"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"
import { getClientFacingDescription, getClientFacingPartNumber } from "@/components/rfqWorkspace/partDisplay"
import {
  canonicalQuoteStatus,
  formatSalesQuoteLabel,
} from "@/components/clientRequests/salesQuoteDisplay"

const pricingStatusMeta = {
  OK: { color: "green", label: "OK" },
  INCOMPLETE: { color: "default", label: "Не заполнено" },
  LOW_MARGIN: { color: "orange", label: "Низкая валовая маржа" },
  LOW_MARKUP: { color: "gold", label: "Низкая наценка" },
  LOW_PROFIT: { color: "red", label: "Низкая прибыль" },
}

const lineStatusOptions = [
  { value: "active", label: "В предложении" },
  { value: "excluded", label: "Исключена" },
]

const calculatorDefaultGlobals = {
  cost_dost_hki_eur: 0,
  cost_port_eur: 0,
  cost_warehouse_fin_eur: 0,
  cost_dost_rk_eur: 0,
  cost_dost_spb_eur: 0,
  cost_dost_client_eur: 0,
  cost_certification_eur: 0,
  cost_declaration_eur: 0,
  cost_customs_fees_eur: 0,
  nadcen_rk: 0.05,
  fin_poteri: 0.05,
  nds: 0.2,
}

const calculatorDefaultLineDefaults = {
  nadcen_fin_pct: 0.15,
  customs_pct: 0.05,
  nadcen_rf_pct: 0.15,
}

const moneyInputGroups = [
  {
    title: "Маршрут",
    fields: [
      { key: "cost_dost_hki_eur", label: "До Хельсинки" },
      { key: "cost_port_eur", label: "Порт" },
      { key: "cost_warehouse_fin_eur", label: "Склад Фин." },
      { key: "cost_dost_rk_eur", label: "До РК" },
      { key: "cost_dost_spb_eur", label: "До СПб" },
      { key: "cost_dost_client_eur", label: "До клиента" },
    ],
  },
  {
    title: "Оформление",
    fields: [
      { key: "cost_customs_fees_eur", label: "Тамож. сборы" },
      { key: "cost_certification_eur", label: "Сертификация" },
      { key: "cost_declaration_eur", label: "Декларация" },
    ],
  },
]

const percentInputGroups = [
  {
    title: "Наценки и налоги",
    fields: [
      { scope: "line", key: "nadcen_fin_pct", label: "Финляндия" },
      { scope: "global", key: "nadcen_rk", label: "РК" },
      { scope: "line", key: "customs_pct", label: "Таможня" },
      { scope: "global", key: "fin_poteri", label: "Фин. потери" },
      { scope: "line", key: "nadcen_rf_pct", label: "РФ" },
      { scope: "global", key: "nds", label: "НДС" },
    ],
  },
]

const percentToInput = (value) => Number(((Number(value || 0) || 0) * 100).toFixed(2))
const inputToPercent = (value) => (Number(value || 0) || 0) / 100
const formatDateTime = (value) => {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ru-RU")
}

export default function RequestMarginTabContent({ requestId }) {
  const [quotes, setQuotes] = useState([])
  const [selectedQuoteId, setSelectedQuoteId] = useState(null)
  const [revisions, setRevisions] = useState([])
  const [selectedRevisionId, setSelectedRevisionId] = useState(null)
  const [lines, setLines] = useState([])
  const [loading, setLoading] = useState(false)
  const [savingAll, setSavingAll] = useState(false)
  const [drafts, setDrafts] = useState({})
  const [helpOpen, setHelpOpen] = useState(false)
  const [calculatorGlobals, setCalculatorGlobals] = useState(calculatorDefaultGlobals)
  const [calculatorLineDefaults, setCalculatorLineDefaults] = useState(calculatorDefaultLineDefaults)
  const [calculatorPreview, setCalculatorPreview] = useState(null)
  const [calculatorLoading, setCalculatorLoading] = useState(false)
  const [calculatorApplying, setCalculatorApplying] = useState(false)
  const [calculationHistory, setCalculationHistory] = useState([])
  const [calculationHistoryLoading, setCalculationHistoryLoading] = useState(false)
  const [calculationDetailOpen, setCalculationDetailOpen] = useState(false)
  const [calculationDetail, setCalculationDetail] = useState(null)
  const [calculationDetailLoading, setCalculationDetailLoading] = useState(false)
  const loadQuotes = async () => {
    if (!requestId) return
    try {
      const { data } = await axios.get("/sales-quotes", { params: { request_id: requestId } })
      const rows = Array.isArray(data) ? data : []
      setQuotes(rows)
      const firstQuoteId = Number(rows?.[0]?.id || 0) || null
      setSelectedQuoteId((prev) => prev || firstQuoteId)
    } catch (e) {
      setQuotes([])
      message.error(e?.response?.data?.message || "Не удалось загрузить коммерческие предложения")
    }
  }

  const loadRevisions = async (quoteIdOverride) => {
    const quoteId = Number(quoteIdOverride || selectedQuoteId || 0) || null
    if (!quoteId) {
      setRevisions([])
      setSelectedRevisionId(null)
      return
    }
    try {
      const { data } = await axios.get(`/sales-quotes/${quoteId}/revisions`)
      const rows = Array.isArray(data) ? data : []
      setRevisions(rows)
      setSelectedRevisionId((prev) => prev || Number(rows?.[0]?.id || 0) || null)
    } catch (e) {
      setRevisions([])
      setSelectedRevisionId(null)
      message.error(e?.response?.data?.message || "Не удалось загрузить ревизии коммерческого предложения")
    }
  }

  const loadLines = async (revisionIdOverride) => {
    const revisionId = Number(revisionIdOverride || selectedRevisionId || 0) || null
    if (!revisionId) {
      setLines([])
      setDrafts({})
      return
    }
    setLoading(true)
    try {
      const { data } = await axios.get(`/sales-quotes/revisions/${revisionId}/lines`)
      const rows = Array.isArray(data) ? data : []
      setLines(rows)
      const nextDrafts = {}
      rows.forEach((row) => {
        nextDrafts[row.id] = {
          qty: row.qty,
          cost: row.cost,
          sell_price: row.sell_price,
          margin_pct: row.margin_pct,
          currency: row.currency || "USD",
          line_status: row.line_status || "active",
        }
      })
      setDrafts(nextDrafts)
    } catch (e) {
      setLines([])
      setDrafts({})
      message.error(e?.response?.data?.message || "Не удалось загрузить строки коммерческого предложения")
    } finally {
      setLoading(false)
    }
  }

  const loadCalculationHistory = async (revisionIdOverride) => {
    const revisionId = Number(revisionIdOverride || selectedRevisionId || 0) || null
    if (!revisionId) {
      setCalculationHistory([])
      return
    }
    setCalculationHistoryLoading(true)
    try {
      const { data } = await axios.get(`/sales-quotes/revisions/${revisionId}/calculations`)
      const rows = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
      setCalculationHistory(rows)
    } catch (e) {
      setCalculationHistory([])
      message.error(e?.response?.data?.message || "Не удалось загрузить историю расчетов КП")
    } finally {
      setCalculationHistoryLoading(false)
    }
  }

  useEffect(() => {
    loadQuotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  useEffect(() => {
    loadRevisions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQuoteId])

  useEffect(() => {
    loadLines()
    loadCalculationHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRevisionId])

  useEffect(() => {
    setCalculatorPreview(null)
    setCalculationDetail(null)
    setCalculationDetailOpen(false)
  }, [selectedRevisionId])

  const selectedQuote = useMemo(
    () => quotes.find((row) => Number(row.id) === Number(selectedQuoteId || 0)) || null,
    [quotes, selectedQuoteId]
  )
  const commercialCycleClosed = useMemo(
    () => quotes.some((row) => canonicalQuoteStatus(row.status) === "contract_signed"),
    [quotes]
  )
  const quoteCurrency = selectedQuote?.currency || "USD"
  const selectedCalculation = calculationDetail?.calculation || null
  const selectedCalculationCurrency = selectedCalculation?.currency || quoteCurrency
  const selectedCalculationTotals = selectedCalculation?.totals || null
  const isLatestRevisionSelected =
    Number(selectedRevisionId || 0) > 0 &&
    Number(selectedRevisionId || 0) === Number(selectedQuote?.latest_revision_id || 0)
  const canEditRevision =
    !commercialCycleClosed &&
    canonicalQuoteStatus(selectedQuote?.status) === "internal_review" &&
    isLatestRevisionSelected

  const totals = useMemo(() => {
    const totalsBase = lines.reduce(
      (acc, row) => {
        const draft = drafts[row.id] || row
        const isActive = String(draft.line_status || row.line_status || "active") === "active"
        if (!isActive) return acc
        const qty = Number(draft.qty || 0)
        const cost = Number(draft.cost || 0)
        const sellRaw = draft.sell_price
        const sell = sellRaw === null || sellRaw === undefined || sellRaw === "" ? null : Number(sellRaw)
        acc.cost += qty * cost
        if (qty <= 0 || sell === null || !Number.isFinite(sell) || sell <= 0) {
          acc.incomplete += 1
        } else {
          acc.sell += qty * sell
        }
        return acc
      },
      { cost: 0, sell: 0, incomplete: 0 }
    )
    const profit = totalsBase.sell - totalsBase.cost
    const marginPct = totalsBase.sell > 0 ? (profit / totalsBase.sell) * 100 : 0
    const markupPct = totalsBase.cost > 0 ? (profit / totalsBase.cost) * 100 : 0
    return {
      ...totalsBase,
      profit,
      marginPct,
      markupPct,
    }
  }, [drafts, lines])

  const dirtyLineIds = useMemo(
    () =>
      lines
        .filter((row) => {
          const draft = drafts[row.id]
          if (!draft) return false
          return (
            Number(draft.qty ?? 0) !== Number(row.qty ?? 0) ||
            Number(draft.cost ?? 0) !== Number(row.cost ?? 0) ||
            Number(draft.sell_price ?? 0) !== Number(row.sell_price ?? 0) ||
            Number(draft.margin_pct ?? 0) !== Number(row.margin_pct ?? 0) ||
            String(draft.currency || "USD") !== String(row.currency || "USD") ||
            String(draft.line_status || "active") !== String(row.line_status || "active")
          )
        })
        .map((row) => row.id),
    [drafts, lines]
  )
  const dirtyLineIdSet = useMemo(() => new Set(dirtyLineIds), [dirtyLineIds])

  const calculatorCurrency = calculatorPreview?.currency || quoteCurrency
  const calculatorTotals = calculatorPreview?.totals || null

  const updateCalculatorGlobal = (key, value) => {
    setCalculatorGlobals((prev) => ({ ...prev, [key]: value ?? 0 }))
    setCalculatorPreview(null)
  }

  const updateCalculatorLineDefault = (key, value) => {
    setCalculatorLineDefaults((prev) => ({ ...prev, [key]: value ?? 0 }))
    setCalculatorPreview(null)
  }

  const resetCalculator = () => {
    setCalculatorGlobals(calculatorDefaultGlobals)
    setCalculatorLineDefaults(calculatorDefaultLineDefaults)
    setCalculatorPreview(null)
  }

  const loadCalculatorPreview = async () => {
    if (!selectedRevisionId) return
    if (dirtyLineIds.length) {
      message.warning("Сначала сохраните изменения в строках КП")
      return
    }
    setCalculatorLoading(true)
    try {
      const { data } = await axios.post(
        `/sales-quotes/revisions/${selectedRevisionId}/calculation-preview`,
        {
          globals: calculatorGlobals,
          line_defaults: calculatorLineDefaults,
        }
      )
      setCalculatorPreview(data)
    } catch (e) {
      setCalculatorPreview(null)
      message.error(e?.response?.data?.message || "Не удалось рассчитать preview КП")
    } finally {
      setCalculatorLoading(false)
    }
  }

  const applyCalculatorPreview = async () => {
    if (!selectedRevisionId) return
    if (dirtyLineIds.length) {
      message.warning("Сначала сохраните изменения в строках КП")
      return
    }
    setCalculatorApplying(true)
    try {
      const { data } = await axios.post(
        `/sales-quotes/revisions/${selectedRevisionId}/calculation-apply`,
        {
          globals: calculatorGlobals,
          line_defaults: calculatorLineDefaults,
        }
      )
      setCalculatorPreview(data)
      message.success(`Расчет применен к строкам КП: ${Number(data?.updated_line_count || 0)}`)
      await loadLines(selectedRevisionId)
      await loadCalculationHistory(selectedRevisionId)
      await loadQuotes()
      await loadRevisions(selectedQuoteId)
    } catch (e) {
      const details = Array.isArray(e?.response?.data?.details) ? e.response.data.details.join(" ") : ""
      const baseMessage = e?.response?.data?.message || "Не удалось применить расчет к КП"
      message.error(details ? `${baseMessage}: ${details}` : baseMessage)
    } finally {
      setCalculatorApplying(false)
    }
  }

  const openCalculationDetail = useCallback(async (calculationId) => {
    const id = Number(calculationId || 0) || null
    if (!id) return
    setCalculationDetailOpen(true)
    setCalculationDetail(null)
    setCalculationDetailLoading(true)
    try {
      const { data } = await axios.get(`/sales-quotes/calculations/${id}`)
      setCalculationDetail(data || null)
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось открыть расчет КП")
      setCalculationDetailOpen(false)
    } finally {
      setCalculationDetailLoading(false)
    }
  }, [])

  const calculatorPreviewColumns = useMemo(
    () => [
      {
        title: "Позиция",
        width: 260,
        render: (_, row) => (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{row.catalog_number || `#${row.sales_quote_line_id}`}</Typography.Text>
            {row.description ? (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {row.description}
              </Typography.Text>
            ) : null}
            {row.supplier_public_codes ? (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {row.supplier_public_codes}
              </Typography.Text>
            ) : null}
          </Space>
        ),
      },
      {
        title: "Закупка",
        width: 140,
        render: (_, row) => (
          <Space direction="vertical" size={0}>
            <span>{formatPriceWithCurrency(row.purchase_price_eur_per_unit, calculatorCurrency)}</span>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {`x ${Number(row.quantity || 0)}`}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: "Цена без НДС",
        width: 150,
        render: (_, row) => formatPriceWithCurrency(row.total_without_nds_per_unit, calculatorCurrency),
      },
      {
        title: "Сумма с НДС",
        width: 150,
        render: (_, row) => formatPriceWithCurrency(row.total_with_nds_total, calculatorCurrency),
      },
      {
        title: "Расклад",
        width: 190,
        render: (_, row) => (
          <Space direction="vertical" size={0}>
            <Typography.Text style={{ fontSize: 12 }}>
              {`DAP РК: ${formatPriceWithCurrency(row.final_price_fin_rk_eur, calculatorCurrency)}`}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {`Таможня: ${formatPriceWithCurrency(row.customs_duty_per_unit, calculatorCurrency)}`}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {`РФ: ${formatPriceWithCurrency(row.nadcen_rf_per_unit, calculatorCurrency)}`}
            </Typography.Text>
          </Space>
        ),
      },
    ],
    [calculatorCurrency]
  )

  const calculationHistoryColumns = useMemo(
    () => [
      {
        title: "Расчет",
        width: 190,
        render: (_, row) => (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{`#${row.id}`}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {formatDateTime(row.applied_at || row.created_at)}
            </Typography.Text>
            {row.applied_by_name || row.created_by_name ? (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {row.applied_by_name || row.created_by_name}
              </Typography.Text>
            ) : null}
          </Space>
        ),
      },
      {
        title: "Итог",
        width: 240,
        render: (_, row) => {
          const totals = row.totals || {}
          return (
            <Space direction="vertical" size={0}>
              <Typography.Text>
                {formatPriceWithCurrency(totals.total_without_nds_eur, row.currency || quoteCurrency)}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {`с НДС: ${formatPriceWithCurrency(totals.total_with_nds_eur, row.currency || quoteCurrency)}`}
              </Typography.Text>
            </Space>
          )
        },
      },
      {
        title: "Маржа",
        width: 180,
        render: (_, row) => {
          const totals = row.totals || {}
          return (
            <Space direction="vertical" size={0}>
              <Typography.Text>
                {formatPriceWithCurrency(totals.margin_eur, row.currency || quoteCurrency)}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {`${Number(totals.margin_pct || 0).toFixed(1)}%`}
              </Typography.Text>
            </Space>
          )
        },
      },
      {
        title: "Строки",
        width: 150,
        render: (_, row) => (
          <Space wrap size={[6, 6]}>
            <Tag>{Number(row.line_count || 0)}</Tag>
            {Array.isArray(row.warnings) && row.warnings.length ? (
              <Tag color="orange">{`Предупр.: ${row.warnings.length}`}</Tag>
            ) : null}
          </Space>
        ),
      },
      {
        title: "Действие",
        width: 120,
        render: (_, row) => (
          <Button size="small" onClick={() => openCalculationDetail(row.id)}>
            Открыть
          </Button>
        ),
      },
    ],
    [openCalculationDetail, quoteCurrency]
  )

  const calculationDetailColumns = useMemo(
    () => [
      {
        title: "Позиция",
        width: 260,
        render: (_, row) => (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>
              {row.display_part_number_snapshot || `#${row.sales_quote_line_id || row.id}`}
            </Typography.Text>
            {row.display_description_snapshot ? (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {row.display_description_snapshot}
              </Typography.Text>
            ) : null}
          </Space>
        ),
      },
      {
        title: "Кол-во",
        width: 90,
        render: (_, row) => Number(row.quantity || 0),
      },
      {
        title: "Закупка",
        width: 130,
        render: (_, row) => formatPriceWithCurrency(row.purchase_price, selectedCalculationCurrency),
      },
      {
        title: "Цена без НДС",
        width: 140,
        render: (_, row) => formatPriceWithCurrency(row.sell_price_without_vat, selectedCalculationCurrency),
      },
      {
        title: "Сумма с НДС",
        width: 140,
        render: (_, row) => formatPriceWithCurrency(row.line_total_with_vat, selectedCalculationCurrency),
      },
      {
        title: "Маржа",
        width: 120,
        render: (_, row) => (
          <Space direction="vertical" size={0}>
            <Typography.Text>{`${Number(row.gross_margin_pct || 0).toFixed(1)}%`}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {`наценка ${Number(row.markup_pct || 0).toFixed(1)}%`}
            </Typography.Text>
          </Space>
        ),
      },
    ],
    [selectedCalculationCurrency]
  )

  const renderCalculationWarnings = (warnings, messageText) =>
    Array.isArray(warnings) && warnings.length ? (
      <Alert
        type="warning"
        showIcon
        message={messageText}
        description={
          <Space direction="vertical" size={2}>
            {warnings.map((warning) => (
              <span key={warning}>{warning}</span>
            ))}
          </Space>
        }
      />
    ) : null

  const renderCalculationTotals = (summary, currency) => {
    if (!summary) return null
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 8,
        }}
      >
        {[
          ["Закупка", formatPriceWithCurrency(summary.total_purchase_eur, currency)],
          ["DAP РК", formatPriceWithCurrency(summary.total_dap_rk_eur, currency)],
          ["Без НДС", formatPriceWithCurrency(summary.total_without_nds_eur, currency)],
          ["С НДС", formatPriceWithCurrency(summary.total_with_nds_eur, currency)],
          ["Маржа", `${formatPriceWithCurrency(summary.margin_eur, currency)} · ${Number(summary.margin_pct || 0).toFixed(1)}%`],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              border: "1px solid #f0f0f0",
              borderRadius: 8,
              padding: "8px 10px",
              minHeight: 58,
            }}
          >
            <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>
              {label}
            </Typography.Text>
            <Typography.Text strong>{value}</Typography.Text>
          </div>
        ))}
      </div>
    )
  }

  const renderMoneyInput = (field) => (
    <div key={field.key} style={{ minWidth: 150 }}>
      <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
        {field.label}
      </Typography.Text>
      <InputNumber
        min={0}
        size="small"
        style={{ width: "100%" }}
        value={calculatorGlobals[field.key]}
        onChange={(value) => updateCalculatorGlobal(field.key, value)}
        addonAfter={quoteCurrency}
      />
    </div>
  )

  const renderPercentInput = (field) => {
    const value =
      field.scope === "line"
        ? calculatorLineDefaults[field.key]
        : calculatorGlobals[field.key]
    const onChange = field.scope === "line" ? updateCalculatorLineDefault : updateCalculatorGlobal
    return (
      <div key={`${field.scope}-${field.key}`} style={{ minWidth: 130 }}>
        <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
          {field.label}
        </Typography.Text>
        <InputNumber
          min={0}
          size="small"
          style={{ width: "100%" }}
          value={percentToInput(value)}
          onChange={(nextValue) => onChange(field.key, inputToPercent(nextValue))}
          addonAfter="%"
        />
      </div>
    )
  }

  const handleDraftChange = (lineId, patch) => {
    setDrafts((prev) => {
      const next = { ...(prev[lineId] || {}), ...patch }
      if (patch.cost !== undefined && patch.margin_pct !== undefined && patch.sell_price === undefined) {
        next.sell_price = Number(patch.cost || 0) * (1 + Number(patch.margin_pct || 0) / 100)
      } else if (patch.sell_price !== undefined && patch.cost !== undefined && Number(patch.cost || 0) !== 0 && patch.margin_pct === undefined) {
        next.margin_pct = ((Number(patch.sell_price || 0) - Number(patch.cost || 0)) / Number(patch.cost || 1)) * 100
      }
      return { ...prev, [lineId]: next }
    })
  }

  const saveDirtyLines = async () => {
    if (!dirtyLineIds.length) return
    setSavingAll(true)
    try {
      for (const lineId of dirtyLineIds) {
        const payload = drafts[lineId]
        if (!payload) continue
        await axios.patch(`/sales-quotes/lines/${lineId}`, payload)
      }
      message.success(`Сохранено строк: ${dirtyLineIds.length}`)
      await loadLines()
      await loadQuotes()
      await loadRevisions()
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось сохранить изменения по строкам предложения")
    } finally {
      setSavingAll(false)
    }
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="Расчет продажи ведется поверх утвержденной закупочной базы"
        description="В себестоимости уже лежит полная закупочная база из выбора закупки. Продавец задает цену продажи или наценку и ведет клиентскую экономику без раскрытия реальных поставщиков. Статус строки позволяет исключить позицию из коммерческой ревизии."
      />

      {!canEditRevision && selectedQuoteId ? (
        <Alert
          type="warning"
          showIcon
          message="Редактирование этой ревизии закрыто"
          description={
            commercialCycleClosed
              ? "По этой ревизии заявки уже есть подписанный контракт. Старые КП нельзя дорабатывать задним числом: для нового торга создайте новую ревизию заявки."
              : canonicalQuoteStatus(selectedQuote?.status) !== "internal_review"
              ? "Править строки можно только пока коммерческое предложение находится во «Внутреннем согласовании». Чтобы менять отправленное или согласованное предложение, сначала верните его в работу и создайте новую ревизию."
              : "Править можно только последнюю ревизию коммерческого предложения. Исторические ревизии доступны только для просмотра."
          }
        />
      ) : null}

      <Card
        size="small"
        title="Контекст ревизии"
        extra={
          <Space wrap>
            <Button
              type="primary"
              onClick={saveDirtyLines}
              loading={savingAll}
              disabled={!canEditRevision || !dirtyLineIds.length}
            >
              {dirtyLineIds.length ? `Сохранить изменения (${dirtyLineIds.length})` : "Нет изменений"}
            </Button>
            <Button size="small" onClick={() => setHelpOpen(true)}>
              Справка
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Space wrap size={[12, 12]}>
            <Select
              style={{ width: 320, maxWidth: "100%" }}
              allowClear
              placeholder="Коммерческое предложение"
              value={selectedQuoteId || undefined}
              onChange={(value) => setSelectedQuoteId(Number(value || 0) || null)}
              options={quotes.map((row) => ({
                value: Number(row.id),
                label: formatSalesQuoteLabel(row),
              }))}
            />
            <Select
              style={{ width: 220, maxWidth: "100%" }}
              allowClear
              placeholder="Ревизия предложения"
              value={selectedRevisionId || undefined}
              onChange={(value) => setSelectedRevisionId(Number(value || 0) || null)}
              options={revisions.map((row) => ({
                value: Number(row.id),
                label: `Ревизия ${row.rev_number}`,
              }))}
            />
          </Space>

          <Space wrap size={[8, 8]}>
            <Tag color="blue">Себестоимость: {formatPriceWithCurrency(totals.cost, quoteCurrency)}</Tag>
            <Tag color="green">Продажа: {formatPriceWithCurrency(totals.sell, quoteCurrency)}</Tag>
            <Tag color="gold">Прибыль: {formatPriceWithCurrency(totals.profit, quoteCurrency)}</Tag>
            <Tag color="purple">Валовая маржа: {totals.marginPct.toFixed(1)}%</Tag>
            <Tag color="cyan">Наценка: {totals.markupPct.toFixed(1)}%</Tag>
            {totals.incomplete > 0 ? <Tag color="orange">Без продажной цены: {totals.incomplete}</Tag> : null}
            <Tag color={dirtyLineIds.length ? "orange" : "default"}>
              Изменено строк: {dirtyLineIds.length}
            </Tag>
          </Space>
        </Space>
      </Card>

      <Card
        size="small"
        title="Калькулятор цены КП"
        extra={
          <Space wrap>
            <Tag color={calculatorPreview?.applied ? "green" : "blue"}>
              {calculatorPreview?.applied ? "Применено в КП" : "Preview без сохранения"}
            </Tag>
            <Button size="small" onClick={resetCalculator}>
              Сбросить
            </Button>
            <Button
              size="small"
              type="primary"
              onClick={loadCalculatorPreview}
              loading={calculatorLoading}
              disabled={!selectedRevisionId || Boolean(dirtyLineIds.length)}
            >
              Рассчитать
            </Button>
            <Popconfirm
              title="Применить расчет к КП?"
              description="Продажные цены активных строк будут обновлены, а расчет сохранится как snapshot."
              okText="Применить"
              cancelText="Отмена"
              onConfirm={applyCalculatorPreview}
              disabled={!calculatorPreview || !canEditRevision || Boolean(dirtyLineIds.length)}
            >
              <Button
                size="small"
                loading={calculatorApplying}
                disabled={!calculatorPreview || !canEditRevision || Boolean(dirtyLineIds.length)}
              >
                Применить в КП
              </Button>
            </Popconfirm>
          </Space>
        }
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          {dirtyLineIds.length ? (
            <Alert
              type="warning"
              showIcon
              message="Есть несохраненные строки КП"
              description="Расчет строится по сохраненной ревизии. Сохраните строки, затем обновите preview."
            />
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 12,
              alignItems: "start",
            }}
          >
            {moneyInputGroups.map((group) => (
              <div key={group.title}>
                <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
                  {group.title}
                </Typography.Text>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: 8,
                  }}
                >
                  {group.fields.map(renderMoneyInput)}
                </div>
              </div>
            ))}
            {percentInputGroups.map((group) => (
              <div key={group.title}>
                <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
                  {group.title}
                </Typography.Text>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                    gap: 8,
                  }}
                >
                  {group.fields.map(renderPercentInput)}
                </div>
              </div>
            ))}
          </div>

          {renderCalculationWarnings(calculatorPreview?.warnings, "Проверьте расчетные данные")}

          {renderCalculationTotals(calculatorTotals, calculatorCurrency)}

          {calculatorPreview?.items?.length ? (
            <Table
              size="small"
              rowKey="sales_quote_line_id"
              dataSource={calculatorPreview.items}
              columns={calculatorPreviewColumns}
              pagination={false}
              tableLayout="auto"
              scroll={{ x: "max-content" }}
            />
          ) : null}
        </Space>
      </Card>

      <Card
        size="small"
        title="История расчетов КП"
        extra={
          <Button
            size="small"
            onClick={() => loadCalculationHistory(selectedRevisionId)}
            loading={calculationHistoryLoading}
            disabled={!selectedRevisionId}
          >
            Обновить
          </Button>
        }
      >
        <Table
          size="small"
          rowKey="id"
          loading={calculationHistoryLoading}
          dataSource={calculationHistory}
          columns={calculationHistoryColumns}
          pagination={calculationHistory.length > 5 ? { pageSize: 5, size: "small" } : false}
          tableLayout="auto"
          scroll={{ x: "max-content" }}
          locale={{ emptyText: "Примененных расчетов по этой ревизии пока нет" }}
        />
      </Card>

      <Card
        size="small"
        title="Коммерческая экономика по строкам предложения"
        extra={
          <Typography.Text type="secondary">
            Правьте продажу или наценку, итоговые метрики пересчитываются автоматически.
          </Typography.Text>
        }
      >
        <Table
          size="small"
          rowKey="id"
          loading={loading}
          dataSource={lines}
          pagination={false}
          tableLayout="auto"
          scroll={{ x: "max-content" }}
          columns={[
            {
              title: "Позиция клиента",
              width: 280,
              render: (_, row) => (
                <Space direction="vertical" size={0}>
                  <span>{getClientFacingPartNumber(row, `#${row.client_request_revision_item_id}`)}</span>
                  {getClientFacingDescription(row) ? <span style={{ color: "#666", fontSize: 12 }}>{getClientFacingDescription(row)}</span> : null}
                  <Space wrap size={[6, 6]} style={{ marginTop: 4 }}>
                    <Tag color={(pricingStatusMeta[row.pricing_status] || { color: "default" }).color}>
                      {(pricingStatusMeta[row.pricing_status] || { label: row.pricing_status || "—" }).label}
                    </Tag>
                    {dirtyLineIdSet.has(row.id) ? <Tag color="orange">Есть изменения</Tag> : null}
                  </Space>
                  {row.pricing_note ? (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {row.pricing_note}
                    </Typography.Text>
                  ) : null}
                </Space>
              ),
            },
            {
              title: "Коды поставщиков",
              dataIndex: "supplier_public_codes",
              width: 150,
              render: (value) => value || "—",
            },
            {
              title: "Статус строки",
              width: 130,
              render: (_, row) => (
                <Select
                  size="small"
                  style={{ width: 110 }}
                  value={drafts[row.id]?.line_status || "active"}
                  onChange={(value) => handleDraftChange(row.id, { line_status: value })}
                  options={lineStatusOptions}
                  disabled={!canEditRevision}
                />
              ),
            },
            {
              title: "Коммерческие параметры",
              width: 320,
              render: (_, row) => (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(120px, 1fr))",
                    gap: 8,
                    minWidth: 280,
                  }}
                >
                  <div>
                    <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
                      Кол-во
                    </Typography.Text>
                    <InputNumber
                      min={0}
                      style={{ width: "100%" }}
                      value={drafts[row.id]?.qty}
                      onChange={(value) => handleDraftChange(row.id, { qty: value })}
                      disabled={!canEditRevision}
                    />
                  </div>
                  <div>
                    <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
                      Себестоимость
                    </Typography.Text>
                    <InputNumber
                      min={0}
                      style={{ width: "100%" }}
                      value={drafts[row.id]?.cost}
                      onChange={(value) =>
                        handleDraftChange(row.id, {
                          cost: value,
                          margin_pct: drafts[row.id]?.margin_pct,
                        })
                      }
                      disabled={!canEditRevision}
                    />
                  </div>
                  <div>
                    <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
                      Продажа
                    </Typography.Text>
                    <InputNumber
                      min={0}
                      style={{ width: "100%" }}
                      value={drafts[row.id]?.sell_price}
                      onChange={(value) =>
                        handleDraftChange(row.id, {
                          sell_price: value,
                          cost: drafts[row.id]?.cost,
                        })
                      }
                      disabled={!canEditRevision}
                    />
                  </div>
                  <div>
                    <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
                      Маржа %
                    </Typography.Text>
                    <InputNumber
                      min={0}
                      style={{ width: "100%" }}
                      value={drafts[row.id]?.margin_pct}
                      onChange={(value) =>
                        handleDraftChange(row.id, {
                          margin_pct: value,
                          cost: drafts[row.id]?.cost,
                        })
                      }
                      disabled={!canEditRevision}
                    />
                  </div>
                </div>
              ),
            },
            {
              title: "Результат",
              width: 190,
              render: (_, row) => {
                const draft = drafts[row.id] || row
                const qty = Number(draft.qty || 0)
                const cost = Number(draft.cost || 0)
                const sellRaw = draft.sell_price
                const sell = sellRaw === null || sellRaw === undefined || sellRaw === "" ? null : Number(sellRaw)
                const hasSell = sell !== null && Number.isFinite(sell) && sell > 0
                const grossMarginPct = sell > 0 ? ((sell - cost) / sell) * 100 : 0
                const markupPct = cost > 0 ? ((sell - cost) / cost) * 100 : 0
                const profit =
                  hasSell && String(draft.line_status || row.line_status || "active") === "active"
                    ? (sell - cost) * qty
                    : 0
                return (
                  <Space direction="vertical" size={0}>
                    {hasSell ? (
                      <>
                        <Typography.Text style={{ fontSize: 12 }}>
                          {`Валовая маржа: ${grossMarginPct.toFixed(1)}%`}
                        </Typography.Text>
                        <Typography.Text style={{ fontSize: 12 }}>
                          {`Наценка: ${markupPct.toFixed(1)}%`}
                        </Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {`Прибыль: ${formatPriceWithCurrency(profit, draft.currency || row.currency || "USD")}`}
                        </Typography.Text>
                      </>
                    ) : (
                      <Tag color="orange" style={{ width: "fit-content" }}>Продажа не заполнена</Tag>
                    )}
                  </Space>
                )
              },
            },
          ]}
        />
      </Card>

      <Drawer
        title="Справка по этапу «Расчет»"
        placement="right"
        width={440}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Typography.Paragraph>
            Здесь продавец работает уже не с закупкой, а с коммерческой моделью клиента: задает цену
            продажи, корректирует маржу и при необходимости исключает строки из ревизии предложения.
          </Typography.Paragraph>
          <Typography.Paragraph>
            Статус строки нужен для клиентского торга. Исключенная строка не участвует в коммерческих
            итогах и не должна потом попасть в заказ поставщику.
          </Typography.Paragraph>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            Если клиент меняет состав слишком сильно, это сигнал вернуть вопрос в закупку и пересобрать
            утвержденный закупочный набор, а не просто править продажную экономику.
          </Typography.Paragraph>
        </Space>
      </Drawer>

      <Drawer
        title={selectedCalculation ? `Расчет КП #${selectedCalculation.id}` : "Расчет КП"}
        placement="right"
        width={760}
        open={calculationDetailOpen}
        onClose={() => setCalculationDetailOpen(false)}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          {calculationDetailLoading && !calculationDetail ? (
            <Typography.Text type="secondary">Загрузка расчета...</Typography.Text>
          ) : null}

          {selectedCalculation ? (
            <>
              <Space wrap size={[8, 8]}>
                <Tag color="blue">{selectedCalculation.currency || quoteCurrency}</Tag>
                <Tag>{formatDateTime(selectedCalculation.applied_at || selectedCalculation.created_at)}</Tag>
                {selectedCalculation.applied_by_name || selectedCalculation.created_by_name ? (
                  <Tag>{selectedCalculation.applied_by_name || selectedCalculation.created_by_name}</Tag>
                ) : null}
              </Space>

              {renderCalculationWarnings(selectedCalculation.warnings, "Предупреждения расчета")}

              {renderCalculationTotals(selectedCalculationTotals, selectedCalculationCurrency)}

              <Table
                size="small"
                rowKey="id"
                loading={calculationDetailLoading}
                dataSource={Array.isArray(calculationDetail?.lines) ? calculationDetail.lines : []}
                columns={calculationDetailColumns}
                pagination={false}
                tableLayout="auto"
                scroll={{ x: "max-content" }}
              />
            </>
          ) : null}
        </Space>
      </Drawer>
    </Space>
  )
}
