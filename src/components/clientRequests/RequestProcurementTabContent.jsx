import React, { useEffect, useMemo, useState } from "react"
import { Alert, Button, Card, Col, Empty, Row, Skeleton, Space, Table, Tag, Typography, message } from "antd"
import { ReloadOutlined, SelectOutlined } from "@ant-design/icons"
import { useNavigate } from "react-router-dom"
import axios from "@/api/axiosInstance"

const numberOrZero = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const formatQty = (value) => {
  const n = numberOrZero(value)
  return Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")
}

const formatMoney = (value, currency) => {
  if (value === null || value === undefined || value === "") return "—"
  const n = Number(value)
  if (!Number.isFinite(n)) return "—"
  return `${n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency || ""}`.trim()
}

const statusMeta = {
  not_in_rfq: { label: "Нет в RFQ", color: "default" },
  waiting_response: { label: "Ждем ответ", color: "default" },
  has_response: { label: "Есть ответ", color: "orange" },
  has_supplier_part: { label: "Есть деталь поставщика", color: "blue" },
  selected: { label: "Выбрано", color: "green" },
  ordered: { label: "В PO", color: "geekblue" },
  received: { label: "Принято", color: "green" },
}

const gapMeta = {
  no_catalog_position: { label: "нет карточки позиции", color: "orange" },
  not_in_rfq: { label: "нет RFQ-строки", color: "default" },
  no_response: { label: "нет ответа", color: "default" },
  no_supplier_part: { label: "нет детали поставщика", color: "red" },
  not_selected: { label: "не выбрано", color: "default" },
  no_po: { label: "нет PO", color: "orange" },
}

const metric = (label, value, hint = null) => (
  <Col xs={24} md={12} xl={6} key={label}>
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

export default function RequestProcurementTabContent({ requestId }) {
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
      const { data } = await axios.get(`/client-requests/${requestId}/procurement-summary`)
      setSummary(data)
    } catch (e) {
      setSummary(null)
      message.error(e?.response?.data?.message || "Не удалось загрузить закупочный контекст заявки")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  const rows = summary?.rows || []
  const metrics = summary?.metrics || {}
  const gapEntries = useMemo(
    () =>
      Object.entries(summary?.gaps || {})
        .filter(([, count]) => numberOrZero(count) > 0)
        .map(([key, count]) => ({ key, count, ...(gapMeta[key] || { label: key, color: "default" }) })),
    [summary?.gaps],
  )

  if (loading && !summary) {
    return <Skeleton active paragraph={{ rows: 8 }} />
  }

  if (!summary) {
    return <Empty description="Закупочный контекст заявки пока недоступен" />
  }

  const columns = [
    {
      title: "Строка заявки",
      width: 220,
      fixed: "left",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Space size={6} wrap>
            <Typography.Text strong>#{row.line_number}</Typography.Text>
            <Typography.Text>{row.client_part_number || "—"}</Typography.Text>
          </Space>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {row.client_description || row.client_line_text || "—"}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {formatQty(row.requested_qty)} {row.uom || "шт"}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Карточка позиции",
      width: 260,
      render: (_, row) =>
        row.catalog_position_id ? (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>
              {row.catalog_position_part_number || row.catalog_position_code || `#${row.catalog_position_id}`}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {row.catalog_position_name || "—"}
            </Typography.Text>
            {numberOrZero(row.known_supplier_part_count) ? (
              <Tag style={{ width: "fit-content" }}>в справочнике: {numberOrZero(row.known_supplier_part_count)}</Tag>
            ) : null}
          </Space>
        ) : (
          <Tag color="orange">не привязана</Tag>
        ),
    },
    {
      title: "Ответы RFQ",
      width: 250,
      render: (_, row) =>
        numberOrZero(row.response_line_count) ? (
          <Space direction="vertical" size={4}>
            <Space size={6} wrap>
              <Tag color="blue">{numberOrZero(row.response_line_count)} строк</Tag>
              <Tag>{numberOrZero(row.response_supplier_count)} пост.</Tag>
            </Space>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {row.response_supplier_names || "—"}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              мин. цена: {formatMoney(row.min_price, row.currencies)}
            </Typography.Text>
          </Space>
        ) : (
          <Tag>нет ответа</Tag>
        ),
    },
    {
      title: "Деталь поставщика",
      width: 280,
      render: (_, row) =>
        numberOrZero(row.supplier_part_count) ? (
          <Space direction="vertical" size={4}>
            <Tag color="green">{numberOrZero(row.supplier_part_count)} привязано</Tag>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {row.supplier_part_labels || "—"}
            </Typography.Text>
          </Space>
        ) : numberOrZero(row.response_line_count) ? (
          <Tag color="red">нужно завести/привязать</Tag>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: "Выбор, PO, склад",
      width: 260,
      render: (_, row) => {
        const status = statusMeta[row.procurement_status] || statusMeta.not_in_rfq
        return (
          <Space direction="vertical" size={4}>
            <Tag color={status.color}>{status.label}</Tag>
            {numberOrZero(row.selected_line_count) ? (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                выбор: {formatQty(row.selected_qty)} · {row.selected_supplier_names || "—"}
              </Typography.Text>
            ) : null}
            {numberOrZero(row.po_line_count) ? (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                PO: {numberOrZero(row.po_line_count)} строк · {formatQty(row.po_qty)}
              </Typography.Text>
            ) : null}
            {numberOrZero(row.available_stock_qty) ? (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                свободно на складе: {formatQty(row.available_stock_qty)}
              </Typography.Text>
            ) : null}
          </Space>
        )
      },
    },
    {
      title: "Разрывы",
      width: 240,
      render: (_, row) =>
        row.gap_flags?.length ? (
          <Space wrap size={[4, 4]}>
            {row.gap_flags.map((flag) => {
              const gap = gapMeta[flag] || { label: flag, color: "default" }
              return (
                <Tag key={flag} color={gap.color}>
                  {gap.label}
                </Tag>
              )
            })}
          </Space>
        ) : (
          <Tag color="green">цепочка есть</Tag>
        ),
    },
  ]

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Card
        size="small"
        title="Цепочка закупки по строкам заявки"
        extra={
          <Space wrap>
            <Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={loadSummary}>
              Обновить
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Row gutter={[12, 12]}>
            {metric(
              "Строки заявки",
              numberOrZero(metrics.item_count),
              `в RFQ: ${numberOrZero(metrics.rfq_item_count)}`,
            )}
            {metric(
              "Ответы",
              `${numberOrZero(metrics.lines_with_responses)} / ${numberOrZero(metrics.item_count)}`,
              `ответивших поставщиков: ${numberOrZero(metrics.response_supplier_count)}`,
            )}
            {metric(
              "Детали поставщика",
              `${numberOrZero(metrics.lines_with_supplier_parts)} / ${numberOrZero(metrics.item_count)}`,
              `supplier parts в ответах: ${numberOrZero(metrics.supplier_part_count)}`,
            )}
            {metric(
              "Исполнение",
              `${numberOrZero(metrics.lines_with_po)} PO`,
              `выбрано строк: ${numberOrZero(metrics.selected_lines)}, склад: ${formatQty(metrics.available_stock_qty)}`,
            )}
          </Row>

          <Space wrap size={[8, 8]}>
            <Tag>RFQ: {summary.rfq?.rfq_number || "—"}</Tag>
            <Tag>Статус RFQ: {summary.rfq?.status || "—"}</Tag>
            <Tag color={summary.rfq?.sync_status === "needs_sync" ? "orange" : "green"}>
              {summary.rfq?.sync_status === "needs_sync" ? "нужна синхронизация" : "синхронизирован"}
            </Tag>
            <Tag>Ответов: {numberOrZero(metrics.response_count)}</Tag>
            <Tag>Приглашено: {numberOrZero(metrics.invited_supplier_count)}</Tag>
            <Tag>Выбор: {summary.selection?.id ? `#${summary.selection.id}` : "—"}</Tag>
          </Space>
        </Space>
      </Card>

      {gapEntries.length ? (
        <Alert
          showIcon
          type="warning"
          message="Где цепочка ещё не доведена до исполнения"
          description={
            <Space wrap size={[6, 6]}>
              {gapEntries.map((gap) => (
                <Tag key={gap.key} color={gap.color}>
                  {gap.label}: {gap.count}
                </Tag>
              ))}
            </Space>
          }
        />
      ) : (
        <Alert showIcon type="success" message="По строкам заявки нет видимых разрывов закупочной цепочки" />
      )}

      <Table
        size="small"
        rowKey="request_item_id"
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: "max-content" }}
        locale={{ emptyText: "Строк заявки пока нет" }}
      />
    </Space>
  )
}
