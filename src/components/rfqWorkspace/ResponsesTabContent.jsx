import React, { useMemo, useState } from "react"
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd"
import dayjs from "dayjs"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"

const { Text } = Typography

const acceptedSourceSuffix = (row) => {
  const explicitSource = String(row.line_source_type || "").toUpperCase()
  if (explicitSource === "PRICE_LIST") return " (Прайс-лист)"
  if (explicitSource === "RFQ") return " (RFQ)"

  const note = String(row.note || "").toLowerCase()
  if (!note) return ""
  if (note.includes("прайс") || note.includes("price list")) return " (Прайс-лист)"
  if (note.includes("rfq")) return " (RFQ)"
  return ""
}

const formatSourceLabel = (row) => {
  if (Number(row.accepted_from_existing_price) === 1) {
    return `Принятая цена${acceptedSourceSuffix(row)}`
  }
  const source = String(row.entry_source || "").toUpperCase()
  if (source === "SUPPLIER_FILE") return "Файл поставщика"
  if (source === "SUPPLIER_MANUAL") return "Вручную"
  if (source === "NEGOTIATION") return "Переговоры"
  if (source === "SYSTEM_IMPORT") return "Системный импорт"
  if (source === "ACCEPTED_EXISTING") return `Принятая цена${acceptedSourceSuffix(row)}`
  return "Ответ поставщика"
}

const sourceTagColor = (row) => {
  if (Number(row.accepted_from_existing_price) === 1) return "green"
  const source = String(row.entry_source || "").toUpperCase()
  if (source === "NEGOTIATION") return "gold"
  if (source === "SUPPLIER_MANUAL") return "blue"
  return "geekblue"
}

const getRequestedOriginalCat = (row) => {
  if (Number(row?.accepted_from_existing_price) === 1) {
    return row?.component_cat_number || row?.response_original_cat_number || row?.original_cat_number || row?.requested_original_cat_number || "—"
  }
  return row?.component_cat_number || row?.requested_original_cat_number || row?.response_original_cat_number || row?.original_cat_number || "—"
}

const getRequestedOriginalDesc = (row) => {
  if (Number(row?.accepted_from_existing_price) === 1) {
    return (
      row?.component_description_ru ||
      row?.response_original_description_ru ||
      row?.requested_original_description_ru ||
      row?.component_description_en ||
      row?.response_original_description_en ||
      row?.requested_original_description_en ||
      row?.client_description ||
      "—"
    )
  }
  return (
    row?.component_description_ru ||
    row?.requested_original_description_ru ||
    row?.component_description_en ||
    row?.requested_original_description_en ||
    row?.response_original_description_ru ||
    row?.response_original_description_en ||
    row?.client_description ||
    "—"
  )
}

export default function ResponsesTabContent({
  activeRfqId,
  suppliers,
  items,
  responseSuppliers,
  responseSupplierFilter,
  setResponseSupplierFilter,
  reloadResponses,
  showArchivedResponses,
  setShowArchivedResponses,
  importModal,
  setImportModal,
  filteredResponseLines,
  formatDate,
}) {
  const [viewMode, setViewMode] = useState("supplier")
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [manualSaving, setManualSaving] = useState(false)
  const [negotiationModal, setNegotiationModal] = useState({
    open: false,
    row: null,
    saving: false,
  })
  const [manualForm] = Form.useForm()
  const [negotiationForm] = Form.useForm()
  const [createSupplierPart, setCreateSupplierPart] = useState(false)

  const lineOptions = useMemo(
    () =>
      (Array.isArray(items) ? items : []).map((it) => ({
        value: Number(it.id || it.rfq_item_id),
        label: `${it.line_number || "?"} · ${it.original_cat_number || "-"} · ${
          it.client_description || it.original_description_ru || it.original_description_en || ""
        }`,
      })),
    [items]
  )

  const supplierOptions = useMemo(
    () =>
      (Array.isArray(suppliers) ? suppliers : []).map((s) => ({
        value: Number(s.supplier_id),
        label: s.supplier_name || `Поставщик #${s.supplier_id}`,
      })),
    [suppliers]
  )

  const responseTimeline = useMemo(() => {
    const byKey = new Map()
    filteredResponseLines.forEach((r) => {
      const key = [
        Number(r.supplier_id) || 0,
        Number(r.rfq_line_number) || Number(r.rfq_item_id) || 0,
        String(getRequestedOriginalCat(r)),
      ].join(":")
      if (!byKey.has(key)) byKey.set(key, [])
      byKey.get(key).push(r)
    })
    byKey.forEach((list) =>
      list.sort(
        (a, b) =>
          (b.response_rev_number || 0) - (a.response_rev_number || 0) ||
          dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf()
      )
    )
    return byKey
  }, [filteredResponseLines])

  const byOriginalRows = useMemo(
    () =>
      [...filteredResponseLines].sort((a, b) => {
        const aOrig = String(getRequestedOriginalCat(a))
        const bOrig = String(getRequestedOriginalCat(b))
        if (aOrig !== bOrig) return aOrig.localeCompare(bOrig)
        const aPrice = Number(a.price)
        const bPrice = Number(b.price)
        if (Number.isFinite(aPrice) && Number.isFinite(bPrice) && aPrice !== bPrice) {
          return aPrice - bPrice
        }
        return String(a.supplier_name || "").localeCompare(String(b.supplier_name || ""))
      }),
    [filteredResponseLines]
  )

  const openManualModal = () => {
    manualForm.resetFields()
    setCreateSupplierPart(false)
    manualForm.setFieldsValue({
      supplier_id: responseSupplierFilter || undefined,
      currency: "EUR",
      offer_type: "UNKNOWN",
      new_revision: false,
    })
    setManualModalOpen(true)
  }

  const submitManualLine = async () => {
    try {
      const values = await manualForm.validateFields()
      const payload = {
        rfq_id: Number(activeRfqId),
        supplier_id: Number(values.supplier_id),
        rfq_item_id: Number(values.rfq_item_id),
        price: Number(values.price),
        currency: String(values.currency || "").toUpperCase(),
        offer_type: values.offer_type || "UNKNOWN",
        lead_time_days: values.lead_time_days ?? null,
        moq: values.moq ?? null,
        packaging: values.packaging || null,
        validity_days: values.validity_days ?? null,
        payment_terms: values.payment_terms || null,
        note: values.note || null,
        change_reason: values.change_reason || null,
        new_revision: values.new_revision === true,
        supplier_part_id: values.supplier_part_id || null,
      }
      if (createSupplierPart) {
        payload.supplier_part = {
          supplier_part_number: values.new_supplier_part_number || null,
          description_ru: values.new_supplier_part_description_ru || null,
          description_en: values.new_supplier_part_description_en || null,
          part_type: values.new_supplier_part_type || payload.offer_type,
        }
      }

      setManualSaving(true)
      await axios.post("/supplier-responses/manual-line", payload)
      message.success("Ответ добавлен")
      setManualModalOpen(false)
      manualForm.resetFields()
      await reloadResponses()
    } catch (e) {
      if (e?.errorFields) return
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось добавить ответ")
    } finally {
      setManualSaving(false)
    }
  }

  const openNegotiationModal = (row) => {
    setNegotiationModal({ open: true, row, saving: false })
    negotiationForm.setFieldsValue({
      price: row.price,
      currency: row.currency || "EUR",
      offer_type: row.offer_type || "UNKNOWN",
      lead_time_days: row.lead_time_days,
      moq: row.moq,
      packaging: row.packaging,
      validity_days: row.validity_days,
      payment_terms: row.payment_terms,
      note: row.note,
      reason: "",
      new_revision: true,
    })
  }

  const submitNegotiation = async () => {
    const row = negotiationModal.row
    if (!row?.id) return
    try {
      const values = await negotiationForm.validateFields()
      setNegotiationModal((prev) => ({ ...prev, saving: true }))
      await axios.post(`/supplier-responses/lines/${row.id}/revise`, {
        price: Number(values.price),
        currency: String(values.currency || "").toUpperCase(),
        offer_type: values.offer_type || "UNKNOWN",
        lead_time_days: values.lead_time_days ?? null,
        moq: values.moq ?? null,
        packaging: values.packaging || null,
        validity_days: values.validity_days ?? null,
        payment_terms: values.payment_terms || null,
        note: values.note || null,
        reason: values.reason,
        new_revision: values.new_revision !== false,
      })
      message.success("Изменение по переговорам сохранено")
      setNegotiationModal({ open: false, row: null, saving: false })
      negotiationForm.resetFields()
      await reloadResponses()
    } catch (e) {
      if (e?.errorFields) return
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось сохранить переговорную правку")
      setNegotiationModal((prev) => ({ ...prev, saving: false }))
    }
  }

  const commonColumns = [
    { title: "Поставщик", dataIndex: "supplier_name", width: 220 },
    {
      title: "Источник ответа",
      width: 160,
      render: (_, r) => <Tag color={sourceTagColor(r)}>{formatSourceLabel(r)}</Tag>,
    },
    { title: "Rev", dataIndex: "response_rev_number", width: 70 },
    {
      title: "Строка",
      width: 90,
      render: (_, r) => <Text>{r.rfq_line_number || r.rfq_item_id || "—"}</Text>,
    },
    {
      title: "Оригинал",
      width: 130,
      render: (_, r) => getRequestedOriginalCat(r),
    },
    {
      title: "Описание",
      render: (_, r) => getRequestedOriginalDesc(r),
    },
    {
      title: "Цена",
      width: 130,
      render: (_, r) => (r.price != null ? formatPriceWithCurrency(r.price, r.currency) : "—"),
    },
    { title: "Тип", dataIndex: "offer_type", width: 80 },
    { title: "Срок, дн", dataIndex: "lead_time_days", width: 90 },
    { title: "MOQ", dataIndex: "moq", width: 90 },
    { title: "Упаковка", dataIndex: "packaging", width: 120 },
    { title: "PN поставщика", dataIndex: "supplier_part_number", width: 150 },
    {
      title: "Причина/коммент.",
      width: 220,
      render: (_, r) => r.change_reason || r.note || "—",
    },
    { title: "Создано", dataIndex: "created_at", width: 120, render: formatDate },
    {
      title: "Действия",
      width: 130,
      fixed: "right",
      render: (_, r) => (
        <Button size="small" onClick={() => openNegotiationModal(r)}>
          Переговоры
        </Button>
      ),
    },
  ]

  const originalViewColumns = [
    {
      title: "Оригинал",
      width: 160,
      render: (_, r) => getRequestedOriginalCat(r),
    },
    {
      title: "Строка",
      width: 90,
      render: (_, r) => <Text>{r.rfq_line_number || r.rfq_item_id || "—"}</Text>,
    },
    { title: "Поставщик", dataIndex: "supplier_name", width: 220 },
    {
      title: "Источник",
      width: 160,
      render: (_, r) => <Tag color={sourceTagColor(r)}>{formatSourceLabel(r)}</Tag>,
    },
    { title: "Rev", dataIndex: "response_rev_number", width: 70 },
    {
      title: "Цена",
      width: 130,
      render: (_, r) => (r.price != null ? formatPriceWithCurrency(r.price, r.currency) : "—"),
    },
    { title: "Срок, дн", dataIndex: "lead_time_days", width: 90 },
    { title: "MOQ", dataIndex: "moq", width: 90 },
    { title: "PN поставщика", dataIndex: "supplier_part_number", width: 150 },
    { title: "Создано", dataIndex: "created_at", width: 120, render: formatDate },
    {
      title: "Действия",
      width: 130,
      fixed: "right",
      render: (_, r) => (
        <Button size="small" onClick={() => openNegotiationModal(r)}>
          Переговоры
        </Button>
      ),
    },
  ]

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="Ответы поставщиков и принятые цены. Можно добавлять вручную и вести переговорные изменения по ревизиям."
      />
      <Space wrap>
        <Select
          allowClear
          placeholder="Фильтр по поставщику"
          options={responseSuppliers}
          style={{ minWidth: 260 }}
          value={responseSupplierFilter}
          onChange={(v) => setResponseSupplierFilter(v || null)}
        />
        <Button onClick={reloadResponses}>Обновить ответы</Button>
        <Checkbox
          checked={showArchivedResponses}
          onChange={(e) => setShowArchivedResponses(e.target.checked)}
        >
          Показывать архивные
        </Checkbox>
        <Radio.Group
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value)}
          optionType="button"
          buttonStyle="solid"
          options={[
            { label: "По поставщику", value: "supplier" },
            { label: "По оригиналу", value: "original" },
          ]}
        />
        <Button onClick={openManualModal}>Добавить вручную</Button>
        <Checkbox
          checked={importModal.newRevision || false}
          onChange={(e) =>
            setImportModal((prev) => ({ ...prev, newRevision: e.target.checked }))
          }
        >
          Новая ревизия при импорте
        </Checkbox>
        <Button
          onClick={() =>
            setImportModal({
              open: true,
              supplierId: responseSupplierFilter || null,
              text: "",
              rows: [],
              loading: false,
              fileName: "",
              newRevision: false,
            })
          }
        >
          Импорт ответов (TSV)
        </Button>
      </Space>

      <Table
        rowKey={(row) => `${row.id}-${row.response_rev_number}-${row.rfq_item_id}`}
        dataSource={viewMode === "supplier" ? filteredResponseLines : byOriginalRows}
        pagination={false}
        size="small"
        scroll={{ x: 1900 }}
        columns={viewMode === "supplier" ? commonColumns : originalViewColumns}
      />

      <Card size="small" title="Таймлайн по строкам (ревизии ответов)">
        {[...responseTimeline.entries()].map(([key, list]) => (
          <div key={key} style={{ marginBottom: 12 }}>
            <Text strong>
              {(list[0]?.supplier_name || `Поставщик #${list[0]?.supplier_id || "?"}`) +
                ` · Строка ${list[0]?.rfq_line_number || list[0]?.rfq_item_id || "?"}` +
                ` · ${getRequestedOriginalCat(list[0])}`}
            </Text>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
              {list.map((r) => (
                <Tag key={`${r.id}`} color={sourceTagColor(r)}>
                  {formatSourceLabel(r)} · Rev {r.response_rev_number || "?"}:{" "}
                  {r.price != null ? formatPriceWithCurrency(r.price, r.currency) : "—"} ·
                  {r.lead_time_days ? ` ${r.lead_time_days}дн` : ""} · {formatDate(r.created_at)}
                  {r.change_reason ? ` · ${r.change_reason}` : ""}
                </Tag>
              ))}
            </div>
          </div>
        ))}
        {!responseTimeline.size && <Text type="secondary">Пока нет ответов</Text>}
      </Card>

      <Modal
        open={manualModalOpen}
        title="Добавить ответ вручную"
        onCancel={() => setManualModalOpen(false)}
        onOk={submitManualLine}
        okText="Сохранить"
        confirmLoading={manualSaving}
      >
        <Form layout="vertical" form={manualForm}>
          <Form.Item
            name="supplier_id"
            label="Поставщик"
            rules={[{ required: true, message: "Выберите поставщика" }]}
          >
            <Select options={supplierOptions} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item
            name="rfq_item_id"
            label="Строка RFQ"
            rules={[{ required: true, message: "Выберите строку" }]}
          >
            <Select options={lineOptions} showSearch optionFilterProp="label" />
          </Form.Item>
          <Space style={{ display: "flex" }} align="start">
            <Form.Item
              name="price"
              label="Цена"
              rules={[{ required: true, message: "Введите цену" }]}
            >
              <InputNumber min={0} step={0.01} />
            </Form.Item>
            <Form.Item
              name="currency"
              label="Валюта"
              rules={[{ required: true, message: "Введите валюту" }]}
            >
              <Input style={{ width: 90 }} />
            </Form.Item>
            <Form.Item name="offer_type" label="Тип">
              <Select
                style={{ width: 130 }}
                options={[
                  { value: "UNKNOWN", label: "UNKNOWN" },
                  { value: "OEM", label: "OEM" },
                  { value: "ANALOG", label: "ANALOG" },
                ]}
              />
            </Form.Item>
          </Space>
          <Space style={{ display: "flex" }} align="start">
            <Form.Item name="lead_time_days" label="Срок, дн">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="moq" label="MOQ">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="validity_days" label="Валидн., дн">
              <InputNumber min={0} />
            </Form.Item>
          </Space>
          <Form.Item name="packaging" label="Упаковка">
            <Input />
          </Form.Item>
          <Form.Item name="payment_terms" label="Условия оплаты">
            <Input />
          </Form.Item>
          <Form.Item name="note" label="Комментарий">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="change_reason" label="Причина (опционально)">
            <Input placeholder="Например: ответ получен по email/PDF" />
          </Form.Item>
          <Form.Item name="new_revision" valuePropName="checked">
            <Checkbox>Создать новую ревизию ответа</Checkbox>
          </Form.Item>
          <Form.Item name="supplier_part_id" label="ID детали поставщика (если уже есть)">
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item>
            <Checkbox checked={createSupplierPart} onChange={(e) => setCreateSupplierPart(e.target.checked)}>
              Создать новую деталь поставщика и привязать к оригиналу строки
            </Checkbox>
          </Form.Item>
          {createSupplierPart ? (
            <>
              <Form.Item
                name="new_supplier_part_number"
                label="Кат. номер поставщика"
                rules={[{ required: true, message: "Введите кат. номер" }]}
              >
                <Input />
              </Form.Item>
              <Form.Item name="new_supplier_part_description_ru" label="Описание RU">
                <Input />
              </Form.Item>
              <Form.Item name="new_supplier_part_description_en" label="Описание EN">
                <Input />
              </Form.Item>
              <Form.Item name="new_supplier_part_type" label="Тип детали">
                <Select
                  options={[
                    { value: "UNKNOWN", label: "UNKNOWN" },
                    { value: "OEM", label: "OEM" },
                    { value: "ANALOG", label: "ANALOG" },
                  ]}
                />
              </Form.Item>
            </>
          ) : null}
        </Form>
      </Modal>

      <Modal
        open={negotiationModal.open}
        title="Переговорная правка ответа"
        onCancel={() => setNegotiationModal({ open: false, row: null, saving: false })}
        onOk={submitNegotiation}
        okText="Сохранить ревизию"
        confirmLoading={negotiationModal.saving}
      >
        <Form layout="vertical" form={negotiationForm}>
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message="Будет создана новая версия ответа по выбранной строке"
          />
          <Space style={{ display: "flex" }} align="start">
            <Form.Item
              name="price"
              label="Цена"
              rules={[{ required: true, message: "Введите цену" }]}
            >
              <InputNumber min={0} step={0.01} />
            </Form.Item>
            <Form.Item
              name="currency"
              label="Валюта"
              rules={[{ required: true, message: "Введите валюту" }]}
            >
              <Input style={{ width: 90 }} />
            </Form.Item>
            <Form.Item name="offer_type" label="Тип">
              <Select
                style={{ width: 130 }}
                options={[
                  { value: "UNKNOWN", label: "UNKNOWN" },
                  { value: "OEM", label: "OEM" },
                  { value: "ANALOG", label: "ANALOG" },
                ]}
              />
            </Form.Item>
          </Space>
          <Space style={{ display: "flex" }} align="start">
            <Form.Item name="lead_time_days" label="Срок, дн">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="moq" label="MOQ">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="validity_days" label="Валидн., дн">
              <InputNumber min={0} />
            </Form.Item>
          </Space>
          <Form.Item name="packaging" label="Упаковка">
            <Input />
          </Form.Item>
          <Form.Item name="payment_terms" label="Условия оплаты">
            <Input />
          </Form.Item>
          <Form.Item name="note" label="Комментарий">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="reason"
            label="Причина изменения (обязательно)"
            rules={[{ required: true, message: "Укажите причину переговорной правки" }]}
          >
            <Input placeholder="Например: согласована скидка после звонка" />
          </Form.Item>
          <Form.Item name="new_revision" valuePropName="checked">
            <Checkbox>Создать новую ревизию ответа</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}
