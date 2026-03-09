import React, { useEffect, useMemo, useState } from "react"
import { Alert, Button, Card, InputNumber, Select, Space, Table, Tag, Typography, message } from "antd"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"

const pricingStatusMeta = {
  OK: { color: "green", label: "OK" },
  INCOMPLETE: { color: "default", label: "Не заполнено" },
  LOW_MARGIN: { color: "orange", label: "Низкий GM%" },
  LOW_MARKUP: { color: "gold", label: "Низкий markup" },
  LOW_PROFIT: { color: "red", label: "Низкая прибыль" },
}

export default function RequestMarginTabContent({ requestId }) {
  const [quotes, setQuotes] = useState([])
  const [selectedQuoteId, setSelectedQuoteId] = useState(null)
  const [revisions, setRevisions] = useState([])
  const [selectedRevisionId, setSelectedRevisionId] = useState(null)
  const [lines, setLines] = useState([])
  const [loading, setLoading] = useState(false)
  const [savingLineId, setSavingLineId] = useState(null)
  const [drafts, setDrafts] = useState({})

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
      message.error(e?.response?.data?.message || "Не удалось загрузить КП")
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
      message.error(e?.response?.data?.message || "Не удалось загрузить ревизии КП")
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
        }
      })
      setDrafts(nextDrafts)
    } catch (e) {
      setLines([])
      setDrafts({})
      message.error(e?.response?.data?.message || "Не удалось загрузить строки КП")
    } finally {
      setLoading(false)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRevisionId])

  const totals = useMemo(() => {
    const totalsBase = lines.reduce(
      (acc, row) => {
        const draft = drafts[row.id] || row
        const qty = Number(draft.qty || 0)
        const cost = Number(draft.cost || 0)
        const sell = Number(draft.sell_price || 0)
        acc.cost += qty * cost
        acc.sell += qty * sell
        return acc
      },
      { cost: 0, sell: 0 }
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

  const saveLine = async (lineId) => {
    const payload = drafts[lineId]
    if (!payload) return
    setSavingLineId(lineId)
    try {
      await axios.patch(`/sales-quotes/lines/${lineId}`, payload)
      message.success("Строка КП обновлена")
      await loadLines()
      await loadQuotes()
      await loadRevisions()
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось обновить строку КП")
    } finally {
      setSavingLineId(null)
    }
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="Маржа считается на seller-side поверх selection cost"
        description="В cost уже лежит закупочная/landed база из selection. Продавец задаёт sell price или margin и ведёт клиентскую экономику без раскрытия реальных поставщиков. Статус строки теперь сверяется с активной pricing policy."
      />

      <Space wrap>
        <Select
          style={{ width: 320 }}
          allowClear
          placeholder="КП"
          value={selectedQuoteId || undefined}
          onChange={(value) => setSelectedQuoteId(Number(value || 0) || null)}
          options={quotes.map((row) => ({
            value: Number(row.id),
            label: `КП #${row.id} · ${row.status} · ${formatPriceWithCurrency(row.total_sell, row.currency || "USD")}`,
          }))}
        />
        <Select
          style={{ width: 220 }}
          allowClear
          placeholder="Ревизия КП"
          value={selectedRevisionId || undefined}
          onChange={(value) => setSelectedRevisionId(Number(value || 0) || null)}
          options={revisions.map((row) => ({
            value: Number(row.id),
            label: `Rev ${row.rev_number}`,
          }))}
        />
        <Tag color="blue">Cost total: {formatPriceWithCurrency(totals.cost, "USD")}</Tag>
        <Tag color="green">Sell total: {formatPriceWithCurrency(totals.sell, "USD")}</Tag>
        <Tag color="gold">Profit: {formatPriceWithCurrency(totals.profit, "USD")}</Tag>
        <Tag color="purple">GM%: {totals.marginPct.toFixed(1)}%</Tag>
        <Tag color="cyan">Markup%: {totals.markupPct.toFixed(1)}%</Tag>
      </Space>

      <Card size="small" title="Seller economics по строкам КП">
        <Table
          size="small"
          rowKey="id"
          loading={loading}
          dataSource={lines}
          pagination={false}
          columns={[
            {
              title: "Позиция клиента",
              render: (_, row) => (
                <Space direction="vertical" size={0}>
                  <span>{row.original_cat_number || row.client_part_number || `#${row.client_request_revision_item_id}`}</span>
                  {row.client_description ? <span style={{ color: "#666", fontSize: 12 }}>{row.client_description}</span> : null}
                </Space>
              ),
            },
            {
              title: "Коды поставщиков",
              dataIndex: "supplier_public_codes",
              width: 180,
              render: (value) => value || "—",
            },
            {
              title: "Qty",
              width: 90,
              render: (_, row) => (
                <InputNumber
                  min={0}
                  value={drafts[row.id]?.qty}
                  onChange={(value) => handleDraftChange(row.id, { qty: value })}
                />
              ),
            },
            {
              title: "Cost",
              width: 120,
              render: (_, row) => (
                <InputNumber
                  min={0}
                  value={drafts[row.id]?.cost}
                  onChange={(value) =>
                    handleDraftChange(row.id, {
                      cost: value,
                      margin_pct: drafts[row.id]?.margin_pct,
                    })
                  }
                />
              ),
            },
            {
              title: "Sell",
              width: 120,
              render: (_, row) => (
                <InputNumber
                  min={0}
                  value={drafts[row.id]?.sell_price}
                  onChange={(value) =>
                    handleDraftChange(row.id, {
                      sell_price: value,
                      cost: drafts[row.id]?.cost,
                    })
                  }
                />
              ),
            },
            {
              title: "Маржа %",
              width: 110,
              render: (_, row) => (
                <InputNumber
                  min={0}
                  value={drafts[row.id]?.margin_pct}
                  onChange={(value) =>
                    handleDraftChange(row.id, {
                      margin_pct: value,
                      cost: drafts[row.id]?.cost,
                    })
                  }
                />
              ),
            },
            {
              title: "GM %",
              width: 100,
              render: (_, row) => {
                const draft = drafts[row.id] || row
                const cost = Number(draft.cost || 0)
                const sell = Number(draft.sell_price || 0)
                const grossMarginPct = sell > 0 ? ((sell - cost) / sell) * 100 : 0
                return `${grossMarginPct.toFixed(1)}%`
              },
            },
            {
              title: "Markup %",
              width: 110,
              render: (_, row) => {
                const draft = drafts[row.id] || row
                const cost = Number(draft.cost || 0)
                const sell = Number(draft.sell_price || 0)
                const markupPct = cost > 0 ? ((sell - cost) / cost) * 100 : 0
                return `${markupPct.toFixed(1)}%`
              },
            },
            {
              title: "Profit / line",
              width: 140,
              render: (_, row) => {
                const draft = drafts[row.id] || row
                const qty = Number(draft.qty || 0)
                const cost = Number(draft.cost || 0)
                const sell = Number(draft.sell_price || 0)
                return formatPriceWithCurrency((sell - cost) * qty, draft.currency || row.currency || "USD")
              },
            },
            {
              title: "Policy",
              width: 180,
              render: (_, row) => {
                const meta = pricingStatusMeta[row.pricing_status] || { color: "default", label: row.pricing_status || "—" }
                return (
                  <Space direction="vertical" size={0}>
                    <Tag color={meta.color}>{meta.label}</Tag>
                    {row.pricing_note ? (
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {row.pricing_note}
                      </Typography.Text>
                    ) : null}
                  </Space>
                )
              },
            },
            {
              title: "Сохранить",
              width: 120,
              render: (_, row) => (
                <Button size="small" type="primary" onClick={() => saveLine(row.id)} loading={savingLineId === row.id}>
                  Сохранить
                </Button>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  )
}
