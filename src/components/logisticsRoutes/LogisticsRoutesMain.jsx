// src/components/logisticsRoutes/LogisticsRoutesMain.jsx
import React, { useEffect, useMemo, useState } from "react"
import {
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Button,
  message,
  Alert,
  Popover,
} from "antd"
import { QuestionCircleOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import TableToolbar from "@/components/common/TableToolbar"
import CountrySelect from "@/components/inputs/CountrySelect"
import CurrencySelect from "@/components/inputs/CurrencySelect"
import IncotermsSelect from "@/components/inputs/IncotermsSelect"
import LogisticsRoutesTable, {
  ROUTE_TYPE_OPTIONS,
} from "./LogisticsRoutesTable"
import LegsEditor from "./LegsEditor"
import LegsModal from "./LegsModal"

const trim = (v) => (typeof v === "string" ? v.trim() : v ?? "")
const toNull = (v) => (v === "" || v === undefined ? null : v)
const toNumber = (v) => {
  if (v === undefined || v === null || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export default function LogisticsRoutesMain() {
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [legsDraft, setLegsDraft] = useState([])
  const [legsModalRoute, setLegsModalRoute] = useState(null)

  const [form] = Form.useForm()

  const fetchRoutes = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/logistics-routes")
      setRoutes(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Ошибка загрузки маршрутов:", err)
      message.error("Не удалось загрузить маршруты")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoutes()
  }, [])

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        name: trim(values.name),
        type: toNull(values.type),
        from_country: toNull(values.from_country),
        to_country: toNull(values.to_country),
        incoterms: toNull(values.incoterms),
        eta_days: toNumber(values.eta_days),
        cost: toNumber(values.cost),
        currency: toNull(values.currency),
        surcharge_pct: toNumber(values.surcharge_pct),
        surcharge_abs: toNumber(values.surcharge_abs),
        comment: trim(values.comment) || null,
        legs: legsDraft.map((l, i) => ({ ...l, seq: i + 1 })),
      }

      const { data: created } = await axios.post("/logistics-routes", payload)
      setRoutes((prev) => [created, ...prev])
      form.resetFields()
      setLegsDraft([])
      message.success("Маршрут добавлен")
    } catch (err) {
      if (err?.errorFields) return // валидация формы
      console.error("Ошибка создания маршрута:", err)
      message.error(err?.response?.data?.message || "Не удалось создать маршрут")
    }
  }

  const handleUpdate = async (id, row) => {
    const payload = {
      ...row,
      name: trim(row.name),
    }
    try {
      const { data: fresh } = await axios.put(`/logistics-routes/${id}`, payload)
      setRoutes((prev) => prev.map((r) => (r.id === id ? fresh : r)))
    } catch (err) {
      console.error("Ошибка обновления маршрута:", err)
      message.error("Не удалось сохранить изменения")
      throw err
    }
  }

  const handleDelete = async (record) => {
    try {
      await axios.delete(`/logistics-routes/${record.id}`)
      setRoutes((prev) => prev.filter((r) => r.id !== record.id))
      message.success("Маршрут удален")
    } catch (err) {
      console.error("Ошибка удаления маршрута:", err)
      message.error("Не удалось удалить маршрут")
      throw err
    }
  }

  const handleLegsUpdated = (updatedRoute) => {
    if (!updatedRoute) return
    setRoutes((prev) =>
      prev.map((r) => (r.id === updatedRoute.id ? updatedRoute : r)),
    )
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return routes
    return routes.filter((r) => {
      return (
        String(r.name || "").toLowerCase().includes(q) ||
        String(r.type || "").toLowerCase().includes(q) ||
        String(r.from_country || "").toLowerCase().includes(q) ||
        String(r.to_country || "").toLowerCase().includes(q) ||
        String(r.incoterms || "").toLowerCase().includes(q)
      )
    })
  }, [routes, search])

  return (
    <Space
      direction="vertical"
      size={16}
      style={{ width: "100%", maxWidth: "100%" }}
    >
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Popover
          placement="bottomRight"
          trigger="click"
          content={
            <div style={{ maxWidth: 520, lineHeight: 1.45 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                Как составлять маршруты
              </div>
              <ul style={{ paddingLeft: 16, marginBottom: 6 }}>
                <li>
                  <b>Одно плечо</b>: заполните форму (ETA, стоимость, валюта) и
                  создайте маршрут.
                </li>
                <li>
                  <b>Цепочка A→B→C</b>: добавьте звенья ниже (или в таблице по
                  кнопке «Звенья»): тип, откуда/куда, ETA, стоимость, наценка,
                  комментарий. Порядок регулируется стрелками.
                </li>
                <li>
                  Итоги ETA/стоимости считаются по сумме звеньев. Если звеньев
                  нет — работает как единое плечо.
                </li>
                <li>
                  В комментариях фиксируйте перевозчика, стыковки, особенности
                  (температура, таможня и т.п.).
                </li>
              </ul>
              <div style={{ color: "#6b7280" }}>
                Совет: многостадийные схемы с разными инкотермс разбивайте на
                звенья, чтобы в оффере сразу видеть суммарный срок и логистику.
              </div>
            </div>
          }
        >
          <Button
            type="text"
            size="small"
            icon={<QuestionCircleOutlined />}
            style={{ padding: "0 4px" }}
          >
            Подсказка
          </Button>
        </Popover>
      </div>
      <Alert
        type="info"
        showIcon
        message="Как задавать сложные маршруты?"
        description="Теперь можно задать цепочку внутри маршрута (звенья A → B → C) или оставить один отрезок. Звенья добавляются ниже (черновик) или через кнопку «Звенья» в таблице для уже созданных маршрутов."
      />
      <Card size="small">
        <TableToolbar
          search={search}
          onSearch={setSearch}
          placeholder="Поиск по названию, странам, инкотермс"
          onRefresh={fetchRoutes}
        />

        <Form
          form={form}
          layout="inline"
          style={{ marginTop: 12, rowGap: 8, flexWrap: "wrap" }}
          initialValues={{ type: null }}
          onFinish={handleCreate}
        >
          <Form.Item
            label="Название"
            name="name"
            tooltip="Короткое имя маршрута, например «Авиа Китай → РФ»"
            rules={[{ required: true, message: "Укажите название" }]}
          >
            <Input placeholder="Напр., Авиа Китай → РФ" style={{ width: 220 }} />
          </Form.Item>

          <Form.Item
            label="Тип"
            name="type"
            tooltip="Основной способ: авто, море, авиа, ж/д, курьер или другое"
          >
            <Select
              allowClear
              options={ROUTE_TYPE_OPTIONS}
              placeholder="Тип"
              style={{ width: 140 }}
              size="middle"
            />
          </Form.Item>

          <Form.Item
            label="Откуда"
            name="from_country"
            tooltip="Стартовая страна (ISO2)"
          >
            <CountrySelect style={{ minWidth: 140 }} />
          </Form.Item>

          <Form.Item
            label="Куда"
            name="to_country"
            tooltip="Конечная страна (ISO2)"
          >
            <CountrySelect style={{ minWidth: 140 }} />
          </Form.Item>

          <Form.Item
            label="Incoterms"
            name="incoterms"
            tooltip="Точка ответственности по Incoterms для маршрута"
          >
            <IncotermsSelect style={{ minWidth: 180 }} />
          </Form.Item>

          <Form.Item
            label="ETA, дн."
            name="eta_days"
            tooltip="Оценка срока в днях от старта до точки поставки по этому маршруту"
          >
            <InputNumber min={0} style={{ width: 110 }} />
          </Form.Item>

          <Form.Item
            label="Стоимость"
            name="cost"
            tooltip="Базовый логистический расход по этому маршруту (фикс)"
          >
            <InputNumber min={0} style={{ width: 120 }} />
          </Form.Item>

          <Form.Item name="currency">
            <CurrencySelect style={{ minWidth: 110 }} />
          </Form.Item>

          <Form.Item
            label="Наценка, %"
            name="surcharge_pct"
            tooltip="Доп. % к логистике (например, за экспедирование)"
          >
            <InputNumber min={0} style={{ width: 120 }} />
          </Form.Item>

          <Form.Item
            label="Фикс."
            name="surcharge_abs"
            tooltip="Доп. фиксированная сумма к логистике"
          >
            <InputNumber min={0} style={{ width: 110 }} />
          </Form.Item>

          <Form.Item
            label="Комментарий"
            name="comment"
            tooltip="Пометки: перевозчик, стыковка, особенности"
          >
            <Input placeholder="Кратко" style={{ width: 200 }} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              Добавить маршрут
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card size="small" bodyStyle={{ paddingTop: 12 }}>
        <LogisticsRoutesTable
          data={filtered}
          loading={loading}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onEditLegs={(route) => setLegsModalRoute(route)}
        />
      </Card>

      <LegsEditor legs={legsDraft} setLegs={setLegsDraft} compact />

      <LegsModal
        open={!!legsModalRoute}
        route={legsModalRoute}
        onClose={(fresh) => {
          if (fresh) handleLegsUpdated(fresh)
          setLegsModalRoute(null)
        }}
      />
    </Space>
  )
}
