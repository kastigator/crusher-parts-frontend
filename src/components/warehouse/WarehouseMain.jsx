import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import dayjs from "dayjs"
import {
  App as AntdApp,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd"
import {
  AppstoreAddOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
  SwapOutlined,
} from "@ant-design/icons"
import axios from "@/api/axiosInstance"

const { Text } = Typography
const { TextArea } = Input

const DOC_TYPE_META = {
  receipt: { label: "Приход", color: "green", icon: <InboxOutlined /> },
  transfer: { label: "Перемещение", color: "blue", icon: <SwapOutlined /> },
  writeoff: { label: "Списание", color: "red", icon: <DeleteOutlined /> },
}

const STATUS_META = {
  draft: { label: "Черновик", color: "default" },
  posted: { label: "Проведён", color: "green" },
  cancelled: { label: "Отменён", color: "red" },
}

const WAREHOUSE_TYPE_OPTIONS = [
  { value: "physical", label: "Физический склад" },
  { value: "office", label: "Офис" },
  { value: "transit", label: "Транзит" },
]

const formatQuantity = (value) => {
  const n = Number(value || 0)
  if (!Number.isFinite(n)) return "0"
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 3 })
}

const formatDate = (value) => (value ? dayjs(value).format("DD.MM.YYYY HH:mm") : "—")

const positionTitle = (row) =>
  row?.manufacturer_part_number ||
  row?.position_code ||
  row?.display_name ||
  row?.display_name_en ||
  row?.display_name_ru ||
  `#${row?.catalog_position_id || row?.id || ""}`

const positionSubtitle = (row) => {
  const title = row?.display_name || row?.display_name_en || row?.display_name_ru
  const model = [row?.manufacturer_name, row?.model_name].filter(Boolean).join(" · ")
  return [title, model].filter(Boolean).join(" · ")
}

const normalizeSelectValue = (value) => {
  if (value === "all" || value === undefined || value === null || value === "") return value
  const n = Number(value)
  return Number.isFinite(n) ? n : value
}

export default function WarehouseMain() {
  const { message } = AntdApp.useApp()
  const [locations, setLocations] = useState([])
  const [places, setPlaces] = useState([])
  const [overview, setOverview] = useState({
    stats: { positions_count: 0, actual_qty: 0, reserved_qty: 0, free_qty: 0 },
    stock: [],
    documents: [],
  })
  const [selectedWarehouse, setSelectedWarehouse] = useState("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [docModalOpen, setDocModalOpen] = useState(false)
  const [placeModalOpen, setPlaceModalOpen] = useState(false)
  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false)
  const [documentPreviewOpen, setDocumentPreviewOpen] = useState(false)
  const [documentPreview, setDocumentPreview] = useState(null)
  const [documentPreviewLoading, setDocumentPreviewLoading] = useState(false)
  const [positionOptions, setPositionOptions] = useState([])
  const [positionLoading, setPositionLoading] = useState(false)

  const [docForm] = Form.useForm()
  const [placeForm] = Form.useForm()
  const [warehouseForm] = Form.useForm()
  const searchTimerRef = useRef(null)

  const docType = Form.useWatch("doc_type", docForm) || "receipt"
  const warehouseId = Form.useWatch("warehouse_id", docForm)
  const sourceWarehouseId = Form.useWatch("source_warehouse_id", docForm)
  const targetWarehouseId = Form.useWatch("target_warehouse_id", docForm)

  const locationOptions = useMemo(
    () =>
      locations.map((item) => ({
        value: item.id,
        label: item.name,
        title: item.code,
      })),
    [locations]
  )

  const selectedWarehouseId = selectedWarehouse === "all" ? null : Number(selectedWarehouse)

  const loadLocations = useCallback(async () => {
    try {
      const { data } = await axios.get("/warehouse/locations")
      setLocations(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Не удалось загрузить склады", err)
      message.error("Не удалось загрузить склады")
    }
  }, [message])

  const loadPlaces = useCallback(async () => {
    try {
      const { data } = await axios.get("/warehouse/storage-places")
      setPlaces(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Не удалось загрузить места хранения", err)
      message.error("Не удалось загрузить места хранения")
    }
  }, [message])

  const loadOverview = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit: 500 }
      if (selectedWarehouseId) params.warehouse_id = selectedWarehouseId
      if (search.trim()) params.q = search.trim()
      const { data } = await axios.get("/warehouse/overview", { params })
      setOverview({
        stats: data?.stats || { positions_count: 0, actual_qty: 0, reserved_qty: 0, free_qty: 0 },
        stock: Array.isArray(data?.stock) ? data.stock : [],
        documents: Array.isArray(data?.documents) ? data.documents : [],
      })
    } catch (err) {
      console.error("Не удалось загрузить склад", err)
      message.error("Не удалось загрузить склад")
    } finally {
      setLoading(false)
    }
  }, [message, search, selectedWarehouseId])

  useEffect(() => {
    loadLocations()
    loadPlaces()
  }, [loadLocations, loadPlaces])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  useEffect(
    () => () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    },
    []
  )

  const refreshAll = () => {
    loadLocations()
    loadPlaces()
    loadOverview()
  }

  const placeOptionsForWarehouse = useCallback(
    (id) =>
      places
        .filter((place) => String(place.warehouse_id) === String(id))
        .map((place) => ({
          value: place.id,
          label: `${place.code}${place.notes ? ` · ${place.notes}` : ""}`,
        })),
    [places]
  )

  const fetchPositions = useCallback(
    (value) => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
      const q = String(value || "").trim()
      if (q.length < 2) {
        setPositionOptions([])
        return
      }

      searchTimerRef.current = setTimeout(async () => {
        setPositionLoading(true)
        try {
          const { data } = await axios.get("/warehouse/catalog-positions", { params: { q } })
          setPositionOptions(Array.isArray(data) ? data : [])
        } catch (err) {
          console.error("Не удалось найти карточки позиций", err)
          message.error("Не удалось найти карточки позиций")
        } finally {
          setPositionLoading(false)
        }
      }, 250)
    },
    [message]
  )

  const openDocumentModal = (type = "receipt") => {
    const defaultWarehouse = selectedWarehouseId || locations[0]?.id || null
    const secondWarehouse = locations.find((item) => item.id !== defaultWarehouse)?.id || null
    docForm.resetFields()
    docForm.setFieldsValue({
      doc_type: type,
      document_date: dayjs(),
      warehouse_id: defaultWarehouse,
      source_warehouse_id: defaultWarehouse,
      target_warehouse_id: secondWarehouse,
      lines: [{ quantity: 1 }],
    })
    setPositionOptions([])
    setDocModalOpen(true)
  }

  const submitDocument = async () => {
    try {
      const values = await docForm.validateFields()
      const payload = {
        ...values,
        document_date: values.document_date?.toISOString?.() || new Date().toISOString(),
        post: true,
        warehouse_id: values.doc_type === "transfer" ? null : values.warehouse_id,
        lines: (values.lines || []).map((line) => ({
          catalog_position_id: line.catalog_position_id,
          quantity: line.quantity,
          storage_place_id: line.storage_place_id,
          target_storage_place_id: line.target_storage_place_id,
          notes: line.notes,
        })),
      }
      await axios.post("/warehouse/documents", payload)
      message.success("Складской документ проведён")
      setDocModalOpen(false)
      docForm.resetFields()
      refreshAll()
    } catch (err) {
      if (err?.errorFields) return
      console.error("Не удалось провести складской документ", err)
      message.error(err?.response?.data?.message || "Не удалось провести складской документ")
    }
  }

  const openPlaceModal = () => {
    placeForm.resetFields()
    placeForm.setFieldsValue({
      warehouse_id: selectedWarehouseId || locations[0]?.id || null,
    })
    setPlaceModalOpen(true)
  }

  const submitPlace = async () => {
    try {
      const values = await placeForm.validateFields()
      await axios.post("/warehouse/storage-places", values)
      message.success("Место хранения создано")
      setPlaceModalOpen(false)
      placeForm.resetFields()
      loadPlaces()
    } catch (err) {
      if (err?.errorFields) return
      console.error("Не удалось создать место хранения", err)
      message.error(err?.response?.data?.message || "Не удалось создать место хранения")
    }
  }

  const openWarehouseModal = () => {
    warehouseForm.resetFields()
    warehouseForm.setFieldsValue({ location_type: "physical" })
    setWarehouseModalOpen(true)
  }

  const submitWarehouse = async () => {
    try {
      const values = await warehouseForm.validateFields()
      const { data } = await axios.post("/warehouse/locations", values)
      message.success("Склад создан")
      setWarehouseModalOpen(false)
      warehouseForm.resetFields()
      await loadLocations()
      if (data?.id) setSelectedWarehouse(data.id)
    } catch (err) {
      if (err?.errorFields) return
      console.error("Не удалось создать склад", err)
      message.error(err?.response?.data?.message || "Не удалось создать склад")
    }
  }

  const openDocumentPreview = async (record) => {
    setDocumentPreviewOpen(true)
    setDocumentPreviewLoading(true)
    try {
      const { data } = await axios.get(`/warehouse/documents/${record.id}`)
      setDocumentPreview(data)
    } catch (err) {
      console.error("Не удалось загрузить документ склада", err)
      message.error("Не удалось загрузить документ склада")
    } finally {
      setDocumentPreviewLoading(false)
    }
  }

  const positionSelectOptions = useMemo(
    () =>
      positionOptions.map((item) => ({
        value: item.id,
        label: (
          <Space direction="vertical" size={0}>
            <Text strong>{positionTitle(item)}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {positionSubtitle(item) || "Карточка позиции"}
            </Text>
          </Space>
        ),
      })),
    [positionOptions]
  )

  const stockColumns = useMemo(
    () => [
      {
        title: "Позиция",
        dataIndex: "manufacturer_part_number",
        width: 360,
        render: (_value, row) => (
          <Space direction="vertical" size={0}>
            <Text strong>{positionTitle(row)}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {positionSubtitle(row) || "—"}
            </Text>
          </Space>
        ),
      },
      {
        title: "Склад",
        dataIndex: "warehouse_name",
        width: 220,
        render: (_value, row) => (
          <Space direction="vertical" size={2}>
            <Text>{row.warehouse_name || "—"}</Text>
            <Tag>{row.storage_place_code || "без адреса"}</Tag>
          </Space>
        ),
      },
      {
        title: "Факт",
        dataIndex: "actual_qty",
        width: 110,
        align: "right",
        render: (value, row) => (
          <Text>
            {formatQuantity(value)} {row.uom || "шт"}
          </Text>
        ),
      },
      {
        title: "Свободно",
        dataIndex: "free_qty",
        width: 110,
        align: "right",
        render: (value, row) => (
          <Text strong>
            {formatQuantity(value)} {row.uom || "шт"}
          </Text>
        ),
      },
      {
        title: "Резерв",
        dataIndex: "reserved_qty",
        width: 110,
        align: "right",
        render: (value, row) => (
          <Text type={Number(value || 0) > 0 ? undefined : "secondary"}>
            {formatQuantity(value)} {row.uom || "шт"}
          </Text>
        ),
      },
      {
        title: "Последнее движение",
        key: "last",
        width: 220,
        render: (_value, row) => (
          <Space direction="vertical" size={0}>
            <Text type="secondary">Приход: {formatDate(row.last_receipt_at)}</Text>
            <Text type="secondary">Расход: {formatDate(row.last_out_at)}</Text>
          </Space>
        ),
      },
    ],
    []
  )

  const documentColumns = useMemo(
    () => [
      {
        title: "Документ",
        dataIndex: "document_no",
        width: 190,
        render: (value, row) => (
          <Space direction="vertical" size={0}>
            <Text strong>{value || `#${row.id}`}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatDate(row.document_date)}
            </Text>
          </Space>
        ),
      },
      {
        title: "Тип",
        dataIndex: "doc_type",
        width: 150,
        render: (value) => {
          const meta = DOC_TYPE_META[value] || { label: value, color: "default" }
          return (
            <Tag color={meta.color} icon={meta.icon}>
              {meta.label}
            </Tag>
          )
        },
      },
      {
        title: "Статус",
        dataIndex: "status",
        width: 120,
        render: (value) => {
          const meta = STATUS_META[value] || { label: value, color: "default" }
          return <Tag color={meta.color}>{meta.label}</Tag>
        },
      },
      {
        title: "Склад",
        key: "warehouse",
        render: (_value, row) => {
          if (row.doc_type === "transfer") {
            return `${row.source_warehouse_name || "—"} → ${row.target_warehouse_name || "—"}`
          }
          return row.warehouse_name || "—"
        },
      },
      {
        title: "Строки",
        dataIndex: "line_count",
        width: 90,
        align: "right",
        render: (value) => formatQuantity(value),
      },
      {
        title: "Кол-во",
        dataIndex: "total_line_qty",
        width: 110,
        align: "right",
        render: (value) => formatQuantity(value),
      },
      {
        title: "Основание",
        dataIndex: "basis_document",
        width: 180,
        ellipsis: true,
        render: (value) => value || "—",
      },
    ],
    []
  )

  const previewDocType = documentPreview?.document?.doc_type
  const previewLineColumns = useMemo(
    () => [
      {
        title: "Позиция",
        dataIndex: "manufacturer_part_number",
        render: (_value, row) => (
          <Space direction="vertical" size={0}>
            <Text strong>{positionTitle(row)}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.display_name || "—"}
            </Text>
          </Space>
        ),
      },
      {
        title: "Адрес",
        dataIndex: "storage_place_code",
        width: 170,
        render: (_value, row) =>
          previewDocType === "transfer"
            ? `${row.storage_place_code || "—"} → ${row.target_storage_place_code || "—"}`
            : row.storage_place_code || "—",
      },
      {
        title: "Кол-во",
        dataIndex: "quantity",
        width: 120,
        align: "right",
        render: (value, row) => `${formatQuantity(value)} ${row.unit_code || "шт"}`,
      },
    ],
    [previewDocType]
  )

  const lineSourceWarehouse = docType === "transfer" ? sourceWarehouseId : warehouseId

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card bodyStyle={{ padding: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={8} lg={7}>
            <Select
              value={selectedWarehouse}
              onChange={(value) => setSelectedWarehouse(normalizeSelectValue(value))}
              style={{ width: "100%" }}
              options={[
                { value: "all", label: "Все склады" },
                ...locations.map((item) => ({
                  value: item.id,
                  label: item.name,
                })),
              ]}
            />
          </Col>
          <Col xs={24} md={10} lg={8}>
            <Input.Search
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onSearch={loadOverview}
              allowClear
              enterButton="Найти"
              placeholder="Позиция, номер, адрес хранения"
            />
          </Col>
          <Col xs={24} md={24} lg={9}>
            <Space wrap style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button icon={<ReloadOutlined />} onClick={refreshAll}>
                Обновить
              </Button>
              <Button icon={<EnvironmentOutlined />} onClick={openPlaceModal}>
                Место
              </Button>
              <Button icon={<AppstoreAddOutlined />} onClick={openWarehouseModal}>
                Склад
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openDocumentModal("receipt")}>
                Документ
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[12, 12]}>
        <Col xs={12} lg={6}>
          <div className="warehouse-stat">
            <Statistic title="Карточек с остатком" value={overview.stats.positions_count || 0} />
          </div>
        </Col>
        <Col xs={12} lg={6}>
          <div className="warehouse-stat">
            <Statistic title="Фактический остаток" value={formatQuantity(overview.stats.actual_qty)} />
          </div>
        </Col>
        <Col xs={12} lg={6}>
          <div className="warehouse-stat">
            <Statistic title="Свободно" value={formatQuantity(overview.stats.free_qty)} />
          </div>
        </Col>
        <Col xs={12} lg={6}>
          <div className="warehouse-stat">
            <Statistic title="В резерве" value={formatQuantity(overview.stats.reserved_qty)} />
          </div>
        </Col>
      </Row>

      <Row gutter={[16, 16]} align="top">
        <Col xs={24} xl={14}>
          <Card
            title="Остатки"
            extra={
              <Space>
                <Button size="small" icon={<InboxOutlined />} onClick={() => openDocumentModal("receipt")}>
                  Приход
                </Button>
                <Button size="small" icon={<SwapOutlined />} onClick={() => openDocumentModal("transfer")}>
                  Перемещение
                </Button>
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => openDocumentModal("writeoff")}>
                  Списание
                </Button>
              </Space>
            }
            bodyStyle={{ padding: 0 }}
          >
            <Table
              rowKey={(row) => `${row.warehouse_id}-${row.storage_place_id || 0}-${row.catalog_position_id}`}
              columns={stockColumns}
              dataSource={overview.stock}
              loading={loading}
              size="small"
              scroll={{ x: 1050 }}
              pagination={{ pageSize: 12, showSizeChanger: false }}
              locale={{ emptyText: <Empty description="Остатков пока нет" /> }}
            />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="Журнал документов" bodyStyle={{ padding: 0 }}>
            <Table
              rowKey="id"
              columns={documentColumns}
              dataSource={overview.documents}
              loading={loading}
              size="small"
              scroll={{ x: 980 }}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              onRow={(record) => ({
                onClick: () => openDocumentPreview(record),
                style: { cursor: "pointer" },
              })}
              locale={{ emptyText: <Empty description="Документов пока нет" /> }}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title="Складской документ"
        open={docModalOpen}
        onCancel={() => setDocModalOpen(false)}
        onOk={submitDocument}
        okText="Провести"
        width={920}
        destroyOnClose
      >
        <Form form={docForm} layout="vertical">
          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item name="doc_type" label="Тип документа" rules={[{ required: true }]}>
                <Select
                  options={Object.entries(DOC_TYPE_META).map(([value, meta]) => ({
                    value,
                    label: meta.label,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="document_date" label="Дата" rules={[{ required: true }]}>
                <DatePicker showTime format="DD.MM.YYYY HH:mm" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="basis_document" label="Основание">
                <Input placeholder="Счёт, PO, накладная" />
              </Form.Item>
            </Col>
          </Row>

          {docType === "transfer" ? (
            <Row gutter={12}>
              <Col xs={24} md={12}>
                <Form.Item name="source_warehouse_id" label="Склад отправления" rules={[{ required: true }]}>
                  <Select options={locationOptions} placeholder="Выберите склад" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="target_warehouse_id" label="Склад получения" rules={[{ required: true }]}>
                  <Select options={locationOptions} placeholder="Выберите склад" />
                </Form.Item>
              </Col>
            </Row>
          ) : (
            <Form.Item name="warehouse_id" label="Склад" rules={[{ required: true }]}>
              <Select options={locationOptions} placeholder="Выберите склад" />
            </Form.Item>
          )}

          <Form.List name="lines">
            {(fields, { add, remove }) => (
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                {fields.map((field) => (
                  <Row key={field.key} gutter={8} align="middle">
                    <Col xs={24} md={docType === "transfer" ? 9 : 11}>
                      <Form.Item
                        {...field}
                        name={[field.name, "catalog_position_id"]}
                        label="Карточка позиции"
                        rules={[{ required: true, message: "Выберите карточку" }]}
                      >
                        <Select
                          showSearch
                          filterOption={false}
                          onSearch={fetchPositions}
                          options={positionSelectOptions}
                          loading={positionLoading}
                          placeholder="Найти по номеру или названию"
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={4}>
                      <Form.Item
                        {...field}
                        name={[field.name, "quantity"]}
                        label="Кол-во"
                        rules={[{ required: true, message: "Укажите количество" }]}
                      >
                        <InputNumber min={0.001} precision={3} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={docType === "transfer" ? 5 : 7}>
                      <Form.Item {...field} name={[field.name, "storage_place_id"]} label="Адрес">
                        <Select
                          allowClear
                          disabled={!lineSourceWarehouse}
                          options={placeOptionsForWarehouse(lineSourceWarehouse)}
                          placeholder="Место хранения"
                        />
                      </Form.Item>
                    </Col>
                    {docType === "transfer" && (
                      <Col xs={12} md={5}>
                        <Form.Item {...field} name={[field.name, "target_storage_place_id"]} label="Адрес получения">
                          <Select
                            allowClear
                            disabled={!targetWarehouseId}
                            options={placeOptionsForWarehouse(targetWarehouseId)}
                            placeholder="Место"
                          />
                        </Form.Item>
                      </Col>
                    )}
                    <Col xs={12} md={1} style={{ paddingTop: 22 }}>
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(field.name)}
                        disabled={fields.length === 1}
                      />
                    </Col>
                  </Row>
                ))}
                <Button icon={<PlusOutlined />} onClick={() => add({ quantity: 1 })}>
                  Добавить строку
                </Button>
              </Space>
            )}
          </Form.List>

          <Form.Item name="notes" label="Комментарий" style={{ marginTop: 12 }}>
            <TextArea autoSize={{ minRows: 2, maxRows: 5 }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Место хранения"
        open={placeModalOpen}
        onCancel={() => setPlaceModalOpen(false)}
        onOk={submitPlace}
        okText="Создать"
        destroyOnClose
      >
        <Form form={placeForm} layout="vertical">
          <Form.Item name="warehouse_id" label="Склад" rules={[{ required: true }]}>
            <Select options={locationOptions} placeholder="Выберите склад" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="code" label="Адрес" rules={[{ required: true, whitespace: true }]}>
                <Input placeholder="A1/1-1-1" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="zone" label="Зона">
                <Input placeholder="A" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={6}>
              <Form.Item name="rack" label="Стеллаж">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="section" label="Секция">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="tier" label="Ярус">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="bin" label="Ячейка">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="Примечание">
            <TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Склад"
        open={warehouseModalOpen}
        onCancel={() => setWarehouseModalOpen(false)}
        onOk={submitWarehouse}
        okText="Создать"
        destroyOnClose
      >
        <Form form={warehouseForm} layout="vertical">
          <Row gutter={12}>
            <Col span={10}>
              <Form.Item name="code" label="Код" rules={[{ required: true, whitespace: true }]}>
                <Input placeholder="spb-2" />
              </Form.Item>
            </Col>
            <Col span={14}>
              <Form.Item name="name" label="Название" rules={[{ required: true, whitespace: true }]}>
                <Input placeholder="Склад СПб 2" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="location_type" label="Тип" rules={[{ required: true }]}>
            <Select options={WAREHOUSE_TYPE_OPTIONS} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="country" label="Страна">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="city" label="Город">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label="Адрес">
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="Примечание">
            <TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={documentPreview?.document?.document_no || "Документ склада"}
        open={documentPreviewOpen}
        onCancel={() => setDocumentPreviewOpen(false)}
        footer={null}
        width={820}
        destroyOnClose
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Row gutter={12}>
            <Col span={8}>
              <Text type="secondary">Тип</Text>
              <div>
                <Tag color={DOC_TYPE_META[documentPreview?.document?.doc_type]?.color}>
                  {DOC_TYPE_META[documentPreview?.document?.doc_type]?.label || "—"}
                </Tag>
              </div>
            </Col>
            <Col span={8}>
              <Text type="secondary">Статус</Text>
              <div>
                <Tag color={STATUS_META[documentPreview?.document?.status]?.color}>
                  {STATUS_META[documentPreview?.document?.status]?.label || "—"}
                </Tag>
              </div>
            </Col>
            <Col span={8}>
              <Text type="secondary">Дата</Text>
              <div>{formatDate(documentPreview?.document?.document_date)}</div>
            </Col>
          </Row>
          <Table
            rowKey="id"
            columns={previewLineColumns}
            dataSource={documentPreview?.lines || []}
            loading={documentPreviewLoading}
            size="small"
            pagination={false}
          />
        </Space>
      </Modal>

      <style>{`
        .warehouse-stat {
          background: #fff;
          border: 1px solid #eef0f3;
          border-radius: 8px;
          padding: 14px 16px;
          min-height: 86px;
        }

        .warehouse-stat .ant-statistic-title {
          color: #6b7280;
          margin-bottom: 6px;
        }
      `}</style>
    </Space>
  )
}
