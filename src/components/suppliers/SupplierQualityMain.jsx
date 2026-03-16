import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Card,
  Space,
  Table,
  Button,
  Drawer,
  Modal,
  Form,
  Select,
  Input,
  InputNumber,
  DatePicker,
  Tag,
  message,
  Typography,
} from "antd"
import dayjs from "dayjs"
import axios from "@/api/axiosInstance"

const TYPE_OPTIONS = [
  { value: "COMPLAINT", label: "Рекламация" },
  { value: "DELAY", label: "Задержка" },
  { value: "PROCESSING_RATING", label: "Оценка обработки" },
]

const STATUS_OPTIONS = [
  { value: "open", label: "Открыто" },
  { value: "closed", label: "Закрыто" },
]

const { Text } = Typography

const formatDate = (value) => {
  if (!value) return "-"
  const d = dayjs(value)
  return d.isValid() ? d.format("DD.MM.YYYY") : "-"
}

const renderType = (value) => {
  const entry = TYPE_OPTIONS.find((opt) => opt.value === value)
  return entry?.label || value || "-"
}

const renderStatus = (value) => {
  const entry = STATUS_OPTIONS.find((opt) => opt.value === value)
  return entry?.label || value || "-"
}

const renderSeverity = (value) => {
  const v = Number(value)
  if (!Number.isFinite(v)) return "-"
  const color = v >= 4 ? "red" : v >= 3 ? "orange" : "green"
  return <Tag color={color}>{v}</Tag>
}

const renderPoStatus = (value) =>
  ({
    draft: "Черновик",
    sent: "Отправлен",
    confirmed: "Подтвержден",
  }[String(value || "").trim().toLowerCase()] || value || "Черновик")

export default function SupplierQualityMain({ supplierId }) {
  const [summary, setSummary] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [purchaseOrdersLoading, setPurchaseOrdersLoading] = useState(false)
  const [purchaseOrderLines, setPurchaseOrderLines] = useState([])
  const [purchaseOrderLinesLoading, setPurchaseOrderLinesLoading] = useState(false)
  const [selectedLineMeta, setSelectedLineMeta] = useState(null)

  const [form] = Form.useForm()
  const eventType = Form.useWatch("event_type", form)

  const loadSummary = useCallback(async () => {
    if (!supplierId) return
    try {
      const { data } = await axios.get(`/suppliers/${supplierId}/quality-summary`)
      setSummary(data || null)
    } catch (e) {
      console.error(e)
    }
  }, [supplierId])

  const loadEvents = useCallback(async () => {
    if (!supplierId) return
    setLoading(true)
    try {
      const { data } = await axios.get(`/suppliers/${supplierId}/quality-events`)
      setEvents(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить события качества")
    } finally {
      setLoading(false)
    }
  }, [supplierId])

  useEffect(() => {
    if (!supplierId) return
    loadSummary()
    loadEvents()
  }, [supplierId, loadSummary, loadEvents])

  useEffect(() => {
    if (!modalOpen || !supplierId) return
    const fetchPos = async () => {
      setPurchaseOrdersLoading(true)
      try {
        const { data } = await axios.get(`/suppliers/${supplierId}/purchase-orders`)
        setPurchaseOrders(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error(e)
        message.error("Не удалось загрузить заказы поставщика")
      } finally {
        setPurchaseOrdersLoading(false)
      }
    }
    fetchPos()
  }, [modalOpen, supplierId])

  const summaryStats = useMemo(() => {
    if (!summary) return []
    return [
      { label: "Надежность (авто)", value: summary.reliability_rating ?? "-" },
      {
        label: "Риск (авто)",
        value:
          summary.risk_level === "low"
            ? "низкий"
            : summary.risk_level === "medium"
              ? "средний"
              : summary.risk_level === "high"
                ? "высокий"
                : summary.risk_level === "critical"
                  ? "критичный"
                  : "-",
      },
      { label: "Quality score", value: summary.quality_score ?? "-" },
      { label: "Всего", value: summary.total ?? 0 },
      { label: "Рекламации", value: summary.complaints ?? 0 },
      { label: "Задержки", value: summary.delays ?? 0 },
      { label: "Оценки обработки", value: summary.processing_ratings ?? 0 },
      { label: "Открыто", value: summary.open_count ?? 0 },
      { label: "Закрыто", value: summary.closed_count ?? 0 },
      {
        label: "Средняя оценка обработки",
        value:
          summary.avg_processing_rating != null
            ? Number(summary.avg_processing_rating).toFixed(2)
            : "-",
      },
      {
        label: "Средняя задержка, дни",
        value:
          summary.avg_delay_days != null
            ? Number(summary.avg_delay_days).toFixed(1)
            : "-",
      },
    ]
  }, [summary])

  const handleCreate = async (values) => {
    if (!supplierId) return
    setCreating(true)
    try {
      const payload = {
        event_type: values.event_type,
        severity: values.severity ?? 3,
        status: values.status || "open",
        occurred_at: values.occurred_at
          ? dayjs(values.occurred_at).format("YYYY-MM-DD")
          : null,
        expected_date: values.expected_date
          ? dayjs(values.expected_date).format("YYYY-MM-DD")
          : null,
        actual_date: values.actual_date
          ? dayjs(values.actual_date).format("YYYY-MM-DD")
          : null,
        delay_days: values.delay_days ?? null,
        rating: values.rating ?? null,
        note: values.note || null,
        supplier_purchase_order_id: values.supplier_purchase_order_id ?? null,
        supplier_purchase_order_line_id: values.supplier_purchase_order_line_id ?? null,
        rfq_response_line_id: values.rfq_response_line_id ?? null,
        selection_id: values.selection_id ?? null,
        selection_line_id: values.selection_line_id ?? null,
        sales_quote_id: values.sales_quote_id ?? null,
        sales_quote_line_id: values.sales_quote_line_id ?? null,
        original_part_id: values.original_part_id ?? null,
        qty_affected: values.qty_affected ?? null,
      }
      if (editingEvent?.id) {
        await axios.patch(`/suppliers/${supplierId}/quality-events/${editingEvent.id}`, payload)
        message.success("Событие обновлено")
      } else {
        await axios.post(`/suppliers/${supplierId}/quality-events`, payload)
        message.success("Событие добавлено")
      }
      form.resetFields()
      setModalOpen(false)
      setEditingEvent(null)
      setSelectedLineMeta(null)
      await loadSummary()
      await loadEvents()
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось добавить событие")
    } finally {
      setCreating(false)
    }
  }

  const columns = [
    {
      title: "Дата",
      dataIndex: "occurred_at",
      width: 120,
      render: (value, record) => formatDate(value || record.created_at),
    },
    {
      title: "Тип",
      dataIndex: "event_type",
      width: 160,
      render: (value) => renderType(value),
    },
    {
      title: "Серьёзность",
      dataIndex: "severity",
      width: 110,
      render: renderSeverity,
    },
    {
      title: "Статус",
      dataIndex: "status",
      width: 110,
      render: renderStatus,
    },
    {
      title: "Деталь",
      dataIndex: "original_cat_number",
      width: 160,
      render: (value, record) => value || record.original_part_id || "-",
    },
    {
      title: "PO",
      dataIndex: "supplier_reference",
      width: 140,
      render: (value, record) => value || record.po_id || "-",
    },
    {
      title: "Выбор",
      dataIndex: "selection_id",
      width: 100,
      render: (value) => (value ? `#${value}` : "-"),
    },
    {
      title: "КП",
      width: 110,
      render: (_, record) =>
        record.sales_quote_id
          ? `#${record.sales_quote_id}${record.sales_quote_revision_number ? ` / Rev ${record.sales_quote_revision_number}` : ""}`
          : "-",
    },
    {
      title: "Строка PO",
      dataIndex: "supplier_purchase_order_line_id",
      width: 110,
      render: (value) => value || "-",
    },
    {
      title: "Задержка",
      dataIndex: "delay_days",
      width: 110,
      render: (value) => (value != null ? `${value} дн.` : "-"),
    },
    {
      title: "Оценка",
      dataIndex: "rating",
      width: 90,
      render: (value) => (value != null ? value : "-"),
    },
    {
      title: "Комментарий",
      dataIndex: "note",
      render: (value) => value || "-",
    },
    {
      title: "Действия",
      width: 180,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              setEditingEvent(record)
              setSelectedLineMeta(record)
              form.setFieldsValue({
                event_type: record.event_type,
                severity: record.severity,
                status: record.status || "open",
                occurred_at: record.occurred_at ? dayjs(record.occurred_at) : null,
                expected_date: record.expected_date ? dayjs(record.expected_date) : null,
                actual_date: record.actual_date ? dayjs(record.actual_date) : null,
                delay_days: record.delay_days,
                rating: record.rating,
                note: record.note || null,
                supplier_purchase_order_id: record.supplier_purchase_order_id || null,
                supplier_purchase_order_line_id: record.supplier_purchase_order_line_id || null,
                rfq_response_line_id: record.rfq_response_line_id || null,
                selection_id: record.selection_id || null,
                selection_line_id: record.selection_line_id || null,
                sales_quote_id: record.sales_quote_id || null,
                sales_quote_line_id: record.sales_quote_line_id || null,
                original_part_id: record.oem_part_id || null,
                qty_affected: record.qty_affected ?? null,
              })
              setModalOpen(true)
            }}
          >
            Изменить
          </Button>
          {String(record.status || "").toLowerCase() !== "closed" ? (
            <Button
              size="small"
              onClick={async () => {
                try {
                  await axios.patch(`/suppliers/${supplierId}/quality-events/${record.id}`, {
                    status: "closed",
                  })
                  message.success("Событие закрыто")
                  await loadSummary()
                  await loadEvents()
                } catch (e) {
                  message.error(e?.response?.data?.message || "Не удалось закрыть событие")
                }
              }}
            >
              Закрыть
            </Button>
          ) : null}
        </Space>
      ),
    },
  ]

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={12}>
      <Card size="small">
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          Здесь фиксируются рекламации, задержки и оценки по поставщику. Правильная точка входа:
          выбирать строку <Text strong>PO</Text>, чтобы событие автоматически привязывалось к закупочному
          выбору, коммерческому КП и детали. Эти события автоматически пересчитывают рейтинг надежности
          и уровень риска поставщика.
        </Typography.Paragraph>
      </Card>

      <Card size="small" title="Сводка">
        <Space wrap size="large">
          {summaryStats.map((item) => (
            <Space key={item.label} direction="vertical" size={0}>
              <Text type="secondary">{item.label}</Text>
              <Text strong>{item.value}</Text>
            </Space>
          ))}
          {summary?.last_event_at ? (
            <Space direction="vertical" size={0}>
              <Text type="secondary">Последнее событие</Text>
              <Text strong>{formatDate(summary.last_event_at)}</Text>
            </Space>
          ) : null}
        </Space>
      </Card>

      <Card
        size="small"
        title="События качества"
        extra={
          <Space>
            <Button size="small" onClick={() => setHelpOpen(true)}>
              Справка
            </Button>
            <Button
              type="primary"
              onClick={() => {
                setEditingEvent(null)
                setSelectedLineMeta(null)
                form.resetFields()
                setModalOpen(true)
              }}
            >
              Добавить событие
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          dataSource={events}
          loading={loading}
          pagination={{ pageSize: 10 }}
          columns={columns}
        />
      </Card>

      <Modal
        title={editingEvent ? `Событие качества #${editingEvent.id}` : "Новое событие качества"}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false)
          setEditingEvent(null)
          setSelectedLineMeta(null)
        }}
        onOk={() => form.submit()}
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={creating}
        width={760}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Space wrap align="start">
            <Form.Item
              label="Тип"
              name="event_type"
              rules={[{ required: true, message: "Выберите тип" }]}
            >
              <Select style={{ width: 220 }} options={TYPE_OPTIONS} />
            </Form.Item>
            <Form.Item label="Серьёзность" name="severity" initialValue={3}>
              <InputNumber style={{ width: 140 }} min={1} max={5} />
            </Form.Item>
            <Form.Item label="Статус" name="status" initialValue="open">
              <Select style={{ width: 160 }} options={STATUS_OPTIONS} />
            </Form.Item>
            <Form.Item label="Дата события" name="occurred_at">
              <DatePicker style={{ width: 160 }} format="DD.MM.YYYY" />
            </Form.Item>
          </Space>

          <Space wrap align="start">
            <Form.Item label="PO" name="supplier_purchase_order_id">
              <Select
                style={{ width: 260 }}
                showSearch
                allowClear
                loading={purchaseOrdersLoading}
                optionFilterProp="label"
                options={purchaseOrders.map((po) => ({
                  value: po.id,
                  label: `PO #${po.id}${po.supplier_reference ? ` · ${po.supplier_reference}` : ""} · ${renderPoStatus(po.status)} · ${formatDate(po.created_at)}`.trim(),
                }))}
                onChange={async (value) => {
                  form.setFieldsValue({
                    supplier_purchase_order_line_id: null,
                    rfq_response_line_id: null,
                    selection_id: null,
                    selection_line_id: null,
                    sales_quote_id: null,
                    sales_quote_line_id: null,
                    original_part_id: null,
                  })
                  setSelectedLineMeta(null)
                  if (!value) {
                    setPurchaseOrderLines([])
                    return
                  }
                  setPurchaseOrderLinesLoading(true)
                  try {
                    const { data } = await axios.get(
                      `/suppliers/${supplierId}/purchase-orders/${value}/lines`
                    )
                    setPurchaseOrderLines(Array.isArray(data) ? data : [])
                  } catch (e) {
                    console.error(e)
                    message.error("Не удалось загрузить строки PO")
                    setPurchaseOrderLines([])
                  } finally {
                    setPurchaseOrderLinesLoading(false)
                  }
                }}
              />
            </Form.Item>
            <Form.Item label="Строка PO" name="supplier_purchase_order_line_id">
              <Select
                style={{ width: 260 }}
                showSearch
                allowClear
                loading={purchaseOrderLinesLoading}
                optionFilterProp="label"
                options={purchaseOrderLines.map((line) => ({
                  value: line.id,
                  label: `Line #${line.id} · ${line.original_cat_number || "без номера"} · ${line.qty || 0} ${line.currency || ""}`.trim(),
                }))}
                onChange={(value) => {
                  const line = purchaseOrderLines.find((item) => item.id === value) || null
                  setSelectedLineMeta(line)
                  form.setFieldsValue({
                    rfq_response_line_id: line?.rfq_response_line_id || null,
                    selection_id: line?.selection_id || null,
                    selection_line_id: line?.selection_line_id || null,
                    sales_quote_id: line?.sales_quote_id || null,
                    sales_quote_line_id: line?.sales_quote_line_id || null,
                    original_part_id: line?.original_part_id || null,
                  })
                }}
              />
            </Form.Item>
            <Form.Item label="Деталь">
              <Input
                style={{ width: 260 }}
                value={
                  selectedLineMeta
                    ? `${selectedLineMeta.original_cat_number || "без номера"} ${selectedLineMeta.original_description_ru || selectedLineMeta.original_description_en || ""}`.trim()
                    : ""
                }
                placeholder="Выберите строку PO"
                disabled
              />
            </Form.Item>
            <Form.Item label="Кол-во" name="qty_affected">
              <InputNumber style={{ width: 140 }} min={0} />
            </Form.Item>
          </Space>

          <Space wrap align="start">
            {eventType === "DELAY" ? (
              <>
                <Form.Item label="Ожид. дата" name="expected_date">
                  <DatePicker style={{ width: 160 }} format="DD.MM.YYYY" />
                </Form.Item>
                <Form.Item label="Факт. дата" name="actual_date">
                  <DatePicker style={{ width: 160 }} format="DD.MM.YYYY" />
                </Form.Item>
                <Form.Item label="Задержка, дни" name="delay_days">
                  <InputNumber style={{ width: 160 }} min={0} />
                </Form.Item>
              </>
            ) : null}
            {eventType === "PROCESSING_RATING" ? (
              <Form.Item label="Оценка обработки" name="rating">
                <InputNumber style={{ width: 160 }} min={1} max={5} />
              </Form.Item>
            ) : null}
          </Space>

          <Form.Item name="rfq_response_line_id" hidden>
            <InputNumber />
          </Form.Item>
          <Form.Item name="selection_id" hidden>
            <InputNumber />
          </Form.Item>
          <Form.Item name="selection_line_id" hidden>
            <InputNumber />
          </Form.Item>
          <Form.Item name="sales_quote_id" hidden>
            <InputNumber />
          </Form.Item>
          <Form.Item name="sales_quote_line_id" hidden>
            <InputNumber />
          </Form.Item>
          <Form.Item name="original_part_id" hidden>
            <InputNumber />
          </Form.Item>

          <Form.Item label="Комментарий" name="note">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="Справка по вкладке «Качество поставщика»"
        placement="right"
        width={460}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Typography.Paragraph>
            Здесь фиксируются рекламации, задержки и оценки исполнения по конкретным поставкам поставщика.
          </Typography.Paragraph>
          <Typography.Paragraph>
            Правильная точка входа для события качества — строка <strong>PO</strong>. Тогда событие
            автоматически связывается с закупочным выбором, коммерческим КП и конкретной деталью.
          </Typography.Paragraph>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            Этот журнал должен использоваться как часть execution loop: после подтвержденного PO, поставки
            и последующих претензий клиента. Он помогает видеть историю сбоев по поставщику и принимать
            решение по будущим RFQ.
          </Typography.Paragraph>
        </Space>
      </Drawer>
    </Space>
  )
}
