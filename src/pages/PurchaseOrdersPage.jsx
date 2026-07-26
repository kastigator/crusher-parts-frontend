import React, { useEffect, useMemo, useState } from "react"
import {
  Alert,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Form,
  InputNumber,
  Modal,
  Row,
  Col,
  Select,
  Space,
  Table,
  Tabs,
  Typography,
  message,
  Tag,
} from "antd"
import { InboxOutlined } from "@ant-design/icons"
import dayjs from "dayjs"
import { useNavigate } from "react-router-dom"
import PageWrapper from "@/components/common/PageWrapper"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"
import { formatIncotermsWithPlace } from "@/components/rfqWorkspace/rfqWorkspaceUtils"
import SupplierQualityEventModal from "@/components/suppliers/SupplierQualityEventModal"
import { resolveAppHref } from "@/utils/resolveAppHref"

const toNumber = (value) => {
  const n = Number(value || 0)
  return Number.isFinite(n) ? n : 0
}

const formatQty = (value) => {
  const n = toNumber(value)
  return n.toLocaleString("ru-RU", {
    minimumFractionDigits: n % 1 === 0 ? 0 : 3,
    maximumFractionDigits: 3,
  })
}

const formatDateTime = (value) => {
  if (!value) return "—"
  const date = dayjs(value)
  return date.isValid() ? date.format("DD.MM.YYYY HH:mm") : "—"
}

const lineTitle = (line) =>
  line?.supplier_display_part_number ||
  line?.supplier_part_number ||
  line?.canonical_part_number ||
  line?.manufacturer_part_number ||
  line?.original_cat_number ||
  `Строка #${line?.id || ""}`

const lineDescription = (line) =>
  line?.supplier_display_description ||
  line?.supplier_part_description ||
  line?.catalog_position_name ||
  line?.client_description ||
  line?.note ||
  "Без описания"

export default function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [qualityModalOpen, setQualityModalOpen] = useState(false)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [receiptSubmitting, setReceiptSubmitting] = useState(false)
  const [activeOrder, setActiveOrder] = useState(null)
  const [lines, setLines] = useState([])
  const [receipts, setReceipts] = useState([])
  const [receiptLines, setReceiptLines] = useState([])
  const [qualityEvents, setQualityEvents] = useState([])
  const [drawerTabKey, setDrawerTabKey] = useState("summary")
  const [locations, setLocations] = useState([])
  const [storagePlaces, setStoragePlaces] = useState([])
  const [receiptRows, setReceiptRows] = useState([])
  const [receiptForm] = Form.useForm()
  const receiptWarehouseId = Form.useWatch("warehouse_id", receiptForm)
  const { Text } = Typography

  const qualitySummary = useMemo(
    () => {
      const openEvents = qualityEvents.filter((event) => String(event.status || "open") === "open").length
      return {
        total: openEvents || Number(activeOrder?.open_quality_events || 0),
        all: qualityEvents.length,
      }
    },
    [activeOrder, qualityEvents]
  )

  const orderStats = useMemo(
    () =>
      lines.reduce(
        (acc, line) => {
          acc.lines += 1
          acc.ordered += toNumber(line.qty)
          acc.received += toNumber(line.received_qty)
          acc.pending += toNumber(line.pending_receipt_qty)
          acc.remaining += toNumber(line.remaining_receipt_qty)
          if (line.supplier_part_id) acc.supplierLinked += 1
          return acc
        },
        { lines: 0, ordered: 0, received: 0, pending: 0, remaining: 0, supplierLinked: 0 }
      ),
    [lines]
  )

  const receiptStats = useMemo(
    () =>
      receipts.reduce(
        (acc, receipt) => {
          acc.documents += 1
          acc.qty += toNumber(receipt.total_qty)
          if (String(receipt.status || "") === "posted") acc.posted += 1
          if (String(receipt.status || "") === "draft") acc.draft += 1
          return acc
        },
        { documents: 0, posted: 0, draft: 0, qty: 0 }
      ),
    [receipts]
  )

  const receiptCandidates = useMemo(
    () =>
      lines
        .map((line) => ({
          ...line,
          qty_num: toNumber(line.qty),
          received_num: toNumber(line.received_qty),
          pending_num: toNumber(line.pending_receipt_qty),
          remaining_num: toNumber(line.remaining_receipt_qty),
        }))
        .filter((line) => line.supplier_part_id && line.remaining_num > 0),
    [lines]
  )

  const receiptAvailable = Boolean(activeOrder?.id) && ["sent", "confirmed"].includes(String(activeOrder?.status || "")) && receiptCandidates.length > 0

  const locationOptions = useMemo(
    () =>
      locations.map((location) => ({
        value: location.id,
        label: [location.name, location.code].filter(Boolean).join(" · ") || `Склад #${location.id}`,
      })),
    [locations]
  )

  const placeOptions = useMemo(
    () =>
      storagePlaces
        .filter((place) => !receiptWarehouseId || Number(place.warehouse_id) === Number(receiptWarehouseId))
        .map((place) => ({
          value: place.id,
          label: [place.code, place.zone, place.rack, place.section, place.bin].filter(Boolean).join(" / ") || `Адрес #${place.id}`,
        })),
    [receiptWarehouseId, storagePlaces]
  )

  const loadOrders = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/purchase-orders")
      setOrders(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить заказы")
    } finally {
      setLoading(false)
    }
  }

  const loadLines = async (orderId) => {
    try {
      const { data } = await axios.get(`/purchase-orders/${orderId}/lines`)
      setLines(Array.isArray(data) ? data : [])
      return Array.isArray(data) ? data : []
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить строки")
      return []
    }
  }

  const loadReceipts = async (orderId) => {
    try {
      const { data } = await axios.get(`/purchase-orders/${orderId}/receipts`)
      setReceipts(Array.isArray(data?.documents) ? data.documents : [])
      setReceiptLines(Array.isArray(data?.lines) ? data.lines : [])
      return data || { documents: [], lines: [] }
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить приемки по PO")
      setReceipts([])
      setReceiptLines([])
      return { documents: [], lines: [] }
    }
  }

  const loadQualityEvents = async (order) => {
    if (!order?.supplier_id || !order?.id) {
      setQualityEvents([])
      return []
    }
    try {
      const { data } = await axios.get(`/suppliers/${order.supplier_id}/quality-events`, {
        params: { limit: 200 },
      })
      const rows = Array.isArray(data) ? data.filter((event) => Number(event.po_id || event.supplier_purchase_order_id) === Number(order.id)) : []
      setQualityEvents(rows)
      return rows
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить события качества")
      setQualityEvents([])
      return []
    }
  }

  const loadWarehouseRefs = async () => {
    const [{ data: locationRows }, { data: placeRows }] = await Promise.all([
      axios.get("/warehouse/locations"),
      axios.get("/warehouse/storage-places"),
    ])
    const nextLocations = Array.isArray(locationRows) ? locationRows : []
    const nextPlaces = Array.isArray(placeRows) ? placeRows : []
    setLocations(nextLocations)
    setStoragePlaces(nextPlaces)
    return { locations: nextLocations, storagePlaces: nextPlaces }
  }

  const openOrderWorkspace = async (record) => {
    setActiveOrder(record)
    setDrawerOpen(true)
    setDrawerTabKey("summary")
    setLines([])
    setReceipts([])
    setReceiptLines([])
    setQualityEvents([])
    await Promise.all([loadLines(record.id), loadReceipts(record.id), loadQualityEvents(record)])
  }

  useEffect(() => {
    loadOrders()
  }, [])

  useEffect(() => {
    if (!receiptWarehouseId) return
    const currentPlaceId = receiptForm.getFieldValue("storage_place_id")
    if (!currentPlaceId) return
    const placeBelongsToWarehouse = storagePlaces.some(
      (place) => Number(place.id) === Number(currentPlaceId) && Number(place.warehouse_id) === Number(receiptWarehouseId)
    )
    if (!placeBelongsToWarehouse) receiptForm.setFieldValue("storage_place_id", null)
  }, [receiptForm, receiptWarehouseId, storagePlaces])

  const handleGenerate = async (order) => {
    try {
      const { data } = await axios.post(`/purchase-orders/${order.id}/generate`)
      await loadOrders()
      if (data?.url) window.open(data.url, "_blank", "noopener")
      message.success("DOCX заказа поставщику сформирован")
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось сформировать DOCX")
    }
  }

  const updateReceiptRow = (lineId, patch) => {
    setReceiptRows((prev) => prev.map((row) => (Number(row.id) === Number(lineId) ? { ...row, ...patch } : row)))
  }

  const openReceiptModal = async () => {
    if (!activeOrder?.id) return
    if (!["sent", "confirmed"].includes(String(activeOrder.status || ""))) {
      message.warning("Приход можно оформлять только по отправленному или подтвержденному PO")
      return
    }
    try {
      const [freshLines, refs] = await Promise.all([loadLines(activeOrder.id), loadWarehouseRefs()])
      const candidates = freshLines
        .map((line) => ({
          ...line,
          remaining_num: toNumber(line.remaining_receipt_qty),
        }))
        .filter((line) => line.supplier_part_id && line.remaining_num > 0)

      if (!candidates.length) {
        message.info("По этому PO нет строк, доступных к приходу")
        return
      }

      const defaultWarehouseId = refs.locations[0]?.id || null
      const defaultPlaceId = defaultWarehouseId
        ? refs.storagePlaces.find((place) => Number(place.warehouse_id) === Number(defaultWarehouseId))?.id || null
        : null

      setReceiptRows(
        candidates.map((line) => ({
          ...line,
          selected: true,
          receipt_quantity: line.remaining_num,
        }))
      )
      receiptForm.setFieldsValue({
        document_date: dayjs(),
        warehouse_id: defaultWarehouseId,
        storage_place_id: defaultPlaceId,
      })
      setReceiptModalOpen(true)
    } catch (e) {
      console.error(e)
      message.error("Не удалось подготовить приход")
    }
  }

  const handleCreateReceipt = async () => {
    if (!activeOrder?.id) return
    try {
      const values = await receiptForm.validateFields()
      const selectedRows = receiptRows.filter((row) => row.selected && toNumber(row.receipt_quantity) > 0)
      if (!selectedRows.length) {
        message.warning("Выберите хотя бы одну строку для прихода")
        return
      }

      const sourceLabel = `PO ${activeOrder.supplier_reference || `#${activeOrder.id}`} · ${activeOrder.supplier_name || "поставщик"}`
      setReceiptSubmitting(true)
      await axios.post("/warehouse/documents", {
        doc_type: "receipt",
        document_date: values.document_date?.toISOString?.() || new Date().toISOString(),
        warehouse_id: values.warehouse_id,
        basis_document: activeOrder.supplier_reference || `PO #${activeOrder.id}`,
        source_type: "purchase_order",
        source_id: String(activeOrder.id),
        source_label: sourceLabel,
        notes: "Приход создан из заказа поставщику",
        post: true,
        lines: selectedRows.map((row) => ({
          supplier_part_id: row.supplier_part_id,
          catalog_position_id: row.catalog_position_id || null,
          quantity: toNumber(row.receipt_quantity),
          storage_place_id: values.storage_place_id || null,
          unit_code: row.supplier_part_uom || row.unit_code || "шт",
          source_type: "purchase_order",
          source_id: String(activeOrder.id),
          source_line_id: String(row.id),
          source_label: sourceLabel,
          notes: lineTitle(row),
        })),
      })
      message.success("Приход создан и проведен")
      setReceiptModalOpen(false)
      setReceiptRows([])
      await Promise.all([loadLines(activeOrder.id), loadReceipts(activeOrder.id), loadOrders()])
    } catch (e) {
      if (e?.errorFields) return
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось создать приход")
    } finally {
      setReceiptSubmitting(false)
    }
  }

  const lineColumns = [
    {
      title: "Строка заказа",
      width: 320,
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <span>{lineTitle(row)}</span>
          <span style={{ color: "#8c8c8c" }}>{lineDescription(row)}</span>
          {row.supplier_name_snapshot || row.catalog_position_name ? (
            <span style={{ color: "#8c8c8c" }}>
              {[row.supplier_name_snapshot, row.catalog_position_name].filter(Boolean).join(" · ")}
            </span>
          ) : null}
        </Space>
      ),
    },
    {
      title: "Кол-во",
      dataIndex: "qty",
      width: 90,
      render: (value) => formatQty(value),
    },
    {
      title: "Склад",
      width: 170,
      render: (_, row) => {
        const received = toNumber(row.received_qty)
        const pending = toNumber(row.pending_receipt_qty)
        const remaining = toNumber(row.remaining_receipt_qty)
        return (
          <Space direction="vertical" size={2}>
            <span>Принято: {formatQty(received)}</span>
            {pending > 0 ? <span style={{ color: "#8c8c8c" }}>Черновик: {formatQty(pending)}</span> : null}
            <Tag color={remaining > 0 ? "blue" : "green"}>
              Осталось: {formatQty(remaining)}
            </Tag>
          </Space>
        )
      },
    },
    {
      title: "Цена",
      dataIndex: "price",
      width: 140,
      render: (v, r) => formatPriceWithCurrency(v, r?.currency),
    },
    { title: "Валюта", dataIndex: "currency", width: 90 },
    { title: "Срок, дней", dataIndex: "lead_time_days", width: 110 },
    {
      title: "Качество",
      width: 150,
      render: () => (
        <Button
          size="small"
          onClick={() => {
            setQualityModalOpen(true)
          }}
        >
          Событие качества
        </Button>
      ),
    },
  ]

  const receiptColumns = [
    {
      title: "Документ",
      width: 210,
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Text strong>{row.document_no || `Приход #${row.id}`}</Text>
          <Text type="secondary">{formatDateTime(row.document_date)}</Text>
        </Space>
      ),
    },
    {
      title: "Статус",
      dataIndex: "status",
      width: 110,
      render: (value) => <Tag color={value === "posted" ? "green" : "default"}>{value || "—"}</Tag>,
    },
    {
      title: "Склад",
      width: 220,
      render: (_, row) => [row.warehouse_name, row.warehouse_code].filter(Boolean).join(" · ") || "—",
    },
    {
      title: "Строки",
      width: 100,
      render: (_, row) => formatQty(row.line_count),
    },
    {
      title: "Кол-во",
      width: 110,
      render: (_, row) => formatQty(row.total_qty),
    },
    {
      title: "Детали",
      dataIndex: "supplier_part_numbers",
      ellipsis: true,
    },
  ]

  const receiptLineColumns = [
    {
      title: "Приход",
      width: 190,
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Text>{row.document_no || `#${row.document_id}`}</Text>
          <Text type="secondary">{formatDateTime(row.document_date)}</Text>
        </Space>
      ),
    },
    {
      title: "Деталь поставщика",
      width: 320,
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Text strong>{lineTitle(row)}</Text>
          <Text type="secondary">{lineDescription(row)}</Text>
          <Text type="secondary">{row.catalog_position_name || row.catalog_position_number || "—"}</Text>
        </Space>
      ),
    },
    {
      title: "Кол-во",
      width: 100,
      render: (_, row) => formatQty(row.quantity),
    },
    {
      title: "Адрес",
      width: 180,
      render: (_, row) => [row.warehouse_name, row.storage_place_code].filter(Boolean).join(" / ") || "—",
    },
    {
      title: "Строка PO",
      width: 110,
      render: (_, row) => row.source_line_id || "—",
    },
  ]

  const qualityColumns = [
    {
      title: "Событие",
      width: 180,
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Text>{row.event_type || "—"}</Text>
          <Text type="secondary">{formatDateTime(row.occurred_at || row.created_at)}</Text>
        </Space>
      ),
    },
    {
      title: "Статус",
      width: 110,
      render: (_, row) => <Tag color={row.status === "open" ? "orange" : "green"}>{row.status || "—"}</Tag>,
    },
    {
      title: "Серьёзность",
      dataIndex: "severity",
      width: 110,
    },
    {
      title: "Строка PO",
      dataIndex: "supplier_purchase_order_line_id",
      width: 110,
      render: (value) => value || "—",
    },
    {
      title: "Комментарий",
      dataIndex: "note",
      ellipsis: true,
      render: (value) => value || "—",
    },
  ]

  const drawerItems = [
    {
      key: "summary",
      label: "Сводка",
      children: (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Descriptions
            size="small"
            bordered
            column={1}
            items={[
              { key: "supplier", label: "Поставщик", children: activeOrder?.supplier_name || "—" },
              { key: "reference", label: "Референс", children: activeOrder?.supplier_reference || "—" },
              { key: "status", label: "Статус", children: activeOrder?.status || "—" },
              { key: "shipment", label: "Поставка", children: activeOrder?.shipment_group_name || "—" },
              {
                key: "incoterms",
                label: "Incoterms",
                children: formatIncotermsWithPlace(activeOrder?.incoterms, activeOrder?.incoterms_place) || "—",
              },
              { key: "currency", label: "Валюта", children: activeOrder?.currency || "—" },
            ]}
          />
          <Row gutter={[12, 12]}>
            <Col xs={12} md={6}>
              <Card size="small">
                <Text type="secondary">Строк</Text>
                <div style={{ fontSize: 24 }}>{orderStats.lines}</div>
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Text type="secondary">Заказано</Text>
                <div style={{ fontSize: 24 }}>{formatQty(orderStats.ordered)}</div>
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Text type="secondary">Принято</Text>
                <div style={{ fontSize: 24 }}>{formatQty(orderStats.received)}</div>
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Text type="secondary">Осталось</Text>
                <div style={{ fontSize: 24 }}>{formatQty(orderStats.remaining)}</div>
              </Card>
            </Col>
          </Row>
          <Space wrap>
            <Button type="primary" onClick={() => navigate("/rfq-workspace")}>
              Открыть RFQ Workspace
            </Button>
            <Button icon={<InboxOutlined />} onClick={openReceiptModal} disabled={!receiptAvailable}>
              Принять на склад
            </Button>
            <Button
              onClick={() => window.open(resolveAppHref(`/purchase-orders/${activeOrder?.id}/preview`), "_blank", "noopener")}
              disabled={!activeOrder?.id}
            >
              Открыть документ
            </Button>
          </Space>
          {orderStats.lines > 0 && orderStats.supplierLinked < orderStats.lines ? (
            <Alert
              type="warning"
              showIcon
              message={`У ${orderStats.lines - orderStats.supplierLinked} строк нет детали поставщика`}
              description="Такие строки нельзя принять на склад, пока они не связаны с supplier part."
            />
          ) : null}
        </Space>
      ),
    },
    {
      key: "lines",
      label: `Состав (${orderStats.lines})`,
      children: <Table rowKey="id" size="small" dataSource={lines} pagination={false} scroll={{ x: 980 }} columns={lineColumns} />,
    },
    {
      key: "receipts",
      label: `Приемки (${receiptStats.documents})`,
      children: (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Space wrap size={[16, 8]}>
            <Text type="secondary">Проведено: {receiptStats.posted}</Text>
            <Text type="secondary">Черновики: {receiptStats.draft}</Text>
            <Text type="secondary">Количество: {formatQty(receiptStats.qty)}</Text>
            <Button size="small" onClick={() => activeOrder?.id && loadReceipts(activeOrder.id)}>
              Обновить
            </Button>
            <Button size="small" onClick={() => navigate("/warehouse")}>
              Открыть склад
            </Button>
          </Space>
          {receipts.length ? (
            <>
              <Table rowKey="id" size="small" dataSource={receipts} pagination={false} scroll={{ x: 860 }} columns={receiptColumns} />
              <Table
                rowKey="id"
                size="small"
                dataSource={receiptLines}
                pagination={false}
                scroll={{ x: 900 }}
                columns={receiptLineColumns}
              />
            </>
          ) : (
            <Empty description="Приемок по этому PO пока нет" />
          )}
        </Space>
      ),
    },
    {
      key: "document",
      label: "Документ",
      children: (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Alert
            type="info"
            showIcon
            message="Документ заказа поставщику"
            description="DOCX пересобирается из текущего состава PO и сохраненных supplier-facing snapshots."
          />
          <Space wrap>
            <Button
              type="primary"
              onClick={() => window.open(resolveAppHref(`/purchase-orders/${activeOrder?.id}/preview`), "_blank", "noopener")}
              disabled={!activeOrder?.id}
            >
              Открыть предпросмотр
            </Button>
            {activeOrder?.file_url ? (
              <Button onClick={() => window.open(activeOrder.file_url, "_blank", "noopener")}>
                Скачать DOCX
              </Button>
            ) : null}
            <Button onClick={() => activeOrder && handleGenerate(activeOrder)} disabled={!activeOrder?.id}>
              Пересобрать DOCX
            </Button>
          </Space>
        </Space>
      ),
    },
    {
      key: "quality",
      label: `Качество (${qualitySummary.total})`,
      children: (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Space wrap>
            <Text type="secondary">
              Открыто: {qualitySummary.total}; всего по PO: {qualitySummary.all}
            </Text>
            <Button onClick={() => setQualityModalOpen(true)} disabled={!activeOrder?.id}>
              Добавить событие
            </Button>
          </Space>
          {qualityEvents.length ? (
            <Table rowKey="id" size="small" dataSource={qualityEvents} pagination={false} scroll={{ x: 780 }} columns={qualityColumns} />
          ) : (
            <Empty description="Событий качества по этому PO пока нет" />
          )}
        </Space>
      ),
    },
  ]

  return (
    <PageWrapper
      title="Заказы поставщикам"
      subtitle="Обзор существующих заказов поставщикам, документов и событий качества."
      helpSummary="Основной сценарий создания новых заказов вынесен в RFQ Workspace. Здесь остаются обзор, DOCX и события качества."
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Alert
          type="warning"
          showIcon
          message="Создание и изменение заказов поставщикам перенесено в RFQ Workspace"
          description="Эта страница нужна для обзора, контроля документа, просмотра строк и регистрации событий качества."
        />
        <Card title="Где работать с заказами" size="small">
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            <Text type="secondary">
              Создание заказа, выбор поставщика, группы поставки и состава строк выполняются внутри RFQ Workspace после утвержденного выбора и контракта.
            </Text>
            <Space wrap>
              <Button type="primary" onClick={() => navigate("/rfq-workspace")}>
                Открыть RFQ Workspace
              </Button>
            </Space>
          </Space>
        </Card>

        <Card title="Список заказов" size="small">
          <Table
            rowKey="id"
            dataSource={orders}
            loading={loading}
            pagination={{ pageSize: 20 }}
            onRow={(record) => ({
              onClick: () => openOrderWorkspace(record),
            })}
            columns={[
              {
                title: "Заказ",
                width: 280,
                render: (_, row) => (
                  <Space direction="vertical" size={2}>
                    <span>{row.supplier_name || "Поставщик не указан"}</span>
                    <span style={{ color: "#8c8c8c" }}>
                      {row.supplier_reference || row.shipment_group_name || "Без референса"}
                    </span>
                  </Space>
                ),
              },
              { title: "Статус", dataIndex: "status", width: 120 },
              {
                title: "Поставка",
                width: 240,
                render: (_, row) => (
                  <Space direction="vertical" size={2}>
                    <span>{row.shipment_group_name || (row.shipment_group_id ? `Группа #${row.shipment_group_id}` : "—")}</span>
                    <span style={{ color: "#8c8c8c" }}>
                      {formatIncotermsWithPlace(row?.incoterms, row?.incoterms_place)}
                    </span>
                  </Space>
                ),
              },
              {
                title: "Качество",
                width: 170,
                render: (_, row) => (
                  <Space direction="vertical" size={2}>
                    <span>
                      {Number(row.open_quality_events || 0) > 0
                        ? `Открыто событий: ${Number(row.open_quality_events || 0)}`
                        : "Открытых событий нет"}
                    </span>
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveOrder(row)
                        setQualityModalOpen(true)
                      }}
                    >
                      Добавить событие
                    </Button>
                  </Space>
                ),
              },
              {
                title: "Документы",
                width: 320,
                render: (_, row) => (
                  <Space wrap>
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(resolveAppHref(`/purchase-orders/${row.id}/preview`), "_blank", "noopener")
                      }}
                    >
                      Открыть документ
                    </Button>
                    {row.file_url ? (
                      <Button
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(row.file_url, "_blank", "noopener")
                        }}
                      >
                        Скачать DOCX
                      </Button>
                    ) : null}
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleGenerate(row)
                      }}
                    >
                      Пересобрать DOCX
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      </Space>

      <Drawer
        width={1040}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={
          <Space>
            <span>Заказ поставщику</span>
            {activeOrder?.status ? <Tag>{activeOrder.status}</Tag> : null}
          </Space>
        }
      >
        <Tabs activeKey={drawerTabKey} onChange={setDrawerTabKey} items={drawerItems} />
      </Drawer>

      <Modal
        title="Приход на склад из PO"
        open={receiptModalOpen}
        onCancel={() => setReceiptModalOpen(false)}
        onOk={handleCreateReceipt}
        okText="Создать приход"
        confirmLoading={receiptSubmitting}
        width={980}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Alert
            type="info"
            showIcon
            message={activeOrder ? `${activeOrder.supplier_name || "Поставщик"} · ${activeOrder.supplier_reference || `PO #${activeOrder.id}`}` : "PO"}
            description="Приход создается по деталям поставщика. Карточка позиции используется как контекст для поиска и складской сводки."
          />
          <Form form={receiptForm} layout="vertical">
            <Row gutter={12}>
              <Col xs={24} md={8}>
                <Form.Item name="document_date" label="Дата прихода" rules={[{ required: true }]}>
                  <DatePicker showTime format="DD.MM.YYYY HH:mm" style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="warehouse_id" label="Склад" rules={[{ required: true }]}>
                  <Select options={locationOptions} placeholder="Выберите склад" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="storage_place_id" label="Адрес хранения" rules={[{ required: true }]}>
                  <Select allowClear options={placeOptions} placeholder="Адрес на складе" />
                </Form.Item>
              </Col>
            </Row>
          </Form>

          <Table
            rowKey="id"
            size="small"
            dataSource={receiptRows}
            pagination={false}
            scroll={{ x: 880 }}
            columns={[
              {
                title: "",
                width: 46,
                render: (_, row) => (
                  <Checkbox
                    checked={Boolean(row.selected)}
                    onChange={(event) => updateReceiptRow(row.id, { selected: event.target.checked })}
                  />
                ),
              },
              {
                title: "Деталь поставщика",
                width: 330,
                render: (_, row) => (
                  <Space direction="vertical" size={2}>
                    <Text strong>{lineTitle(row)}</Text>
                    <Text type="secondary">{lineDescription(row)}</Text>
                    <Text type="secondary">{row.catalog_position_name || "Без привязки к карточке позиции"}</Text>
                  </Space>
                ),
              },
              {
                title: "Заказано",
                width: 100,
                render: (_, row) => formatQty(row.qty),
              },
              {
                title: "Принято",
                width: 100,
                render: (_, row) => formatQty(row.received_qty),
              },
              {
                title: "Осталось",
                width: 110,
                render: (_, row) => <Tag color="blue">{formatQty(row.remaining_num)}</Tag>,
              },
              {
                title: "К приходу",
                width: 140,
                render: (_, row) => (
                  <InputNumber
                    min={0}
                    max={row.remaining_num}
                    precision={3}
                    value={row.receipt_quantity}
                    disabled={!row.selected}
                    style={{ width: "100%" }}
                    onChange={(value) => updateReceiptRow(row.id, { receipt_quantity: toNumber(value) })}
                  />
                ),
              },
            ]}
          />
        </Space>
      </Modal>

      <SupplierQualityEventModal
        open={qualityModalOpen}
        supplierId={activeOrder?.supplier_id || null}
        purchaseOrder={activeOrder}
        onClose={() => setQualityModalOpen(false)}
        onCreated={() => activeOrder && loadQualityEvents(activeOrder)}
      />
    </PageWrapper>
  )
}
