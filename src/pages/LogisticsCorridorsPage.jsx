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
import CountrySelect from "@/components/inputs/CountrySelect"
import DraggableColumnsTable from "@/components/common/DraggableColumnsTable"
import { getOrderedKeys } from "@/utils/columnOrder"

const TRANSPORT_OPTIONS = [
  { value: "SEA", label: "Море" },
  { value: "RAIL", label: "Ж/Д" },
  { value: "AIR", label: "Авиа" },
  { value: "ROAD", label: "Авто" },
  { value: "MULTI", label: "Мультимодально" },
]
const RISK_OPTIONS = [
  { value: "low", label: "Низкий" },
  { value: "medium", label: "Средний" },
  { value: "high", label: "Высокий" },
  { value: "critical", label: "Критический" },
]
const RISK_COLOR = {
  low: "green",
  medium: "gold",
  high: "orange",
  critical: "red",
}

export default function LogisticsCorridorsPage() {
  const LOGISTICS_ORDER_KEY = "logistics_corridors_column_order_v1"
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)
  const [columnOrder, setColumnOrder] = useState([])
  const [form] = Form.useForm()

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOGISTICS_ORDER_KEY)
      const parsed = raw ? JSON.parse(raw) : null
      setColumnOrder(Array.isArray(parsed) ? parsed : [])
    } catch {
      setColumnOrder([])
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(LOGISTICS_ORDER_KEY, JSON.stringify(columnOrder || []))
    } catch {
      // ignore storage errors
    }
  }, [columnOrder])

  const fetchRows = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/logistics-corridors")
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить коридоры")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRows()
  }, [])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      transport_mode: "MULTI",
      risk_level: "medium",
      is_active: true,
    })
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name || "",
      origin_country: record.origin_country || undefined,
      destination_country: record.destination_country || undefined,
      transport_mode: record.transport_mode || "MULTI",
      risk_level: record.risk_level || "medium",
      eta_min_days: record.eta_min_days,
      eta_max_days: record.eta_max_days,
      notes: record.notes || "",
      is_active: Number(record.is_active) === 1,
    })
    setModalOpen(true)
  }

  const save = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        name: values.name,
        origin_country: values.origin_country || null,
        destination_country: values.destination_country || null,
        transport_mode: values.transport_mode || "MULTI",
        risk_level: values.risk_level || "medium",
        eta_min_days: values.eta_min_days ?? null,
        eta_max_days: values.eta_max_days ?? null,
        notes: values.notes || null,
        is_active: values.is_active ? 1 : 0,
      }
      setSaving(true)
      if (editing?.id) {
        await axios.put(`/logistics-corridors/${editing.id}`, payload)
        message.success("Коридор обновлен")
      } else {
        await axios.post("/logistics-corridors", payload)
        message.success("Коридор добавлен")
      }
      setModalOpen(false)
      setEditing(null)
      form.resetFields()
      await fetchRows()
    } catch (e) {
      if (e?.errorFields) return
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось сохранить коридор")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (record) => {
    try {
      await axios.delete(`/logistics-corridors/${record.id}`)
      message.success("Коридор удален")
      await fetchRows()
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось удалить коридор")
    }
  }

  const stats = useMemo(() => {
    const total = rows.length
    const active = rows.filter((r) => Number(r.is_active) === 1).length
    const highRisk = rows.filter((r) => ["high", "critical"].includes(String(r.risk_level))).length
    return { total, active, highRisk }
  }, [rows])

  return (
    <PageWrapper
      title="Логистические коридоры"
      helpText="Справочник направлений доставки (страна-источник → страна назначения), риск и ожидаемые сроки."
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Card size="small">
          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <Space wrap>
              <Tag color="blue">Всего: {stats.total}</Tag>
              <Tag color="green">Активных: {stats.active}</Tag>
              <Tag color={stats.highRisk ? "orange" : "default"}>Высокий риск: {stats.highRisk}</Tag>
            </Space>
            <Space>
              <Button onClick={fetchRows}>Обновить</Button>
              <Button type="primary" onClick={openCreate}>
                Добавить коридор
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
            { title: "Название", dataIndex: "name", width: 240 },
            { title: "Откуда", dataIndex: "origin_country", width: 110, render: (v) => v || "—" },
            { title: "Куда", dataIndex: "destination_country", width: 110, render: (v) => v || "—" },
            {
              title: "Транспорт",
              dataIndex: "transport_mode",
              width: 140,
              render: (v) => TRANSPORT_OPTIONS.find((x) => x.value === v)?.label || v || "—",
            },
            {
              title: "Риск",
              dataIndex: "risk_level",
              width: 120,
              render: (v) => (
                <Tag color={RISK_COLOR[v] || "default"}>
                  {RISK_OPTIONS.find((x) => x.value === v)?.label || v || "—"}
                </Tag>
              ),
            },
            { title: "ETA от, дн", dataIndex: "eta_min_days", width: 110, render: (v) => v ?? "—" },
            { title: "ETA до, дн", dataIndex: "eta_max_days", width: 110, render: (v) => v ?? "—" },
            {
              title: "Активен",
              dataIndex: "is_active",
              width: 90,
              render: (v) => (Number(v) === 1 ? <Tag color="green">Да</Tag> : <Tag>Нет</Tag>),
            },
            { title: "Примечание", dataIndex: "notes", ellipsis: true },
            {
              title: "Действия",
              key: "actions",
              width: 150,
              render: (_, record) => (
                <Space size={8}>
                  <Button size="small" onClick={() => openEdit(record)}>
                    Изменить
                  </Button>
                  <Popconfirm
                    title="Удалить коридор?"
                    okText="Удалить"
                    cancelText="Отмена"
                    onConfirm={() => remove(record)}
                  >
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
              ["name", "origin_country", "destination_country", "transport_mode", "risk_level", "eta_min_days", "eta_max_days", "is_active", "notes", "actions"],
            )
            const from = nextFull.indexOf(activeKey)
            const to = nextFull.indexOf(overKey)
            if (from < 0 || to < 0 || from === to) return
            const [item] = nextFull.splice(from, 1)
            nextFull.splice(to, 0, item)
            setColumnOrder(nextFull)
          }}
        />

        <Modal
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          onOk={save}
          confirmLoading={saving}
          okText="Сохранить"
          title={editing ? "Изменить коридор" : "Новый коридор"}
          width={760}
        >
          <Form form={form} layout="vertical">
            <Space style={{ width: "100%" }} align="start" wrap>
              <Form.Item
                label="Название"
                name="name"
                rules={[{ required: true, message: "Введите название" }]}
                style={{ minWidth: 260, flex: 1 }}
              >
                <Input />
              </Form.Item>
              <Form.Item label="Транспорт" name="transport_mode" style={{ minWidth: 180 }}>
                <Select options={TRANSPORT_OPTIONS} />
              </Form.Item>
              <Form.Item label="Риск" name="risk_level" style={{ minWidth: 160 }}>
                <Select options={RISK_OPTIONS} />
              </Form.Item>
            </Space>
            <Space style={{ width: "100%" }} align="start" wrap>
              <Form.Item label="Откуда" name="origin_country" style={{ minWidth: 180 }}>
                <CountrySelect />
              </Form.Item>
              <Form.Item label="Куда" name="destination_country" style={{ minWidth: 180 }}>
                <CountrySelect />
              </Form.Item>
              <Form.Item label="ETA от, дн" name="eta_min_days" style={{ minWidth: 130 }}>
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item label="ETA до, дн" name="eta_max_days" style={{ minWidth: 130 }}>
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item label="Активен" name="is_active" valuePropName="checked" style={{ minWidth: 90 }}>
                <Switch />
              </Form.Item>
            </Space>
            <Form.Item label="Примечание" name="notes">
              <Input.TextArea rows={3} />
            </Form.Item>
          </Form>
        </Modal>
      </Space>
    </PageWrapper>
  )
}
