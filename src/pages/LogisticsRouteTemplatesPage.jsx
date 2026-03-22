import React, { useEffect, useMemo, useState } from "react"
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tag,
  message,
} from "antd"
import axios from "@/api/axiosInstance"
import PageWrapper from "@/components/common/PageWrapper"
import DraggableColumnsTable from "@/components/common/DraggableColumnsTable"
import { getOrderedKeys } from "@/utils/columnOrder"

const PRICING_OPTIONS = [
  { value: "fixed", label: "Фиксированная" },
  { value: "per_kg", label: "За кг" },
  { value: "per_cbm", label: "За м³" },
  { value: "per_kg_or_cbm_max", label: "Макс. из кг/м³" },
  { value: "hybrid", label: "Гибридная" },
]
const TRANSPORT_OPTIONS = [
  { value: "ROAD", label: "Авто" },
  { value: "SEA", label: "Море" },
  { value: "AIR", label: "Авиа" },
  { value: "RAIL", label: "Ж/д" },
  { value: "MULTI", label: "Мультимодально" },
]
const transportLabel = (value) =>
  TRANSPORT_OPTIONS.find((item) => item.value === String(value || "").toUpperCase())?.label || value || "—"
const formatDirection = (row) => {
  const from = String(row?.origin_country || "").trim().toUpperCase()
  const to = String(row?.destination_country || "").trim().toUpperCase()
  if (from && to) return `${from} → ${to}`
  return "—"
}

export default function LogisticsRouteTemplatesPage() {
  const ORDER_KEY = "logistics_route_templates_column_order_v1"
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)
  const [columnOrder, setColumnOrder] = useState([])
  const [form] = Form.useForm()

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ORDER_KEY)
      const parsed = raw ? JSON.parse(raw) : null
      setColumnOrder(Array.isArray(parsed) ? parsed : [])
    } catch {
      setColumnOrder([])
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(ORDER_KEY, JSON.stringify(columnOrder || []))
    } catch {
      // ignore
    }
  }, [columnOrder])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const { data: templateData } = await axios.get("/logistics-route-templates")
      setRows(Array.isArray(templateData) ? templateData : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить шаблоны доставки")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      pricing_model: "fixed",
      currency: "USD",
      version_no: 1,
      oversize_allowed: true,
      overweight_allowed: true,
      dangerous_goods_allowed: false,
      is_active: true,
      is_system: false,
    })
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name || "",
      code: record.code || "",
      version_no: record.version_no || 1,
      origin_country: record.origin_country || "",
      destination_country: record.destination_country || "",
      transport_mode: record.transport_mode || "ROAD",
      pricing_model: record.pricing_model || "fixed",
      currency: record.currency || "USD",
      fixed_cost: record.fixed_cost,
      rate_per_kg: record.rate_per_kg,
      rate_per_cbm: record.rate_per_cbm,
      min_cost: record.min_cost,
      markup_pct: record.markup_pct,
      markup_fixed: record.markup_fixed,
      eta_min_days: record.eta_min_days,
      eta_max_days: record.eta_max_days,
      incoterms_baseline: record.incoterms_baseline || "",
      oversize_allowed: Number(record.oversize_allowed) === 1,
      overweight_allowed: Number(record.overweight_allowed) === 1,
      dangerous_goods_allowed: Number(record.dangerous_goods_allowed) === 1,
      is_active: Number(record.is_active) === 1,
      is_system: Number(record.is_system) === 1,
      note: record.note || "",
    })
    setModalOpen(true)
  }

  const save = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        name: values.name,
        code: values.code || null,
        version_no: values.version_no || 1,
        origin_country: values.origin_country || null,
        destination_country: values.destination_country || null,
        transport_mode: values.transport_mode || "ROAD",
        pricing_model: values.pricing_model || "fixed",
        currency: values.currency || "USD",
        fixed_cost: values.fixed_cost ?? null,
        rate_per_kg: values.rate_per_kg ?? null,
        rate_per_cbm: values.rate_per_cbm ?? null,
        min_cost: values.min_cost ?? null,
        markup_pct: values.markup_pct ?? null,
        markup_fixed: values.markup_fixed ?? null,
        eta_min_days: values.eta_min_days ?? null,
        eta_max_days: values.eta_max_days ?? null,
        incoterms_baseline: values.incoterms_baseline || null,
        oversize_allowed: values.oversize_allowed ? 1 : 0,
        overweight_allowed: values.overweight_allowed ? 1 : 0,
        dangerous_goods_allowed: values.dangerous_goods_allowed ? 1 : 0,
        is_active: values.is_active ? 1 : 0,
        is_system: values.is_system ? 1 : 0,
        note: values.note || null,
      }
      setSaving(true)
      if (editing?.id) {
        await axios.put(`/logistics-route-templates/${editing.id}`, payload)
        message.success("Шаблон доставки обновлен")
      } else {
        await axios.post("/logistics-route-templates", payload)
        message.success("Шаблон доставки добавлен")
      }
      setModalOpen(false)
      setEditing(null)
      form.resetFields()
      await fetchAll()
    } catch (e) {
      if (e?.errorFields) return
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось сохранить шаблон доставки")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (record) => {
    try {
      await axios.delete(`/logistics-route-templates/${record.id}`)
      message.success("Шаблон доставки удален")
      await fetchAll()
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось удалить шаблон доставки")
    }
  }

  const stats = useMemo(() => {
    const total = rows.length
    const active = rows.filter((r) => Number(r.is_active) === 1).length
    const hybrid = rows.filter((r) => String(r.pricing_model) === "hybrid").length
    return { total, active, hybrid }
  }, [rows])

  return (
    <PageWrapper
      title="Шаблоны доставки"
      helpText="Переиспользуемые варианты доставки для групп отгрузки: направление, транспорт, тариф, сроки и ограничения."
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Card size="small">
          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <Space wrap>
              <Tag color="blue">Всего: {stats.total}</Tag>
              <Tag color="green">Активных: {stats.active}</Tag>
              <Tag color={stats.hybrid ? "purple" : "default"}>Гибридных: {stats.hybrid}</Tag>
            </Space>
            <Space>
              <Button onClick={fetchAll}>Обновить</Button>
              <Button type="primary" onClick={openCreate}>
                Добавить шаблон доставки
              </Button>
            </Space>
          </Space>
        </Card>

        <DraggableColumnsTable
          rowKey="id"
          loading={loading}
          dataSource={rows}
          pagination={{ pageSize: 20 }}
          columns={(() => {
            const defs = [
              { title: "Название", dataIndex: "name", width: 220 },
              { title: "Код", dataIndex: "code", width: 120, render: (v) => v || "—" },
              { title: "Направление", key: "direction", width: 140, render: (_, row) => formatDirection(row) },
              { title: "Транспорт", dataIndex: "transport_mode", width: 120, render: (v) => transportLabel(v) },
              {
                title: "Тариф",
                dataIndex: "pricing_model",
                width: 150,
                render: (v) => PRICING_OPTIONS.find((x) => x.value === v)?.label || v || "—",
              },
              { title: "Валюта", dataIndex: "currency", width: 90, render: (v) => v || "—" },
              { title: "Фикс", dataIndex: "fixed_cost", width: 100, render: (v) => v ?? "—" },
              { title: "За кг", dataIndex: "rate_per_kg", width: 100, render: (v) => v ?? "—" },
              { title: "За м³", dataIndex: "rate_per_cbm", width: 100, render: (v) => v ?? "—" },
              { title: "Мин.", dataIndex: "min_cost", width: 90, render: (v) => v ?? "—" },
              { title: "ETA от", dataIndex: "eta_min_days", width: 90, render: (v) => v ?? "—" },
              { title: "ETA до", dataIndex: "eta_max_days", width: 90, render: (v) => v ?? "—" },
              {
                title: "Активен",
                dataIndex: "is_active",
                width: 90,
                render: (v) => (Number(v) === 1 ? <Tag color="green">Да</Tag> : <Tag>Нет</Tag>),
              },
              {
                title: "Действия",
                key: "actions",
                width: 150,
                render: (_, record) => (
                  <Space size={8}>
                    <Button size="small" onClick={() => openEdit(record)}>
                      Изменить
                    </Button>
                    <Popconfirm title="Удалить шаблон доставки?" okText="Удалить" cancelText="Отмена" onConfirm={() => remove(record)}>
                      <Button size="small" danger>
                        Удалить
                      </Button>
                    </Popconfirm>
                  </Space>
                ),
              },
            ].map((c) => ({ ...c, key: c.key || c.dataIndex }))
            const orderedKeys = getOrderedKeys(columnOrder, defs.map((c) => c.key))
            const idx = new Map(orderedKeys.map((k, i) => [k, i]))
            return [...defs].sort((a, b) => {
              const ai = idx.has(a.key) ? idx.get(a.key) : Number.MAX_SAFE_INTEGER
              const bi = idx.has(b.key) ? idx.get(b.key) : Number.MAX_SAFE_INTEGER
              return ai - bi
            })
          })()}
          nonDraggableKeys={["actions"]}
          onColumnOrderChange={({ activeKey, overKey }) => {
            const nextFull = getOrderedKeys(
              columnOrder,
              ["name", "code", "direction", "transport_mode", "pricing_model", "currency", "fixed_cost", "rate_per_kg", "rate_per_cbm", "min_cost", "eta_min_days", "eta_max_days", "is_active", "actions"],
            )
            const from = nextFull.indexOf(activeKey)
            const to = nextFull.indexOf(overKey)
            if (from === -1 || to === -1 || from === to) return
            const arr = [...nextFull]
            const [moved] = arr.splice(from, 1)
            arr.splice(to, 0, moved)
            setColumnOrder(arr)
          }}
        />
      </Space>

      <Modal
        open={modalOpen}
        title={editing?.id ? "Изменить шаблон доставки" : "Новый шаблон доставки"}
        onCancel={() => {
          setModalOpen(false)
          setEditing(null)
          form.resetFields()
        }}
        onOk={save}
        confirmLoading={saving}
        destroyOnClose
        width={760}
      >
        <Form form={form} layout="vertical">
          <Space style={{ width: "100%" }} size="middle" align="start">
            <Form.Item
              name="name"
              label="Название"
              style={{ flex: 1 }}
              rules={[{ required: true, message: "Введите название" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="transport_mode"
              label="Транспорт"
              style={{ width: 180 }}
              rules={[{ required: true, message: "Выберите транспорт" }]}
            >
              <Select options={TRANSPORT_OPTIONS} />
            </Form.Item>
          </Space>

          <Space style={{ width: "100%" }} size="middle" align="start">
            <Form.Item
              name="origin_country"
              label="Откуда"
              style={{ width: 140 }}
              rules={[{ required: true, message: "Укажите страну" }]}
            >
              <Input maxLength={2} placeholder="CN" />
            </Form.Item>
            <Form.Item
              name="destination_country"
              label="Куда"
              style={{ width: 140 }}
              rules={[{ required: true, message: "Укажите страну" }]}
            >
              <Input maxLength={2} placeholder="RU" />
            </Form.Item>
            <Form.Item name="code" label="Код" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="version_no" label="Версия" style={{ width: 120 }}>
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="currency" label="Валюта" style={{ width: 120 }}>
              <Input maxLength={3} />
            </Form.Item>
          </Space>

          <Space style={{ width: "100%" }} size="middle" align="start">
            <Form.Item name="pricing_model" label="Модель тарифа" style={{ flex: 1 }} rules={[{ required: true, message: "Укажите модель" }]}>
              <Select options={PRICING_OPTIONS} />
            </Form.Item>
            <Form.Item name="incoterms_baseline" label="Базовый Incoterms" style={{ width: 180 }}>
              <Input maxLength={16} />
            </Form.Item>
          </Space>

          <Space style={{ width: "100%" }} size="middle" align="start">
            <Form.Item name="fixed_cost" label="Фикс. стоимость" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="min_cost" label="Мин. стоимость" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Space>

          <Space style={{ width: "100%" }} size="middle" align="start">
            <Form.Item name="rate_per_kg" label="Ставка за кг" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="rate_per_cbm" label="Ставка за м³" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Space>

          <Space style={{ width: "100%" }} size="middle" align="start">
            <Form.Item name="markup_pct" label="Наценка, %" style={{ flex: 1 }}>
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="markup_fixed" label="Наценка (фикс.)" style={{ flex: 1 }}>
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
          </Space>

          <Space style={{ width: "100%" }} size="middle" align="start">
            <Form.Item name="eta_min_days" label="ETA от, дн" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="eta_max_days" label="ETA до, дн" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Space>

          <Space wrap>
            <Form.Item name="oversize_allowed" label="Негабарит" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="overweight_allowed" label="Перевес" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="dangerous_goods_allowed" label="Опасный груз" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="is_active" label="Активен" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="is_system" label="Системный" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>

          <Form.Item name="note" label="Примечание">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </PageWrapper>
  )
}
