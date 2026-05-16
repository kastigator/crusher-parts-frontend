import React, { useEffect, useMemo, useState } from "react"
import {
  Card,
  Space,
  Table,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Drawer,
  Tabs,
  message,
  Tag,
  Typography,
  Checkbox,
} from "antd"
import PageWrapper from "@/components/common/PageWrapper"
import axios from "@/api/axiosInstance"
import cc from "currency-codes"
import { formatPriceWithCurrency } from "@/utils/priceFormat"
import { formatUomLabel } from "@/utils/uom"

const OFFER_OPTIONS = [
  { value: "OEM", label: "OEM" },
  { value: "ANALOG", label: "Аналог" },
  { value: "UNKNOWN", label: "Не указан" },
]

const RESPONSE_STATUS_OPTIONS = [
  { value: "received", label: "Получен" },
  { value: "review", label: "На проверке" },
  { value: "approved", label: "Принят" },
  { value: "rejected", label: "Отклонен" },
]

const CURRENCY_OPTIONS = cc.codes().map((code) => {
  const info = cc.code(code)
  return { value: code, label: `${code} — ${info?.currency || code}` }
})

const { Text } = Typography

const normalizeResponseStatus = (value) => {
  if (!value) return "received"
  if (value === "in_review") return "review"
  if (value === "accepted") return "approved"
  if (value === "declined") return "rejected"
  return value
}

const formatResponseStatus = (value) => {
  const normalized = normalizeResponseStatus(value)
  const found = RESPONSE_STATUS_OPTIONS.find((opt) => opt.value === normalized)
  return found?.label || normalized || "Получен"
}

export default function SupplierResponsesPage() {
  const [responses, setResponses] = useState([])
  const [rfqs, setRfqs] = useState([])
  const [rfqSuppliers, setRfqSuppliers] = useState([])
  const [rfqItems, setRfqItems] = useState([])
  const [rfqStructure, setRfqStructure] = useState([])
  const [activeRfqItemId, setActiveRfqItemId] = useState(null)
  const [activeComponents, setActiveComponents] = useState([])
  const [loading, setLoading] = useState(false)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeResponse, setActiveResponse] = useState(null)
  const [revisions, setRevisions] = useState([])
  const [activeRevisionId, setActiveRevisionId] = useState(null)
  const [lines, setLines] = useState([])
  const [supplierPartOptions, setSupplierPartOptions] = useState([])
  const [supplierPartSearch, setSupplierPartSearch] = useState("")
  const [supplierPartLoading, setSupplierPartLoading] = useState(false)
  const [suggestedParts, setSuggestedParts] = useState([])
  const [suggestedPartsLoading, setSuggestedPartsLoading] = useState(false)
  const [priceHint, setPriceHint] = useState(null)
  const [approvedOnly, setApprovedOnly] = useState(false)

  const [createForm] = Form.useForm()
  const [revisionForm] = Form.useForm()
  const [lineForm] = Form.useForm()

  const formatDateOnly = (value) => {
    if (!value) return "—"
    try {
      return new Date(value).toLocaleDateString("ru-RU")
    } catch {
      return "—"
    }
  }

  const loadResponses = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/supplier-responses")
      setResponses(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить ответы")
    } finally {
      setLoading(false)
    }
  }

  const loadRfqs = async () => {
    try {
      const { data } = await axios.get("/rfqs")
      setRfqs(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadResponses()
    loadRfqs()
  }, [])

  useEffect(() => {
    if (!supplierPartSearch || supplierPartSearch.length < 2) {
      setSupplierPartOptions([])
      return
    }
    const timer = setTimeout(async () => {
      setSupplierPartLoading(true)
      try {
        const { data } = await axios.get("/supplier-parts/search-lite", {
          params: {
            q: supplierPartSearch,
            limit: 50,
            supplier_id: activeResponse?.supplier_id || undefined,
          },
        })
        const list = Array.isArray(data) ? data : []
        setSupplierPartOptions(
          list.map((item) => ({
            value: item.id,
            label: item.supplier_part_number
              ? `${item.supplier_part_number} — ${item.description || ""}${item.price ? ` · ${formatPriceWithCurrency(item.price, item.currency, { empty: "" })}` : ""}`.trim()
              : `Без номера — ${item.description || ""}${item.price ? ` · ${formatPriceWithCurrency(item.price, item.currency, { empty: "" })}` : ""}`.trim(),
            description: item.description || "",
            supplierName: item.supplier_name || "",
            meta: item,
          })),
        )
      } catch (e) {
        console.error(e)
      } finally {
        setSupplierPartLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [supplierPartSearch, activeResponse?.supplier_id])

  const loadSuggestedParts = async (originalPartId) => {
    if (!originalPartId || !activeResponse?.supplier_id) {
      setSuggestedParts([])
      return
    }
    setSuggestedPartsLoading(true)
    try {
      const { data } = await axios.get("/supplier-part-originals/of-original", {
        params: { original_part_id: originalPartId },
      })
      const list = Array.isArray(data) ? data : []
      setSuggestedParts(
        list.filter((item) => item.supplier_id === activeResponse.supplier_id),
      )
    } catch (e) {
      console.error(e)
      setSuggestedParts([])
    } finally {
      setSuggestedPartsLoading(false)
    }
  }

  const loadRfqSuppliers = async (rfqId) => {
    if (!rfqId) {
      setRfqSuppliers([])
      return
    }
    try {
      const { data } = await axios.get(`/rfqs/${rfqId}/suppliers`)
      setRfqSuppliers(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadRfqItems = async (rfqId) => {
    if (!rfqId) {
      setRfqItems([])
      return
    }
    try {
      const { data } = await axios.get(`/rfqs/${rfqId}/items`)
      setRfqItems(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadRfqStructure = async (rfqId) => {
    if (!rfqId) {
      setRfqStructure([])
      return
    }
    try {
      const { data } = await axios.get(`/rfqs/${rfqId}/structure`)
      setRfqStructure(Array.isArray(data?.items) ? data.items : [])
    } catch (e) {
      console.error(e)
    }
  }

  const rfqOptions = useMemo(
    () =>
      rfqs.map((r) => ({
        value: r.id,
        label: `${r.client_name || "Клиент"} · Rev ${r.rev_number || ""}`.trim(),
      })),
    [rfqs],
  )

  const rfqSupplierOptions = useMemo(
    () =>
      rfqSuppliers.map((rs) => ({
        value: rs.id,
        label: rs.supplier_name || "Поставщик",
      })),
    [rfqSuppliers],
  )

  const rfqItemOptions = useMemo(
    () =>
      rfqItems.map((item) => ({
        value: item.id,
        label: `${item.original_cat_number || "Без номера"} · ${item.client_description || ""} · ${item.requested_qty || 0} ${formatUomLabel(item.uom || "шт")}`.trim(),
      })),
    [rfqItems],
  )

  const rfqItemMap = useMemo(() => {
    const map = new Map()
    rfqItems.forEach((item) => map.set(item.id, item))
    return map
  }, [rfqItems])

  const rfqComponentsMap = useMemo(() => {
    const map = new Map()
    rfqStructure.forEach((item) => {
      map.set(item.rfq_item_id, item.components || [])
    })
    return map
  }, [rfqStructure])

  const formatRfqItemLabel = (item) =>
    `${item?.original_cat_number || "Без номера"} · ${item?.client_description || ""}`.trim()

  const supplierPartMetaMap = useMemo(() => {
    const map = new Map()
    supplierPartOptions.forEach((opt) => {
      if (opt?.meta) map.set(opt.value, opt.meta)
    })
    suggestedParts.forEach((item) => map.set(item.supplier_part_id, item))
    return map
  }, [supplierPartOptions, suggestedParts])

  const componentOptions = useMemo(
    () =>
      activeComponents
        .filter((c) => c.rfq_item_component_id)
        .map((c) => ({
          value: c.rfq_item_component_id,
          label: `${c.cat_number || "Без номера"} · ${c.description || ""}`.trim(),
          original_part_id: c.original_part_id,
        })),
    [activeComponents],
  )

  const componentHint =
    activeComponents.length && !componentOptions.length
      ? "Компоненты не сохранены. Пересоберите в RFQ."
      : null

  useEffect(() => {
    if (!activeRfqItemId) {
      setActiveComponents([])
      return
    }
    setActiveComponents(rfqComponentsMap.get(activeRfqItemId) || [])
  }, [activeRfqItemId, rfqComponentsMap])

  const applySupplierPartMeta = (meta) => {
    if (!meta) return
    const next = {
      supplier_part_id: meta.supplier_part_id || meta.id,
      price: meta.price ?? undefined,
      currency: meta.currency || undefined,
      lead_time_days: meta.lead_time_days ?? undefined,
      moq: meta.min_order_qty ?? undefined,
      packaging: meta.packaging || undefined,
    }
    if (meta.part_type === "OEM" || meta.part_type === "ANALOG") {
      next.offer_type = meta.part_type
    }
    lineForm.setFieldsValue(next)
    if (meta.price && meta.currency) {
      setPriceHint(`Последняя цена: ${formatPriceWithCurrency(meta.price, meta.currency)}`)
    } else {
      setPriceHint(null)
    }
  }

  const handleCreate = async (values) => {
    try {
      if (!values.rfq_supplier_id) {
        message.warning("Выберите RFQ и поставщика")
        return
      }
      await axios.post("/supplier-responses", {
        rfq_supplier_id: values.rfq_supplier_id,
      })
      message.success("Ответ создан")
      createForm.resetFields()
      loadResponses()
    } catch (e) {
      console.error(e)
      message.error("Не удалось создать ответ")
    }
  }

  const handleStatusChange = async (record, status) => {
    const nextStatus = normalizeResponseStatus(status)
    try {
      await axios.put(`/supplier-responses/${record.id}`, { status: nextStatus })
      setResponses((prev) =>
        prev.map((row) =>
          row.id === record.id ? { ...row, status: nextStatus } : row,
        ),
      )
      if (activeResponse?.id === record.id) {
        setActiveResponse((prev) => ({ ...prev, status: nextStatus }))
      }
      message.success("Статус обновлен")
    } catch (e) {
      console.error(e)
      message.error("Не удалось обновить статус")
    }
  }

  const openDrawer = async (record) => {
    setActiveResponse(record)
    setDrawerOpen(true)
    setSuggestedParts([])
    setPriceHint(null)
    setActiveRfqItemId(null)
    setActiveComponents([])
    await loadRevisions(record.id)
    if (record.rfq_id) {
      await loadRfqItems(record.rfq_id)
      await loadRfqStructure(record.rfq_id)
    }
  }

  const loadRevisions = async (responseId) => {
    try {
      const { data } = await axios.get(`/supplier-responses/${responseId}/revisions`)
      const list = Array.isArray(data) ? data : []
      setRevisions(list)
      const latest = list[0]?.id || null
      setActiveRevisionId(latest)
      if (latest) {
        await loadLines(latest)
      } else {
        setLines([])
      }
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить ревизии")
    }
  }

  const loadLines = async (revisionId) => {
    try {
      const { data } = await axios.get(
        `/supplier-responses/revisions/${revisionId}/lines`,
      )
      setLines(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить строки ответа")
    }
  }

  const handleAddRevision = async (values) => {
    if (!activeResponse?.id) return
    try {
      await axios.post(`/supplier-responses/${activeResponse.id}/revisions`, {
        note: values.note || null,
      })
      revisionForm.resetFields()
      await loadRevisions(activeResponse.id)
      message.success("Ревизия создана")
    } catch (e) {
      console.error(e)
      message.error("Не удалось создать ревизию")
    }
  }

  const handleAddLine = async (values) => {
    if (!activeRevisionId) return
    try {
      await axios.post(`/supplier-responses/revisions/${activeRevisionId}/lines`, {
        rfq_item_id: values.rfq_item_id,
        rfq_item_component_id: values.rfq_item_component_id || null,
        supplier_part_id: values.supplier_part_id || null,
        original_part_id: values.original_part_id || null,
        bundle_id: values.bundle_id || null,
        offer_type: values.offer_type || "UNKNOWN",
        offered_qty: values.offered_qty ?? null,
        moq: values.moq ?? null,
        packaging: values.packaging || null,
        lead_time_days: values.lead_time_days ?? null,
        price: values.price ?? null,
        currency: values.currency || null,
        validity_days: values.validity_days ?? null,
        note: values.note || null,
      })
      lineForm.resetFields()
      setPriceHint(null)
      await loadLines(activeRevisionId)
      if (activeResponse?.status === "received") {
        setActiveResponse((prev) => ({ ...prev, status: "review" }))
        setResponses((prev) =>
          prev.map((row) =>
            row.id === activeResponse?.id ? { ...row, status: "review" } : row,
          ),
        )
      }
      message.success("Строка добавлена")
    } catch (e) {
      console.error(e)
      message.error("Не удалось добавить строку")
    }
  }

  const responseColumns = [
    { title: "Поставщик", dataIndex: "supplier_name" },
    {
      title: "Статус",
      dataIndex: "status",
      width: 160,
      render: (value, record) => (
        <Select
          value={normalizeResponseStatus(value)}
          options={RESPONSE_STATUS_OPTIONS}
          size="small"
          style={{ width: 150 }}
          onChange={(status) => handleStatusChange(record, status)}
        />
      ),
    },
    {
      title: "Создано",
      dataIndex: "created_at",
      width: 140,
      render: formatDateOnly,
    },
  ]

  const filteredResponses = useMemo(() => {
    if (!approvedOnly) return responses
    return responses.filter(
      (row) => normalizeResponseStatus(row.status) === "approved",
    )
  }, [responses, approvedOnly])

  return (
    <PageWrapper
      title="Ответы поставщиков"
      helpText="Фиксируйте входящие предложения, ревизии и строки ответов."
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card title="Новый ответ" size="small">
          <Form form={createForm} layout="vertical" onFinish={handleCreate}>
            <Space wrap align="start">
              <Form.Item label="RFQ" name="rfq_id">
                <Select
                  style={{ width: 160 }}
                  options={rfqOptions}
                  onChange={(val) => {
                    createForm.setFieldsValue({ rfq_supplier_id: null })
                    loadRfqSuppliers(val)
                    loadRfqItems(val)
                  }}
                />
              </Form.Item>
              <Form.Item
                label="Поставщик"
                name="rfq_supplier_id"
                rules={[{ required: true, message: "Выберите поставщика" }]}
              >
                <Select style={{ width: 260 }} options={rfqSupplierOptions} />
              </Form.Item>
              <Form.Item label="Статус">
                <Text type="secondary">Получен (по умолчанию)</Text>
              </Form.Item>
              <Form.Item style={{ marginTop: 30 }}>
                <Button type="primary" htmlType="submit">
                  Создать
                </Button>
              </Form.Item>
            </Space>
          </Form>
        </Card>

        <Card
          title="Список ответов"
          size="small"
          extra={
            <Checkbox
              checked={approvedOnly}
              onChange={(e) => setApprovedOnly(e.target.checked)}
            >
              Только принятые
            </Checkbox>
          }
        >
          <Table
            rowKey="id"
            columns={responseColumns}
            dataSource={filteredResponses}
            loading={loading}
            pagination={{ pageSize: 20 }}
            rowClassName={(record) =>
              normalizeResponseStatus(record.status) === "approved"
                ? "response-approved-row"
                : ""
            }
            onRow={(record) => ({
              onClick: () => openDrawer(record),
            })}
          />
        </Card>
      </Space>

      <Drawer
        width={900}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={
          <Space>
            <span>Ответ поставщика</span>
            {activeResponse?.status ? (
              <Tag>{formatResponseStatus(activeResponse.status)}</Tag>
            ) : null}
          </Space>
        }
      >
        <Tabs
          defaultActiveKey="revisions"
          items={[
            {
              key: "revisions",
              label: "Ревизии",
              children: (
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Card size="small" title="Новая ревизия">
                    <Form form={revisionForm} onFinish={handleAddRevision}>
                      <Space wrap align="start">
                        <Form.Item label="Комментарий" name="note">
                          <Input style={{ width: 320 }} />
                        </Form.Item>
                        <Form.Item style={{ marginTop: 30 }}>
                          <Button type="primary" htmlType="submit">
                            Создать ревизию
                          </Button>
                        </Form.Item>
                      </Space>
                    </Form>
                  </Card>

                  <Table
                    rowKey="id"
                    dataSource={revisions}
                    pagination={false}
                    columns={[
                      { title: "Rev", dataIndex: "rev_number", width: 70 },
                      { title: "Комментарий", dataIndex: "note" },
                      {
                        title: "Создано",
                        dataIndex: "created_at",
                        width: 140,
                        render: formatDateOnly,
                      },
                    ]}
                    onRow={(record) => ({
                      onClick: async () => {
                        setActiveRevisionId(record.id)
                        await loadLines(record.id)
                      },
                    })}
                  />
                </Space>
              ),
            },
            {
              key: "lines",
              label: "Строки ответа",
              children: (
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Card size="small" title="Добавить строку">
                    <Form form={lineForm} onFinish={handleAddLine} layout="vertical">
                      <Space wrap align="start">
                        <Form.Item
                          label="Строка RFQ"
                          name="rfq_item_id"
                          tooltip="Выберите позицию из RFQ"
                          rules={[{ required: true, message: "Выберите строку" }]}
                        >
                          <Select
                            style={{ width: 240 }}
                            options={rfqItemOptions}
                            onChange={(val) => {
                              const item = rfqItemMap.get(val)
                              setActiveRfqItemId(val)
                              const components = rfqComponentsMap.get(val) || []
                              const defaultComponent =
                                components.length === 1 ? components[0] : null
                              const originalPartId =
                                defaultComponent?.original_part_id ||
                                item?.original_part_id ||
                                undefined
                              if (item) {
                                lineForm.setFieldsValue({
                                  offered_qty: item.requested_qty,
                                  original_part_id: originalPartId,
                                  rfq_item_component_id:
                                    defaultComponent?.rfq_item_component_id || null,
                                  offer_type: item.oem_only ? "OEM" : undefined,
                                })
                                loadSuggestedParts(originalPartId)
                              }
                            }}
                          />
                        </Form.Item>
                        <Form.Item
                          label="Компонент"
                          name="rfq_item_component_id"
                          extra={componentHint}
                        >
                          <Select
                            style={{ width: 240 }}
                            allowClear
                            options={componentOptions}
                            onChange={(val) => {
                              const component = componentOptions.find(
                                (opt) => opt.value === val,
                              )
                              if (component?.original_part_id) {
                                lineForm.setFieldsValue({
                                  original_part_id: component.original_part_id,
                                })
                                loadSuggestedParts(component.original_part_id)
                              }
                            }}
                          />
                        </Form.Item>
                        <Form.Item
                          label="Деталь поставщика"
                          name="supplier_part_id"
                          tooltip="Начните вводить номер детали поставщика"
                        >
                          <Select
                            style={{ width: 220 }}
                            showSearch
                            allowClear
                            filterOption={false}
                            onSearch={setSupplierPartSearch}
                            notFoundContent={supplierPartLoading ? "Поиск..." : "Нет совпадений"}
                            options={supplierPartOptions.map((opt) => ({
                              value: opt.value,
                              label: opt.label,
                              title: `${opt.supplierName} ${opt.description}`.trim() || undefined,
                            }))}
                            optionLabelProp="label"
                            onChange={(value) => {
                              if (!value) {
                                setPriceHint(null)
                                return
                              }
                              applySupplierPartMeta(supplierPartMetaMap.get(value))
                            }}
                          />
                        </Form.Item>
                        <Form.Item label="Рекомендации">
                          <Select
                            style={{ width: 220 }}
                            loading={suggestedPartsLoading}
                            placeholder="Нет связей"
                            options={suggestedParts.map((item) => ({
                              value: item.supplier_part_id,
                              label: item.supplier_part_number
                                ? `${item.supplier_part_number} — ${item.description || ""}${item.price ? ` · ${formatPriceWithCurrency(item.price, item.currency, { empty: "" })}` : ""}`.trim()
                                : `Без номера — ${item.description || ""}${item.price ? ` · ${formatPriceWithCurrency(item.price, item.currency, { empty: "" })}` : ""}`.trim(),
                            }))}
                            onChange={(value) => {
                              applySupplierPartMeta(supplierPartMetaMap.get(value))
                            }}
                          />
                        </Form.Item>
                        <Form.Item name="original_part_id" hidden>
                          <InputNumber />
                        </Form.Item>
                        <Form.Item name="bundle_id" hidden>
                          <InputNumber />
                        </Form.Item>
                        <Form.Item label="Тип" name="offer_type" initialValue="UNKNOWN">
                          <Select style={{ width: 140 }} options={OFFER_OPTIONS} />
                        </Form.Item>
                        <Form.Item label="Кол-во" name="offered_qty">
                          <InputNumber style={{ width: 120 }} min={0} />
                        </Form.Item>
                        <Form.Item label="MOQ" name="moq">
                          <InputNumber style={{ width: 100 }} min={0} />
                        </Form.Item>
                        <Form.Item label="Упаковка" name="packaging">
                          <Input style={{ width: 140 }} />
                        </Form.Item>
                        <Form.Item label="Срок, дней" name="lead_time_days">
                          <InputNumber style={{ width: 110 }} min={0} />
                        </Form.Item>
                        <Form.Item label="Цена" name="price" extra={priceHint || null}>
                          <InputNumber style={{ width: 120 }} min={0} />
                        </Form.Item>
                        <Form.Item label="Валюта" name="currency">
                          <Select
                            style={{ width: 140 }}
                            showSearch
                            allowClear
                            options={CURRENCY_OPTIONS}
                            optionFilterProp="label"
                            placeholder="Валюта"
                          />
                        </Form.Item>
                        <Form.Item label="Срок валидности" name="validity_days">
                          <InputNumber style={{ width: 120 }} min={0} />
                        </Form.Item>
                        <Form.Item label="Комментарий" name="note">
                          <Input style={{ width: 200 }} />
                        </Form.Item>
                        <Form.Item style={{ marginTop: 30 }}>
                          <Button type="primary" htmlType="submit" disabled={!activeRevisionId}>
                            Добавить
                          </Button>
                        </Form.Item>
                      </Space>
                    </Form>
                  </Card>

                  <Select
                    value={activeRevisionId}
                    onChange={async (val) => {
                      setActiveRevisionId(val)
                      await loadLines(val)
                    }}
                    options={revisions.map((rev) => ({
                      value: rev.id,
                      label: `Rev ${rev.rev_number}`,
                    }))}
                    placeholder="Выберите ревизию"
                    style={{ width: 200 }}
                  />
                  <Table
                    rowKey="id"
                    dataSource={lines}
                    pagination={false}
                    columns={[
                      {
                        title: "Строка RFQ",
                        dataIndex: "rfq_item_id",
                        width: 220,
                        render: (v) => {
                          const item = rfqItemMap.get(v)
                          return item ? formatRfqItemLabel(item) : "—"
                        },
                      },
                      {
                        title: "Компонент",
                        dataIndex: "component_cat_number",
                        width: 200,
                        render: (v, record) => {
                          const desc =
                            record.component_description_ru ||
                            record.component_description_en ||
                            ""
                          if (!v && !desc) return "—"
                          return (
                            <div>
                              <div>{v || "—"}</div>
                              <Text type="secondary">{desc || "—"}</Text>
                            </div>
                          )
                        },
                      },
                      {
                        title: "Деталь поставщика",
                        dataIndex: "supplier_part_number",
                        width: 160,
                        render: (v) => v || "—",
                      },
                      { title: "Тип", dataIndex: "offer_type", width: 90 },
                      { title: "Кол-во", dataIndex: "offered_qty", width: 90 },
                      {
                        title: "Цена",
                        dataIndex: "price",
                        width: 140,
                        render: (v, r) => formatPriceWithCurrency(v, r?.currency),
                      },
                      { title: "Валюта", dataIndex: "currency", width: 90 },
                    ]}
                  />
                </Space>
              ),
            },
          ]}
        />
      </Drawer>
    </PageWrapper>
  )
}
