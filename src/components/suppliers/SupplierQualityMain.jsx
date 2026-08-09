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

export default function SupplierQualityMain({ supplierId }) {
  const [summary, setSummary] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)

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
      { label: "Индекс качества", value: summary.quality_score ?? "-" },
      { label: "Всего", value: summary.total ?? 0 },
      { label: "Рекламации", value: summary.complaints ?? 0 },
      { label: "Задержки", value: summary.delays ?? 0 },
      { label: "Оценки работы", value: summary.processing_ratings ?? 0 },
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
          Здесь сохраняется историческая supplier-quality оценка без чтения legacy PO/RFQ/Quote truth.
          Новые претензии с полной прослеживаемостью создаются в разделе <Text strong>Послепродажное обслуживание</Text>.
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
            Этот журнал должен использоваться как часть контура исполнения: после подтвержденного PO, поставки
            и последующих претензий клиента. Он помогает видеть историю сбоев по поставщику и принимать
            решение по будущим RFQ.
          </Typography.Paragraph>
        </Space>
      </Drawer>
    </Space>
  )
}
