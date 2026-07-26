import React, { useEffect, useMemo, useState } from "react"
import { Alert, Button, Card, Col, Empty, Row, Skeleton, Space, Steps, Tabs, Tag, Typography, message } from "antd"
import { FileDoneOutlined, FileTextOutlined, ReloadOutlined, SelectOutlined } from "@ant-design/icons"
import { useNavigate } from "react-router-dom"
import axios from "@/api/axiosInstance"
import RequestContractTabContent from "@/components/clientRequests/RequestContractTabContent"
import RequestMarginTabContent from "@/components/clientRequests/RequestMarginTabContent"
import RequestQuoteTabContent from "@/components/clientRequests/RequestQuoteTabContent"
import { formatPriceWithCurrency } from "@/utils/priceFormat"
import { quoteStatusLabel } from "@/components/clientRequests/salesQuoteDisplay"

const numberOrZero = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const stageIndex = {
  pricing: 0,
  quote: 1,
  contract: 2,
}

const normalizeStage = (value) => {
  const key = String(value || "").trim().toLowerCase()
  return Object.prototype.hasOwnProperty.call(stageIndex, key) ? key : "pricing"
}

const formatPct = (value) => `${numberOrZero(value).toFixed(1)}%`

const metric = (label, value, hint = null, color = null) => (
  <Col xs={24} md={8} key={label}>
    <div
      style={{
        border: "1px solid #f0f0f0",
        borderRadius: 8,
        padding: "12px 14px",
        minHeight: 86,
        background: "#fff",
      }}
    >
      <Typography.Text type="secondary">{label}</Typography.Text>
      <div style={{ fontSize: 21, fontWeight: 600, lineHeight: "30px", color: color || undefined }}>{value}</div>
      {hint ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {hint}
        </Typography.Text>
      ) : null}
    </div>
  </Col>
)

export default function RequestCommercialFlowTabContent({ requestId, activeRevisionId, initialStage }) {
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeStage, setActiveStage] = useState(normalizeStage(initialStage))

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
      message.error(e?.response?.data?.message || "Не удалось загрузить коммерческий контекст заявки")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setActiveStage(normalizeStage(initialStage))
  }, [initialStage])

  useEffect(() => {
    loadSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  const selection = summary?.selection || null
  const latestQuote = summary?.sales_quotes?.latest || null
  const activeContract = summary?.contracts?.active || summary?.contracts?.latest || null
  const currency = latestQuote?.currency || activeContract?.currency || selection?.calc_currency || "USD"
  const profit = latestQuote
    ? numberOrZero(latestQuote.total_sell) - numberOrZero(latestQuote.total_cost)
    : null
  const incompletePricing = numberOrZero(latestQuote?.incomplete_pricing_count)

  const nextAction = useMemo(() => {
    if (!selection) {
      return {
        type: "warning",
        message: "Коммерческий расчет еще не начался",
        description: "Сначала в закупке должен появиться утвержденный выбор по текущей ревизии заявки. После этого из выбора создается КП клиенту.",
      }
    }
    if (!latestQuote) {
      return {
        type: "info",
        message: "Закупочная база готова",
        description: "Создайте коммерческое предложение из утвержденного выбора, затем заполните продажные цены и маржу.",
      }
    }
    if (incompletePricing > 0) {
      return {
        type: "warning",
        message: "Нужно заполнить продажные цены",
        description: `В активных строках КП есть незаполненная продажа: ${incompletePricing}. Пока это не закрыто, КП нельзя нормально отправлять клиенту и фиксировать контракт.`,
      }
    }
    const quoteStatus = String(latestQuote.status || "").trim().toLowerCase()
    if (quoteStatus === "internal_review") {
      return {
        type: "info",
        message: "КП готово к отправке клиенту",
        description: "Проверьте итоговую сумму, маржу и условия. После этого переведите КП в статус отправки клиенту.",
      }
    }
    if (quoteStatus === "sent_to_client") {
      return {
        type: "info",
        message: "Ожидается решение клиента",
        description: "Когда клиент согласует предложение, переведите КП в статус согласования и создайте контракт.",
      }
    }
    if (quoteStatus === "client_approved" && !activeContract) {
      return {
        type: "success",
        message: "Можно создавать контракт",
        description: "КП согласовано клиентом. Контракт должен зафиксировать конкретную последнюю ревизию этого КП.",
      }
    }
    if (activeContract) {
      return {
        type: "success",
        message: "Коммерческий цикл зафиксирован контрактом",
        description: "Дальше процесс переходит в исполнение: заказы поставщикам, приемки, резервы и склад.",
      }
    }
    return {
      type: "info",
      message: "Коммерческий процесс в работе",
      description: "Продолжайте вести КП и контракт в этапах ниже.",
    }
  }, [activeContract, incompletePricing, latestQuote, selection])

  const steps = [
    {
      title: "Расчет",
      status: selection ? "finish" : "process",
      description: selection ? "Есть закупочная база" : "Нужен выбор закупки",
      icon: <SelectOutlined />,
    },
    {
      title: "КП",
      status: latestQuote ? (incompletePricing > 0 ? "process" : "finish") : "wait",
      description: latestQuote ? quoteStatusLabel(latestQuote.status) : "Еще не создано",
      icon: <FileTextOutlined />,
    },
    {
      title: "Контракт",
      status: activeContract ? "finish" : latestQuote ? "process" : "wait",
      description: activeContract ? activeContract.contract_number || `#${activeContract.id}` : "После согласования КП",
      icon: <FileDoneOutlined />,
    },
  ]

  if (loading && !summary) {
    return <Skeleton active paragraph={{ rows: 8 }} />
  }

  if (!summary) {
    return <Empty description="Коммерческий контекст заявки пока недоступен" />
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Card
        size="small"
        title="Расчет и коммерческое предложение"
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
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Steps
            size="small"
            current={stageIndex[activeStage]}
            onChange={(index) => setActiveStage(["pricing", "quote", "contract"][index] || "pricing")}
            items={steps}
          />

          <Row gutter={[12, 12]}>
            {metric(
              "Закупочная база",
              selection
                ? formatPriceWithCurrency(selection.landed_total, selection.calc_currency || currency)
                : "—",
              selection?.scenario_name || "утвержденный выбор закупки",
            )}
            {metric(
              "Продажа клиенту",
              latestQuote ? formatPriceWithCurrency(latestQuote.total_sell, latestQuote.currency || currency) : "—",
              latestQuote ? `${quoteStatusLabel(latestQuote.status)} · маржа ${formatPct(latestQuote.margin_pct_avg)}` : "КП еще не создано",
            )}
            {metric(
              "Прибыль",
              profit !== null ? formatPriceWithCurrency(profit, latestQuote?.currency || currency) : "—",
              activeContract ? `контракт ${activeContract.contract_number || `#${activeContract.id}`}` : "до фиксации контрактом",
              profit !== null && profit < 0 ? "#cf1322" : null,
            )}
          </Row>

          <Alert showIcon type={nextAction.type} message={nextAction.message} description={nextAction.description} />

          <Space wrap size={[8, 8]}>
            <Tag>Заявка: {summary.request?.internal_number || `#${requestId}`}</Tag>
            <Tag>Ревизия: {summary.revision?.rev_number || "—"}</Tag>
            <Tag>RFQ: {summary.rfq?.rfq_number || "—"}</Tag>
            <Tag>КП: {summary.sales_quotes?.count || 0}</Tag>
            <Tag>Контракты: {summary.contracts?.count || 0}</Tag>
            {incompletePricing > 0 ? <Tag color="orange">Незаполнено цен: {incompletePricing}</Tag> : null}
          </Space>
        </Space>
      </Card>

      <Tabs
        size="small"
        activeKey={activeStage}
        onChange={setActiveStage}
        items={[
          {
            key: "pricing",
            label: "Расчет",
            children: <RequestMarginTabContent requestId={requestId} />,
          },
          {
            key: "quote",
            label: "КП",
            children: (
              <RequestQuoteTabContent
                requestId={requestId}
                activeRevisionId={activeRevisionId}
              />
            ),
          },
          {
            key: "contract",
            label: "Контракт",
            children: (
              <RequestContractTabContent
                requestId={requestId}
                activeRevisionId={activeRevisionId}
              />
            ),
          },
        ]}
      />
    </Space>
  )
}
