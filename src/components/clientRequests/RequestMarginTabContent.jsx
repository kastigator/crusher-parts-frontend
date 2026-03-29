import React, { useEffect, useMemo, useState } from "react"
import { Alert, Button, Card, Drawer, InputNumber, Select, Space, Table, Tag, Typography, message } from "antd"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"
import { getClientFacingDescription, getClientFacingPartNumber } from "@/components/rfqWorkspace/partDisplay"

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
  const quoteStatusLabel = (value) =>
    ({
      draft: "Черновик",
      internal_review: "Внутреннее согласование",
      sent_to_client: "Отправлено клиенту",
      client_approved: "Согласовано клиентом",
      contract_signed: "Контракт подписан",
    }[String(value || "").trim()] || value || "—")
  const canonicalQuoteStatus = (value) =>
    String(value || "").trim().toLowerCase() === "draft" ? "internal_review" : String(value || "").trim().toLowerCase()

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

  const selectedQuote = useMemo(
    () => quotes.find((row) => Number(row.id) === Number(selectedQuoteId || 0)) || null,
    [quotes, selectedQuoteId]
  )
  const quoteCurrency = selectedQuote?.currency || "USD"
  const isLatestRevisionSelected =
    Number(selectedRevisionId || 0) > 0 &&
    Number(selectedRevisionId || 0) === Number(selectedQuote?.latest_revision_id || 0)
  const canEditRevision =
    canonicalQuoteStatus(selectedQuote?.status) === "internal_review" && isLatestRevisionSelected

  const totals = useMemo(() => {
    const totalsBase = lines.reduce(
      (acc, row) => {
        const draft = drafts[row.id] || row
        const isActive = String(draft.line_status || row.line_status || "active") === "active"
        if (!isActive) return acc
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
        message="Маржа считается в коммерческом контуре поверх закупочной базы"
        description="В себестоимости уже лежит полная закупочная база из выбора закупки. Продавец задает цену продажи или наценку и ведет клиентскую экономику без раскрытия реальных поставщиков. Статус строки позволяет исключить позицию из коммерческой ревизии."
      />

      {!canEditRevision && selectedQuoteId ? (
        <Alert
          type="warning"
          showIcon
          message="Редактирование этой ревизии закрыто"
          description={
            canonicalQuoteStatus(selectedQuote?.status) !== "internal_review"
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
                label: `Коммерческое предложение #${row.id} · ${quoteStatusLabel(row.status)} · ${formatPriceWithCurrency(row.total_sell, row.currency || "USD")}`,
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
            <Tag color={dirtyLineIds.length ? "orange" : "default"}>
              Изменено строк: {dirtyLineIds.length}
            </Tag>
          </Space>
        </Space>
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
                const sell = Number(draft.sell_price || 0)
                const grossMarginPct = sell > 0 ? ((sell - cost) / sell) * 100 : 0
                const markupPct = cost > 0 ? ((sell - cost) / cost) * 100 : 0
                const profit =
                  String(draft.line_status || row.line_status || "active") === "active"
                    ? (sell - cost) * qty
                    : 0
                return (
                  <Space direction="vertical" size={0}>
                    <Typography.Text style={{ fontSize: 12 }}>
                      {`Валовая маржа: ${grossMarginPct.toFixed(1)}%`}
                    </Typography.Text>
                    <Typography.Text style={{ fontSize: 12 }}>
                      {`Наценка: ${markupPct.toFixed(1)}%`}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {`Прибыль: ${formatPriceWithCurrency(profit, draft.currency || row.currency || "USD")}`}
                    </Typography.Text>
                  </Space>
                )
              },
            },
          ]}
        />
      </Card>

      <Drawer
        title="Справка по вкладке «Маржа»"
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
    </Space>
  )
}
