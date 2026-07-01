import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Popover,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd"
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons"
import TabRendererPage from "@/components/common/TabRendererPage"
import axios from "@/api/axiosInstance"

const { Text } = Typography

const DIMENSION_OPTIONS = [
  { value: "quantity", label: "Количество" },
  { value: "mass", label: "Масса" },
  { value: "length", label: "Длина" },
  { value: "area", label: "Площадь" },
  { value: "volume", label: "Объем" },
  { value: "time", label: "Время" },
  { value: "currency", label: "Валюта" },
  { value: "custom", label: "Другое" },
]

const dimensionLabel = (value) =>
  DIMENSION_OPTIONS.find((item) => item.value === value)?.label || value || "—"

const usageSourceHelp = {
  "catalog_positions.uom": "Единица в карточке позиции каталога.",
  "equipment_model_bom_items.uom": "Единица строки BOM модели.",
  "supplier_parts.uom": "Единица в карточке детали поставщика.",
  "rfq_items.uom": "Единица позиции RFQ.",
  "rfq_supplier_line_selections.uom": "Единица выбранной строки поставщика в RFQ.",
  "rfq_coverage_option_lines.uom": "Единица строки покрытия RFQ.",
  "client_request_revision_items.uom": "Единица строки заявки клиента.",
  "material_properties.unit": "Единица свойства материала.",
  "rfq_econ2_scenario_other_costs.unit": "Единица прочего расхода в экономике RFQ.",
  "supplier_procurement_rules.enforce_uom": "Единица, которую требует правило закупки поставщика.",
}

const formatNumber = (value, maximumFractionDigits = 8) => {
  if (value === null || value === undefined || value === "") return "—"
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return String(value)
  return parsed.toLocaleString("ru-RU", { maximumFractionDigits })
}

const unitShortName = (row) => row?.symbol || row?.code || "ед."

const conversionRule = (row) => {
  if (!row?.base_unit_code) return "Базовая единица"
  const baseLabel = row.base_unit_symbol || row.base_unit_code
  return `1 ${unitShortName(row)} = ${formatNumber(row.factor_to_base)} ${baseLabel}`
}

const UsageDetails = ({ usage }) => {
  const sources = Array.isArray(usage?.sources) ? usage.sources : []
  if (!sources.length) {
    return <Text type="secondary">Эта единица пока нигде не выбрана.</Text>
  }
  return (
    <Space direction="vertical" size={10} style={{ maxWidth: 460 }}>
      <Text strong>Всего ссылок: {usage?.total || 0}</Text>
      {sources.map((source) => (
        <div key={`${source.key}-${source.raw_value || ""}`}>
          <Space wrap size={6}>
            <Text strong>{source.label}</Text>
            <Tag color="blue">{source.count}</Tag>
            {source.raw_value && source.raw_value !== source.normalized_code ? (
              <Tag>в данных: {source.raw_value}</Tag>
            ) : null}
          </Space>
          <br />
          <Text type="secondary">{usageSourceHelp[source.key] || "Использование в данных системы."}</Text>
        </div>
      ))}
    </Space>
  )
}

export default function MeasurementUnitsPage() {
  const [rows, setRows] = useState([])
  const [unknownUnits, setUnknownUnits] = useState([])
  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState("")
  const [dimensionFilter, setDimensionFilter] = useState(undefined)
  const [form] = Form.useForm()

  const loadRows = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/measurement-units", {
        params: {
          include_usage: 1,
          q: query || undefined,
          dimension_type: dimensionFilter || undefined,
        },
      })
      setRows(Array.isArray(data?.rows) ? data.rows : [])
      setUnknownUnits(Array.isArray(data?.unknown_units) ? data.unknown_units : [])
    } catch (err) {
      console.error("GET /measurement-units error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить единицы измерения")
    } finally {
      setLoading(false)
    }
  }, [dimensionFilter, query])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  const unitOptions = useMemo(
    () =>
      rows.map((row) => ({
        value: row.id,
        label: `${row.code} · ${row.name_ru}`,
      })),
    [rows]
  )

  const openCreate = () => {
    setEditingRow(null)
    form.resetFields()
    form.setFieldsValue({ dimension_type: "custom", is_active: true, factor_to_base: 1 })
    setDrawerOpen(true)
  }

  const openEdit = (row) => {
    setEditingRow(row)
    form.setFieldsValue({
      code: row.code,
      name_ru: row.name_ru,
      name_en: row.name_en,
      symbol: row.symbol,
      dimension_type: row.dimension_type || "custom",
      base_unit_id: row.base_unit_id || undefined,
      factor_to_base: row.factor_to_base === null ? undefined : Number(row.factor_to_base),
      is_active: !!row.is_active,
      note: row.note,
    })
    setDrawerOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      if (editingRow) {
        await axios.put(`/measurement-units/${editingRow.id}`, values)
        message.success("Единица измерения обновлена")
      } else {
        await axios.post("/measurement-units", values)
        message.success("Единица измерения создана")
      }
      setDrawerOpen(false)
      loadRows()
    } catch (err) {
      if (err?.errorFields) return
      console.error("SAVE measurement unit error:", err)
      message.error(err?.response?.data?.message || "Не удалось сохранить единицу измерения")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row) => {
    try {
      const { data } = await axios.delete(`/measurement-units/${row.id}`)
      message.success(data?.deactivated ? "Единица отключена, так как уже используется" : "Единица удалена")
      loadRows()
    } catch (err) {
      console.error("DELETE measurement unit error:", err)
      message.error(err?.response?.data?.message || "Не удалось удалить единицу измерения")
    }
  }

  const columns = [
    {
      title: "Код в системе",
      dataIndex: "code",
      width: 140,
      render: (value, row) => (
        <Space direction="vertical" size={0}>
          <Text strong>{value}</Text>
          {row.symbol ? <Text type="secondary">{row.symbol}</Text> : null}
        </Space>
      ),
    },
    {
      title: "Как показывать",
      dataIndex: "name_ru",
      render: (value) => (
        <Space direction="vertical" size={0}>
          <Text>{value}</Text>
        </Space>
      ),
    },
    {
      title: "Что измеряем",
      dataIndex: "dimension_type",
      width: 150,
      render: (value) => <Tag>{dimensionLabel(value)}</Tag>,
    },
    {
      title: "Правило пересчета",
      width: 230,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Text>{conversionRule(row)}</Text>
          {row.base_unit_code ? (
            <Text type="secondary">
              База: {row.base_unit_code}, коэффициент: {formatNumber(row.factor_to_base)}
            </Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: "Где используется",
      width: 170,
      render: (_, row) => {
        const usage = row.usage || { total: 0, sources: [] }
        return (
          <Popover
            trigger="click"
            placement="left"
            title="Где эта единица выбрана"
            content={<UsageDetails usage={usage} />}
            overlayStyle={{ maxWidth: 520 }}
          >
            <Button size="small" type={usage.total ? "primary" : "default"} ghost={!!usage.total}>
              {usage.total ? `${usage.total} мест` : "Не используется"}
            </Button>
          </Popover>
        )
      },
    },
    {
      title: "Статус",
      width: 150,
      render: (_, row) => (
        <Space wrap size={4}>
          <Tag color={row.is_active ? "green" : "default"}>{row.is_active ? "Активна" : "Отключена"}</Tag>
          {row.is_system ? <Tag color="gold">Системная</Tag> : null}
        </Space>
      ),
    },
    {
      title: "Действия",
      width: 120,
      render: (_, row) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(row)} />
          <Popconfirm
            title="Удалить единицу?"
            description="Если она уже используется, система просто отключит ее."
            okText="Да"
            cancelText="Нет"
            onConfirm={() => handleDelete(row)}
          >
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <TabRendererPage
      tabKey="measurement_units"
      helpText="Единый справочник единиц измерения: здесь создаются допустимые единицы, а формы системы берут их в выпадающие списки."
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadRows}>
            Обновить
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Добавить
          </Button>
        </Space>
      }
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Как используется единица измерения"
        description={
          <Space direction="vertical" size={4}>
            <Text>
              После создания активная единица появляется в полях <Text strong>Ед. изм.</Text> в позициях каталога,
              деталях поставщиков, заявках клиентов и RFQ.
            </Text>
            <Text>
              При сохранении записи система хранит ее короткий код, например <Text code>шт</Text>, <Text code>кг</Text>{" "}
              или <Text code>см</Text>. Поэтому код лучше считать постоянным идентификатором.
            </Text>
            <Text>
              Правило пересчета нужно только для родственных единиц: например, грамм относительно килограмма или
              сантиметр относительно метра. Для <Text code>шт</Text> и <Text code>компл</Text> база обычно не нужна.
            </Text>
          </Space>
        }
      />

      {unknownUnits.length ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="В данных есть единицы, которых нет в справочнике"
          description={`Их нужно добавить в справочник или заменить в старых записях: ${unknownUnits
            .slice(0, 8)
            .map((item) => `${item.raw_value} (${item.total})`)
            .join(", ")}`}
        />
      ) : null}

      <Card size="small" style={{ marginBottom: 12 }}>
        <Space wrap>
          <Input.Search
            allowClear
            placeholder="Поиск по коду или названию"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onSearch={loadRows}
            style={{ width: 280 }}
          />
          <Select
            allowClear
            placeholder="Тип измерения"
            value={dimensionFilter}
            onChange={setDimensionFilter}
            options={DIMENSION_OPTIONS}
            style={{ width: 180 }}
          />
        </Space>
      </Card>

      <Table
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 50, showSizeChanger: true }}
      />

      <Drawer
        open={drawerOpen}
        title={editingRow ? "Редактировать единицу" : "Новая единица измерения"}
        onClose={() => setDrawerOpen(false)}
        width={520}
        destroyOnHidden
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>Отмена</Button>
            <Button type="primary" loading={saving} onClick={handleSubmit}>
              Сохранить
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="code"
            label="Код в системе"
            rules={[{ required: true, message: "Укажите код" }]}
            extra="Это значение сохраняется в полях «Ед. изм.» и появляется в выпадающих списках. Примеры: шт, кг, см, компл."
          >
            <Input disabled={!!editingRow?.is_system} placeholder="шт" />
          </Form.Item>
          <Form.Item
            name="name_ru"
            label="Название для пользователей"
            rules={[{ required: true, message: "Укажите название" }]}
          >
            <Input placeholder="Штука" />
          </Form.Item>
          <Form.Item name="name_en" label="Название EN, если нужно">
            <Input placeholder="Не обязательно" />
          </Form.Item>
          <Form.Item name="symbol" label="Короткое обозначение в таблицах">
            <Input placeholder="шт" />
          </Form.Item>
          <Form.Item name="dimension_type" label="Что измеряем" rules={[{ required: true }]}>
            <Select options={DIMENSION_OPTIONS} />
          </Form.Item>
          <Form.Item
            name="base_unit_id"
            label="Пересчитывать относительно"
            extra="Оставьте пустым, если это самостоятельная единица вроде «шт» или «компл»."
          >
            <Select allowClear showSearch optionFilterProp="label" options={unitOptions} />
          </Form.Item>
          <Form.Item
            name="factor_to_base"
            label="Сколько базовых единиц в 1 этой единице"
            extra="Например: 1 г = 0,001 кг; 1 т = 1000 кг; 1 см = 0,01 м."
          >
            <InputNumber min={0} precision={8} style={{ width: "100%" }} placeholder="1" />
          </Form.Item>
          <Form.Item name="is_active" label="Активна" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="note" label="Пояснение для пользователей">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Drawer>
    </TabRendererPage>
  )
}
