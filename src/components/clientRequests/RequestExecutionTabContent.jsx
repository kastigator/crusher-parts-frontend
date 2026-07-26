import React, { useEffect, useMemo, useState } from "react"
import { Alert, Button, Card, Col, Empty, Modal, Row, Skeleton, Space, Table, Tabs, Tag, Typography, message } from "antd"
import { FileSearchOutlined, PlusOutlined, ReloadOutlined, ShopOutlined } from "@ant-design/icons"
import { useNavigate } from "react-router-dom"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"
import { formatDate } from "@/components/clientRequests/salesQuoteDisplay"
import { resolveAppHref } from "@/utils/resolveAppHref"

const numberOrZero = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const formatQty = (value) => {
  const n = numberOrZero(value)
  return Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")
}

const poStatusLabel = (value) =>
  ({
    draft: "Черновик",
    sent: "Отправлен",
    confirmed: "Подтвержден",
    cancelled: "Отменен",
    partially_received: "Частичная приемка",
    received: "Принят",
    closed: "Закрыт",
  }[String(value || "").trim().toLowerCase()] || value || "—")

const poStatusColor = (value) =>
  ({
    draft: "default",
    sent: "gold",
    confirmed: "blue",
    partially_received: "cyan",
    received: "green",
    closed: "success",
    cancelled: "red",
  }[String(value || "").trim().toLowerCase()] || "default")

const receiptStatusMeta = {
  waiting: { label: "Ожидает", color: "default" },
  partial: { label: "Частично", color: "gold" },
  received: { label: "Принято", color: "green" },
  unknown: { label: "Проверить", color: "orange" },
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

const metric = (label, value, hint = null) => (
  <Col xs={24} sm={12} xl={6} key={label}>
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

export default function RequestExecutionTabContent({ requestId }) {
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [creatingOrders, setCreatingOrders] = useState(false)

  const loadSummary = async () => {
    if (!requestId) {
      setSummary(null)
      return
    }
    setLoading(true)
    try {
      const { data } = await axios.get(`/client-requests/${requestId}/execution-summary`)
      setSummary(data)
    } catch (e) {
      setSummary(null)
      message.error(e?.response?.data?.message || "Не удалось загрузить исполнение заявки")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  const handleCreatePurchaseOrders = async () => {
    if (!requestId) return
    setCreatingOrders(true)
    try {
      const { data: preview } = await axios.get(`/purchase-orders/from-client-request/${requestId}/preview`)
      const readyGroups = numberOrZero(preview?.totals?.ready_groups)
      if (!readyGroups) {
        message.warning(preview?.blockers?.[0] || "Новых PO для создания нет")
        setCreatingOrders(false)
        return
      }

      setCreatingOrders(false)
      Modal.confirm({
        title: "Создать заказы поставщикам из заявки?",
        okText: "Создать PO",
        cancelText: "Отмена",
        content: (
          <Space direction="vertical" size={6} style={{ width: "100%" }}>
            <Typography.Text>
              Будет создано PO: <Typography.Text strong>{readyGroups}</Typography.Text>
            </Typography.Text>
            <Typography.Text type="secondary">
              Уже есть: {numberOrZero(preview?.totals?.existing_groups)} · заблокировано: {numberOrZero(preview?.totals?.blocked_groups)} · строк: {numberOrZero(preview?.totals?.line_count)}
            </Typography.Text>
            <Typography.Text type="secondary">
              Основание: контракт {preview?.contract?.contract_number || `#${preview?.contract?.id}`}
            </Typography.Text>
          </Space>
        ),
        onOk: async () => {
          setCreatingOrders(true)
          try {
            const { data } = await axios.post(`/purchase-orders/from-client-request/${requestId}`)
            message.success(`Создано PO: ${numberOrZero(data?.created_count)}`)
            await loadSummary()
          } catch (e) {
            message.error(e?.response?.data?.message || "Не удалось создать PO")
            throw e
          } finally {
            setCreatingOrders(false)
          }
        },
      })
    } catch (e) {
      setCreatingOrders(false)
      message.error(e?.response?.data?.message || "Не удалось подготовить создание PO")
    }
  }

  const currency =
    summary?.contract?.active?.currency ||
    summary?.purchase_orders?.rows?.find((row) => row.currency)?.currency ||
    "USD"
  const totals = summary?.totals || {}
  const receiptPct = useMemo(() => {
    const ordered = numberOrZero(totals.ordered_qty)
    if (!ordered) return 0
    return Math.min(100, (numberOrZero(totals.posted_receipt_qty) / ordered) * 100)
  }, [totals.ordered_qty, totals.posted_receipt_qty])

  if (loading && !summary) {
    return <Skeleton active paragraph={{ rows: 8 }} />
  }

  if (!summary) {
    return <Empty description="Исполнение по заявке пока недоступно" />
  }

  const poColumns = [
    {
      title: "PO",
      width: 170,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{row.supplier_reference || `PO #${row.id}`}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {`#${row.id}`}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Поставщик",
      dataIndex: "supplier_name",
      width: 220,
      render: (value, row) => (
        <Space direction="vertical" size={0}>
          <span>{value || "—"}</span>
          {row.supplier_public_code ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {row.supplier_public_code}
            </Typography.Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: "Статус",
      width: 140,
      render: (_, row) => <Tag color={poStatusColor(row.status)}>{poStatusLabel(row.status)}</Tag>,
    },
    { title: "Строк", width: 90, render: (_, row) => numberOrZero(row.line_count) },
    { title: "Заказано", width: 110, render: (_, row) => formatQty(row.ordered_qty) },
    { title: "Принято", width: 110, render: (_, row) => formatQty(row.posted_receipt_qty) },
    { title: "Черновик приемки", width: 140, render: (_, row) => formatQty(row.draft_receipt_qty) },
    { title: "Сумма", width: 140, render: (_, row) => formatPriceWithCurrency(row.goods_total, row.currency || currency) },
    {
      title: "Документ",
      width: 150,
      render: (_, row) => (
        <Button
          size="small"
          icon={<FileSearchOutlined />}
          onClick={() => window.open(resolveAppHref(`/purchase-orders/${row.id}/preview`), "_blank", "noopener")}
        >
          Предпросмотр
        </Button>
      ),
    },
  ]

  const lineColumns = [
    {
      title: "Позиция",
      width: 280,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{row.client_display_part_number}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {row.client_display_description}
          </Typography.Text>
          {row.catalog_position_number ? (
            <Tag style={{ width: "fit-content", marginTop: 4 }}>{row.catalog_position_number}</Tag>
          ) : null}
        </Space>
      ),
    },
    {
      title: "Деталь поставщика",
      width: 260,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{row.supplier_display_part_number}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {row.supplier_name || "—"}
          </Typography.Text>
          {!row.supplier_part_id ? (
            <Tag color="orange" style={{ width: "fit-content", marginTop: 4 }}>
              Нет supplier_part
            </Tag>
          ) : null}
        </Space>
      ),
    },
    {
      title: "PO",
      width: 100,
      render: (_, row) => `#${row.supplier_purchase_order_id}`,
    },
    {
      title: "Приемка",
      width: 130,
      render: (_, row) => {
        const meta = receiptStatusMeta[row.receipt_status] || receiptStatusMeta.unknown
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    { title: "Заказано", width: 110, render: (_, row) => formatQty(row.ordered_qty) },
    { title: "Принято", width: 110, render: (_, row) => formatQty(row.posted_receipt_qty) },
    { title: "В черновике", width: 120, render: (_, row) => formatQty(row.draft_receipt_qty) },
    { title: "Осталось", width: 110, render: (_, row) => formatQty(row.remaining_receipt_qty) },
    { title: "Свободно на складе", width: 140, render: (_, row) => formatQty(row.stock_free_qty) },
    { title: "Цена", width: 130, render: (_, row) => formatPriceWithCurrency(row.price, row.currency || row.purchase_order_currency || currency) },
  ]

  const receiptDocumentColumns = [
    {
      title: "Документ",
      width: 180,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{row.document_no || `#${row.id}`}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {formatDate(row.document_date)}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Статус",
      width: 120,
      render: (_, row) => <Tag color={String(row.status).toLowerCase() === "posted" ? "green" : "gold"}>{row.status}</Tag>,
    },
    { title: "Склад", width: 180, render: (_, row) => [row.warehouse_name, row.warehouse_code].filter(Boolean).join(" · ") || "—" },
    { title: "Строк", width: 90, render: (_, row) => numberOrZero(row.line_count) },
    { title: "Кол-во", width: 100, render: (_, row) => formatQty(row.total_qty) },
    { title: "Детали", dataIndex: "supplier_part_numbers", render: (value) => value || "—" },
  ]

  const reservationColumns = [
    {
      title: "Деталь",
      width: 260,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{row.supplier_part_number || row.canonical_part_number || "—"}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {row.supplier_name || "—"}
          </Typography.Text>
        </Space>
      ),
    },
    { title: "Резерв", width: 100, render: (_, row) => formatQty(row.reserved_qty) },
    { title: "Склад", width: 180, render: (_, row) => [row.warehouse_name, row.storage_place_code].filter(Boolean).join(" / ") || "—" },
    { title: "Источник", width: 220, render: (_, row) => row.source_label || [row.source_type, row.source_id].filter(Boolean).join(" #") || "—" },
    { title: "Позиция", render: (_, row) => row.catalog_position_number || row.catalog_position_name || "—" },
  ]

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Card
        size="small"
        title="Исполнение заявки"
        extra={
          <Space wrap>
            <Button size="small" type="primary" icon={<PlusOutlined />} loading={creatingOrders} onClick={handleCreatePurchaseOrders}>
              Создать PO
            </Button>
            <Button size="small" icon={<ShopOutlined />} onClick={() => navigate("/purchase-orders")}>
              Заказы поставщикам
            </Button>
            <Button size="small" onClick={() => navigate("/warehouse")}>
              Склад
            </Button>
            <Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={loadSummary}>
              Обновить
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Row gutter={[12, 12]}>
            {metric(
              "Контракт",
              summary.contract?.active ? contractStatusLabel(summary.contract.active.status) : "—",
              summary.contract?.active?.contract_number || "нет подписанного контура",
            )}
            {metric(
              "PO",
              summary.purchase_orders?.count || 0,
              `строк: ${summary.lines?.length || 0}`,
            )}
            {metric(
              "Приемка",
              `${receiptPct.toFixed(0)}%`,
              `${formatQty(totals.posted_receipt_qty)} из ${formatQty(totals.ordered_qty)}`,
            )}
            {metric(
              "Резерв",
              formatQty(summary.reservations?.total_qty),
              `активных резервов: ${summary.reservations?.count || 0}`,
            )}
          </Row>

          <Space wrap size={[8, 8]}>
            <Tag>Заявка: {summary.request?.internal_number || `#${requestId}`}</Tag>
            <Tag>RFQ: {summary.request?.rfq_number || "—"}</Tag>
            <Tag>Заказано: {formatQty(totals.ordered_qty)}</Tag>
            <Tag>Осталось принять: {formatQty(totals.remaining_receipt_qty)}</Tag>
            <Tag>Свободно по supplier parts: {formatQty(summary.stock?.free_qty)}</Tag>
            <Tag>Сумма PO: {formatPriceWithCurrency(totals.goods_total, currency)}</Tag>
          </Space>
        </Space>
      </Card>

      {summary.alerts?.length ? (
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          {summary.alerts.map((alert) => (
            <Alert
              key={`${alert.type}-${alert.message}`}
              showIcon
              type={alert.type}
              message={alert.message}
              description={alert.description}
            />
          ))}
        </Space>
      ) : null}

      <Tabs
        size="small"
        items={[
          {
            key: "orders",
            label: `PO (${summary.purchase_orders?.count || 0})`,
            children: (
              <Table
                size="small"
                rowKey="id"
                dataSource={summary.purchase_orders?.rows || []}
                columns={poColumns}
                pagination={false}
                scroll={{ x: "max-content" }}
                locale={{ emptyText: "Заказов поставщикам по этой заявке пока нет" }}
              />
            ),
          },
          {
            key: "lines",
            label: `Строки (${summary.lines?.length || 0})`,
            children: (
              <Table
                size="small"
                rowKey="id"
                dataSource={summary.lines || []}
                columns={lineColumns}
                pagination={{ pageSize: 12, hideOnSinglePage: true }}
                scroll={{ x: "max-content" }}
                locale={{ emptyText: "Строк исполнения пока нет" }}
              />
            ),
          },
          {
            key: "receipts",
            label: `Приемки (${summary.receipts?.document_count || 0})`,
            children: (
              <Table
                size="small"
                rowKey="id"
                dataSource={summary.receipts?.documents || []}
                columns={receiptDocumentColumns}
                pagination={{ pageSize: 10, hideOnSinglePage: true }}
                scroll={{ x: "max-content" }}
                locale={{ emptyText: "Приемок по этой заявке пока нет" }}
              />
            ),
          },
          {
            key: "reservations",
            label: `Резервы (${summary.reservations?.count || 0})`,
            children: (
              <Table
                size="small"
                rowKey={(row) => `${row.supplier_part_id}-${row.warehouse_id}-${row.storage_place_id || 0}-${row.source_type}-${row.source_id}-${row.source_line_id}`}
                dataSource={summary.reservations?.rows || []}
                columns={reservationColumns}
                pagination={{ pageSize: 10, hideOnSinglePage: true }}
                scroll={{ x: "max-content" }}
                locale={{ emptyText: "Активных резервов по этой заявке пока нет" }}
              />
            ),
          },
        ]}
      />
    </Space>
  )
}
