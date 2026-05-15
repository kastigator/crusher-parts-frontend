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
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
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
      title: "Код",
      dataIndex: "code",
      width: 110,
      render: (value, row) => (
        <Space direction="vertical" size={0}>
          <Text strong>{value}</Text>
          {row.symbol ? <Text type="secondary">{row.symbol}</Text> : null}
        </Space>
      ),
    },
    {
      title: "Название",
      dataIndex: "name_ru",
      render: (value, row) => (
        <Space direction="vertical" size={0}>
          <Text>{value}</Text>
          {row.name_en ? <Text type="secondary">{row.name_en}</Text> : null}
        </Space>
      ),
    },
    {
      title: "Тип",
      dataIndex: "dimension_type",
      width: 130,
      render: (value) => <Tag>{dimensionLabel(value)}</Tag>,
    },
    {
      title: "База",
      width: 140,
      render: (_, row) => row.base_unit_code || "—",
    },
    {
      title: "Коэф.",
      dataIndex: "factor_to_base",
      width: 120,
      render: (value) => (value === null || value === undefined ? "—" : Number(value).toLocaleString("ru-RU")),
    },
    {
      title: "Использование",
      width: 150,
      render: (_, row) => {
        const usage = row.usage || { total: 0, sources: [] }
        const content = usage.sources?.length ? (
          <Space direction="vertical" size={2}>
            {usage.sources.map((source) => (
              <Text key={`${source.key}-${source.raw_value || ""}`}>{source.label}: {source.count}</Text>
            ))}
          </Space>
        ) : (
          "Нет ссылок"
        )
        return (
          <Tooltip title={content}>
            <Tag color={usage.total ? "blue" : "default"}>{usage.total || 0}</Tag>
          </Tooltip>
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
      helpText="Единый справочник единиц. Сейчас поля системы хранят код единицы строкой, а этот каталог задает допустимые значения и показывает использование."
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
      {unknownUnits.length ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Найдены единицы вне справочника"
          description={unknownUnits.slice(0, 8).map((item) => `${item.raw_value} (${item.total})`).join(", ")}
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
            label="Код"
            rules={[{ required: true, message: "Укажите код" }]}
            extra="Код сохраняется в существующих полях системы: pcs, kg, cm."
          >
            <Input disabled={!!editingRow?.is_system} placeholder="pcs" />
          </Form.Item>
          <Form.Item name="name_ru" label="Название RU" rules={[{ required: true, message: "Укажите название" }]}>
            <Input placeholder="Штука" />
          </Form.Item>
          <Form.Item name="name_en" label="Название EN">
            <Input placeholder="Piece" />
          </Form.Item>
          <Form.Item name="symbol" label="Символ">
            <Input placeholder="шт" />
          </Form.Item>
          <Form.Item name="dimension_type" label="Тип измерения" rules={[{ required: true }]}>
            <Select options={DIMENSION_OPTIONS} />
          </Form.Item>
          <Form.Item name="base_unit_id" label="Базовая единица">
            <Select allowClear showSearch optionFilterProp="label" options={unitOptions} />
          </Form.Item>
          <Form.Item name="factor_to_base" label="Коэффициент к базе">
            <InputNumber min={0} precision={8} style={{ width: "100%" }} placeholder="1" />
          </Form.Item>
          <Form.Item name="is_active" label="Активна" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="note" label="Примечание">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Drawer>
    </TabRendererPage>
  )
}
