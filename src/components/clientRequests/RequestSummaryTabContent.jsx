import React, { useEffect, useMemo, useState } from "react"
import { Alert, Button, Card, Col, Empty, Row, Skeleton, Space, Table, Tag, Timeline, Typography, message } from "antd"
import { ReloadOutlined, SelectOutlined } from "@ant-design/icons"
import { useNavigate } from "react-router-dom"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"
import { formatDate, quoteStatusLabel } from "@/components/clientRequests/salesQuoteDisplay"

const numberOrZero = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const formatQty = (value) => {
  const n = numberOrZero(value)
  return Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")
}

const statusText = (value, fallback = "—") => String(value || fallback)

const workflowColor = {
  done: "green",
  attention: "orange",
  waiting: "gray",
}

const workflowTagColor = {
  done: "green",
  attention: "orange",
  waiting: "default",
}

const workflowLabel = {
  done: "Готово",
  attention: "Нужно действие",
  waiting: "Ожидает",
}

const contractStatusLabel = (value) =>
  ({
    draft: "Черновик",
    sent_to_client: "Отправлен клиенту",
    signed: "Подписан",
    in_execution: "В исполнении",
    completed: "Исполнен",
    closed_with_issues: "Закрыт с проблемами",
  }[String(value || "").trim().toLowerCase()] || value || "—")

const poStatusLabel = (value) =>
  ({
    draft: "Черновик",
    confirmed: "Подтвержден",
    sent: "Отправлен",
    partially_received: "Частичная приемка",
    received: "Принят",
    closed: "Закрыт",
  }[String(value || "").trim().toLowerCase()] || value || "—")

const makeMetric = (label, value, hint = null) => (
  <Col xs={24} sm={12} lg={6} key={label}>
    <div
      style={{
        border: "1px solid #f0f0f0",
        borderRadius: 8,
        padding: "12px 14px",
        minHeight: 82,
        background: "#fff",
      }}
    >
      <Typography.Text type="secondary">{label}</Typography.Text>
      <div style={{ fontSize: 22, fontWeight: 600, lineHeight: "30px" }}>{value}</div>
      {hint ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {hint}
        </Typography.Text>
      ) : null}
    </div>
  </Col>
)

export default function RequestSummaryTabContent({ requestId, onOpenTab }) {
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadSummary = async () => {
    if (!requestId) {
      setSummary(null)
      return
    }
    setLoading(true)
    try {
      const { data } = await axios.get(`/client-requests/${requestId}/commercial-summary`)
      setSummary(data)
    } catch (e) {
      setSummary(null)
      message.error(e?.response?.data?.message || "Не удалось загрузить сводку заявки")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  const selection = summary?.selection || null
  const latestQuote = summary?.sales_quotes?.latest || null
  const latestContract = summary?.contracts?.active || summary?.contracts?.latest || null
  const latestCurrency =
    latestQuote?.currency ||
    latestContract?.currency ||
    selection?.calc_currency ||
    "USD"

  const commercialDelta = useMemo(() => {
    if (!latestQuote) return null
    return numberOrZero(latestQuote.total_sell) - numberOrZero(latestQuote.total_cost)
  }, [latestQuote])

  if (loading && !summary) {
    return <Skeleton active paragraph={{ rows: 8 }} />
  }

  if (!summary) {
    return <Empty description="Сводка по заявке пока недоступна" />
  }

  const quoteColumns = [
    {
      title: "КП",
      width: 90,
      render: (_, row) => `#${row.id}`,
    },
    {
      title: "Статус",
      width: 180,
      render: (_, row) => <Tag>{quoteStatusLabel(row.status)}</Tag>,
    },
    {
      title: "Ревизия",
      width: 110,
      render: (_, row) => row.latest_revision_number || row.client_request_rev_number || "—",
    },
    {
      title: "Себестоимость",
      width: 140,
      render: (_, row) => formatPriceWithCurrency(row.total_cost, row.currency || latestCurrency),
    },
    {
      title: "Продажа",
      width: 140,
      render: (_, row) => formatPriceWithCurrency(row.total_sell, row.currency || latestCurrency),
    },
    {
      title: "Маржа",
      width: 90,
      render: (_, row) => `${numberOrZero(row.margin_pct_avg).toFixed(1)}%`,
    },
    {
      title: "Незаполнено",
      width: 120,
      render: (_, row) =>
        numberOrZero(row.incomplete_pricing_count) ? (
          <Tag color="orange">{numberOrZero(row.incomplete_pricing_count)}</Tag>
        ) : (
          <Tag color="green">0</Tag>
        ),
    },
  ]

  const contractColumns = [
    {
      title: "Контракт",
      width: 160,
      render: (_, row) => row.contract_number || `#${row.id}`,
    },
    {
      title: "Статус",
      width: 160,
      render: (_, row) => <Tag>{contractStatusLabel(row.status)}</Tag>,
    },
    {
      title: "Дата",
      width: 120,
      render: (_, row) => formatDate(row.contract_date),
    },
    {
      title: "Сумма",
      width: 150,
      render: (_, row) => formatPriceWithCurrency(row.amount, row.currency || latestCurrency),
    },
  ]

  const poColumns = [
    {
      title: "PO",
      width: 90,
      render: (_, row) => `#${row.id}`,
    },
    {
      title: "Поставщик",
      dataIndex: "supplier_name",
      width: 220,
      render: (value) => value || "—",
    },
    {
      title: "Статус",
      width: 150,
      render: (_, row) => <Tag>{poStatusLabel(row.status)}</Tag>,
    },
    {
      title: "Строк",
      width: 90,
      render: (_, row) => numberOrZero(row.line_count),
    },
    {
      title: "Кол-во",
      width: 100,
      render: (_, row) => formatQty(row.total_qty),
    },
    {
      title: "Сумма",
      width: 140,
      render: (_, row) => formatPriceWithCurrency(row.goods_total, row.currency || latestCurrency),
    },
  ]

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Card
        size="small"
        title="Сводка по заявке"
        extra={
          <Space wrap>
            {summary.rfq?.id ? (
              <Button
                size="small"
                icon={<SelectOutlined />}
                onClick={() => navigate(`/rfq-workspace?rfq=${summary.rfq.id}`)}
              >
                Открыть RFQ
              </Button>
            ) : null}
            <Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={loadSummary}>
              Обновить
            </Button>
          </Space>
        }
      >
        <Row gutter={[12, 12]}>
          {makeMetric(
            "Позиции",
            summary.revision?.item_count || 0,
            `привязано к карточкам: ${summary.revision?.catalog_linked_count || 0} / ${summary.revision?.catalog_linked_pct || 0}%`
          )}
          {makeMetric(
            "Выбор закупки",
            selection?.landed_total
              ? formatPriceWithCurrency(selection.landed_total, selection.calc_currency || latestCurrency)
              : "—",
            selection?.scenario_name || (selection?.id ? `selection #${selection.id}` : "нет утвержденного выбора")
          )}
          {makeMetric(
            "КП клиенту",
            latestQuote ? formatPriceWithCurrency(latestQuote.total_sell, latestQuote.currency || latestCurrency) : "—",
            latestQuote ? quoteStatusLabel(latestQuote.status) : "не создано"
          )}
          {makeMetric(
            "Исполнение",
            `${summary.purchase_orders?.count || 0} PO`,
            `приемок: ${summary.receipts?.posted_document_count || 0}, принято ${formatQty(summary.receipts?.posted_qty)}`
          )}
        </Row>

        <Space wrap size={[8, 8]} style={{ marginTop: 12 }}>
          <Tag>Клиент: {summary.request?.client_name || "—"}</Tag>
          <Tag>Ревизия заявки: {summary.revision?.rev_number || "—"}</Tag>
          <Tag>RFQ: {summary.rfq?.rfq_number || "—"}</Tag>
          <Tag>Ответов: {summary.rfq?.response_line_count || 0} строк</Tag>
          <Tag>Поставщиков в PO: {summary.purchase_orders?.count || 0}</Tag>
          {commercialDelta !== null ? (
            <Tag color={commercialDelta >= 0 ? "green" : "red"}>
              Прибыль: {formatPriceWithCurrency(commercialDelta, latestQuote?.currency || latestCurrency)}
            </Tag>
          ) : null}
        </Space>
      </Card>

      {summary.blockers?.length ? (
        <Alert
          showIcon
          type="warning"
          message="Что сейчас мешает следующему шагу"
          description={
            <Space direction="vertical" size={2}>
              {summary.blockers.map((item) => (
                <Typography.Text key={item}>{item}</Typography.Text>
              ))}
            </Space>
          }
        />
      ) : (
        <Alert showIcon type="success" message="Ключевые этапы по заявке закрыты или находятся в исполнении" />
      )}

      <Row gutter={[12, 12]} align="stretch">
        <Col xs={24} xl={8}>
          <Card size="small" title="Процесс">
            <Timeline
              items={(summary.workflow || []).map((step) => ({
                color: workflowColor[step.status] || "gray",
                children: (
                  <Space direction="vertical" size={0}>
                    <Space wrap size={[6, 4]}>
                      <Typography.Text strong>{step.label}</Typography.Text>
                      <Tag color={workflowTagColor[step.status] || "default"}>
                        {workflowLabel[step.status] || step.status}
                      </Tag>
                    </Space>
                    <Typography.Text type="secondary">{step.value || "—"}</Typography.Text>
                  </Space>
                ),
              }))}
            />
          </Card>
        </Col>
        <Col xs={24} xl={16}>
          <Card
            size="small"
            title="Закупочная экономика"
            extra={selection ? <Tag color={selection.status === "approved" ? "green" : "default"}>{statusText(selection.status)}</Tag> : null}
          >
            {selection ? (
              <Row gutter={[12, 12]}>
                {makeMetric(
                  "Товар",
                  formatPriceWithCurrency(selection.metrics?.goods_total || selection.goods_total, selection.calc_currency || latestCurrency),
                  `${selection.metrics?.line_count || 0} строк`
                )}
                {makeMetric(
                  "Логистика",
                  formatPriceWithCurrency(selection.metrics?.freight_total || selection.freight_total, selection.calc_currency || latestCurrency),
                  `${selection.metrics?.supplier_count || 0} поставщиков`
                )}
                {makeMetric(
                  "Пошлина",
                  formatPriceWithCurrency(selection.metrics?.duty_total || selection.duty_total, selection.calc_currency || latestCurrency),
                  selection.coverage_pct != null ? `покрытие ${numberOrZero(selection.coverage_pct).toFixed(0)}%` : null
                )}
                {makeMetric(
                  "Landed",
                  formatPriceWithCurrency(selection.metrics?.landed_total || selection.landed_total, selection.calc_currency || latestCurrency),
                  selection.eta_max_days ? `ETA до ${selection.eta_max_days} дней` : null
                )}
              </Row>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Выбор закупки пока не утвержден" />
            )}
          </Card>
        </Col>
      </Row>

      <Card
        size="small"
        title="КП и контракты"
        extra={
          <Space wrap>
            <Button size="small" onClick={() => onOpenTab?.("margin")}>
              Расчет
            </Button>
            <Button size="small" onClick={() => onOpenTab?.("quote")}>
              КП
            </Button>
            <Button size="small" onClick={() => onOpenTab?.("contract")}>
              Контракт
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={summary.sales_quotes?.rows || []}
            columns={quoteColumns}
            scroll={{ x: "max-content" }}
            locale={{ emptyText: "КП по заявке пока нет" }}
          />
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={summary.contracts?.rows || []}
            columns={contractColumns}
            scroll={{ x: "max-content" }}
            locale={{ emptyText: "Контрактов по заявке пока нет" }}
          />
        </Space>
      </Card>

      <Card
        size="small"
        title="Заказы поставщикам и приемки"
        extra={
          <Button size="small" onClick={() => onOpenTab?.("execution")}>
            Исполнение
          </Button>
        }
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Space wrap size={[8, 8]}>
            <Tag>PO: {summary.purchase_orders?.count || 0}</Tag>
            <Tag>Подтверждено: {summary.purchase_orders?.confirmed_count || 0}</Tag>
            <Tag>Строк PO: {summary.purchase_orders?.total_lines || 0}</Tag>
            <Tag>Документов приемки: {summary.receipts?.document_count || 0}</Tag>
            <Tag color={summary.receipts?.posted_document_count ? "green" : "default"}>
              Проведено приемок: {summary.receipts?.posted_document_count || 0}
            </Tag>
          </Space>
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={summary.purchase_orders?.rows || []}
            columns={poColumns}
            scroll={{ x: "max-content" }}
            locale={{ emptyText: "Заказов поставщикам по заявке пока нет" }}
          />
        </Space>
      </Card>
    </Space>
  )
}
