import React, { useEffect, useMemo, useState, useCallback } from "react"
import {
  Drawer,
  Space,
  Button,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Tabs,
  Table,
  Tag,
  message,
  Tooltip,
  Divider,
} from "antd"
import dayjs from "dayjs"
import axios from "@/api/axiosInstance"
import OriginalsPickerDrawer from "@/components/supplierParts/OriginalsPickerDrawer"
import ClientPickerDrawer from "./ClientPickerDrawer"
import HistoryTimeline from "./HistoryTimeline"
import ShippingAddressPicker from "./ShippingAddressPicker"
import BillingAddressPicker from "@/components/clients/BillingAddressPicker"
import IncotermsSelect from "@/components/inputs/IncotermsSelect"
import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction"
import { Alert, Typography } from "antd"
import BankDetailsModal from "./BankDetailsModal"
import ProposalPreviewModal from "./ProposalPreviewModal"

const { Text } = Typography

const ITEM_STATUS_META = {
  open: { color: "default", label: "Открыта" },
  sourcing: { color: "processing", label: "В подборе" },
  proposed: { color: "blue", label: "Предложена" },
  approved: { color: "success", label: "Утверждена" },
  rejected: { color: "error", label: "Отклонена" },
  rework: { color: "orange", label: "Доработка" },
}

export default function OrderDrawer({
  open,
  onClose,
  orderId,
  initialOrder,
  onSaved,
  viewRole,
}) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [order, setOrder] = useState(initialOrder || null)
  const [items, setItems] = useState([])
  const [events, setEvents] = useState([])
  const [clientPickerOpen, setClientPickerOpen] = useState(false)
  const [partsPickerOpen, setPartsPickerOpen] = useState(false)
  const [bankOptions, setBankOptions] = useState([])
  const [bankLoading, setBankLoading] = useState(false)
  const [selectedBankId, setSelectedBankId] = useState(null)
  const [shippingPickerOpen, setShippingPickerOpen] = useState(false)
  const [billingPickerOpen, setBillingPickerOpen] = useState(false)
  const [bankModalOpen, setBankModalOpen] = useState(false)
  const [proposalOpen, setProposalOpen] = useState(false)
  const [responsibleOptions, setResponsibleOptions] = useState([])
  const [editingItemId, setEditingItemId] = useState(null)
  const [activeTab, setActiveTab] = useState("info")

  const effectiveOrderId = orderId || order?.id || null
  const isNew = !effectiveOrderId

  const loadDetail = useCallback(async (targetId) => {
    const id = targetId || effectiveOrderId
    if (!id) return
    setLoading(true)
    try {
      const { data } = await axios.get(`/client-orders/${id}`)
      setOrder(data?.order || null)
      setItems(Array.isArray(data?.items) ? data.items : [])
      setEvents(Array.isArray(data?.events) ? data.events : [])
      setEditingItemId(null)
      form.setFieldsValue({
        ...data?.order,
        requested_delivery_date: data?.order?.requested_delivery_date
          ? dayjs(data.order.requested_delivery_date)
          : null,
      })
      if (data?.order?.client_id) {
        fetchBanks(data.order.client_id)
      }
    } catch (e) {
      console.error("load order error", e)
      message.error("Не удалось загрузить заказ")
    } finally {
      setLoading(false)
    }
  }, [effectiveOrderId, form])

  useEffect(() => {
    if (open) {
      setActiveTab("info")
    }
    if (!open) return
    fetchResponsibleUsers()
    if (effectiveOrderId) {
      loadDetail(effectiveOrderId)
      return
    }
    setOrder(null)
    setItems([])
    form.resetFields()
    setBankOptions([])
    setSelectedBankId(null)
  }, [open, effectiveOrderId, loadDetail, form])

  const fetchBanks = async (clientId) => {
    if (!clientId) {
      setBankOptions([])
      setSelectedBankId(null)
      return
    }
    setBankLoading(true)
    try {
      const { data } = await axios.get("/client-bank-details", {
        params: { client_id: clientId },
      })
      const list = Array.isArray(data) ? data : []
      setBankOptions(list)
      const first = list[0]
      if (first) {
        setSelectedBankId(first.id)
        form.setFieldsValue({
          currency: first.currency || form.getFieldValue("currency"),
        })
      }
    } catch (e) {
      console.error("load banks error", e)
    } finally {
      setBankLoading(false)
    }
  }

  const fetchResponsibleUsers = async () => {
    try {
      const { data } = await axios.get("/client-orders/responsible-users")
      const list = Array.isArray(data) ? data : []
      setResponsibleOptions(list)
    } catch (e) {
      console.error("load responsible users error", e)
    }
  }

  const focusItemsTab = (openPicker = false) => {
    setActiveTab("items")
    if (openPicker) setPartsPickerOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const clientId = order?.client_id || values.client_id
      const payload = {
        client_id: clientId,
        order_number: values.order_number,
        contact_name: values.contact_name,
        contact_email: values.contact_email,
        contact_phone: values.contact_phone,
        billing_address_id: values.billing_address_id || null,
        shipping_address_id: values.shipping_address_id || null,
        comment_internal: values.comment_internal,
        comment_client: values.comment_client,
        requested_delivery_date: values.requested_delivery_date
          ? values.requested_delivery_date.format("YYYY-MM-DD")
          : null,
        status: values.status,
        currency: values.currency,
        incoterms: values.incoterms,
        payment_terms: values.payment_terms,
        client_po_number: values.client_po_number,
        responsible_user_id: values.responsible_user_id || null,
      }
      const itemsPayload = items.map((it, idx) => ({
        original_part_id: it.original_part_id || it.id,
        requested_qty: it.requested_qty || 1,
        uom: it.uom || "pcs",
        required_date: it.required_date || null,
        client_comment: it.client_comment || null,
        internal_comment: it.internal_comment || null,
        line_number: it.line_number || idx + 1,
        status: it.status || "open",
      }))

      if (isNew) {
        if (!payload.client_id) {
          message.warning("Выберите клиента")
          return
        }
        if (!payload.order_number) {
          message.warning("Укажите номер заказа")
          return
        }
        if (!itemsPayload.length) {
          const { confirmed } = await confirmAction({
            title: "Создать заказ без позиций?",
            text: "Позиции и офферы можно добавить позже на вкладке «Строки и офферы».",
            confirmLabel: "Создать",
            cancelLabel: "Добавить позиции",
          })
          if (!confirmed) {
            focusItemsTab(true)
            return
          }
        }
        const requestBody = itemsPayload.length
          ? { ...payload, items: itemsPayload }
          : { ...payload }

        setSaving(true)
        const { data } = await axios.post("/client-orders", requestBody)
        setOrder(data.order)
        setItems(data.items || [])
        setEvents(data.events || [])
        message.success("Заказ создан")
        onSaved?.()
        if (!itemsPayload.length) {
          message.info("Добавьте позиции и офферы на вкладке «Строки и офферы».")
          focusItemsTab(true)
        }
      } else {
        setSaving(true)
        await axios.put(`/client-orders/${effectiveOrderId}`, payload)
        message.success("Заказ сохранён")
        onSaved?.()
        loadDetail()
      }
    } catch (e) {
      if (e?.errorFields) return
      console.error("save order error", e)
      const msg = e?.response?.data?.message || "Не удалось сохранить заказ"
      message.error(msg)
      if (isNew && !items.length) {
        const lower = String(msg).toLowerCase()
        if (
          lower.includes("позици") ||
          lower.includes("строк") ||
          lower.includes("item") ||
          lower.includes("offer") ||
          lower.includes("оффер")
        ) {
          focusItemsTab(true)
        }
      }
    } finally {
      setSaving(false)
    }
  }

  const handleAddItems = async (picked) => {
    if (!picked?.length) return
    const mapped = picked.map((p) => ({
      temp: true,
      local_id: `tmp_${Date.now()}_${p.id}`,
      original_part_id: p.id,
      cat_number: p.cat_number,
      description_ru: p.description_ru,
      description_en: p.description_en,
      requested_qty: 1,
      uom: (p.uom && String(p.uom).toLowerCase()) || "pcs",
      status: "open",
    }))
    if (!effectiveOrderId) {
      setItems((prev) => [...prev, ...mapped])
      if (mapped[0]) setEditingItemId(mapped[0].local_id)
      return
    }
    setLoading(true)
    try {
      for (const item of mapped) {
        await axios.post(`/client-orders/${effectiveOrderId}/items`, {
          original_part_id: item.original_part_id,
          requested_qty: item.requested_qty,
          uom: item.uom,
          status: item.status,
        })
      }
      message.success(`Добавлено позиций: ${mapped.length}`)
      await loadDetail(effectiveOrderId)
    } catch (e) {
      console.error("bulk add items error", e)
      message.error("Не удалось добавить позиции")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveItem = useCallback(
    async (item) => {
      if (!order?.id) {
        setItems((prev) =>
          prev.map((it) => (it === item ? { ...item, temp: false } : it)),
        )
        setEditingItemId(null)
        return
      }
      try {
        const payload = {
          original_part_id: item.original_part_id,
          requested_qty: item.requested_qty,
          uom: item.uom,
          required_date: item.required_date || null,
          client_comment: item.client_comment || null,
          internal_comment: item.internal_comment || null,
          status: item.status,
        }
        if (item.id) {
          await axios.put(`/client-orders/items/${item.id}`, payload)
          message.success("Позиция обновлена")
        } else {
          await axios.post(`/client-orders/${order.id}/items`, payload)
          message.success("Позиция добавлена")
        }
        setEditingItemId(null)
        loadDetail()
      } catch (e) {
        console.error("save item error", e)
        message.error("Не удалось сохранить позицию")
      }
    },
    [order?.id, loadDetail],
  )

  const handleDeleteItem = useCallback(
    async (item) => {
      if (!order?.id || !item.id) {
        setItems((prev) => prev.filter((it) => it !== item))
        return
      }
      try {
        await axios.delete(`/client-orders/items/${item.id}`)
        message.success("Позиция удалена")
        loadDetail()
      } catch (e) {
        console.error("delete item error", e)
        message.error("Не удалось удалить позицию")
      }
    },
    [order?.id, loadDetail],
  )

  const uomOptions = [
    { value: "pcs", label: "шт" },
    { value: "kg", label: "кг" },
    { value: "set", label: "компл." },
  ]

  const formatDims = (r) => {
    const { length_cm, width_cm, height_cm } = r
    if (length_cm || width_cm || height_cm) {
      return [
        length_cm ? Number(length_cm) : null,
        width_cm ? Number(width_cm) : null,
        height_cm ? Number(height_cm) : null,
      ]
        .filter((v) => v !== null)
        .join(" × ")
    }
    return "—"
  }

  const itemRowKey = (r) =>
    r.id ||
    r.local_id ||
    `${r.original_part_id}_${r.line_number || ""}`

  const summarizeOffers = (record) => {
    const offers = Array.isArray(record.offers) ? record.offers : []
    const total = offers.length
    const visible = offers.filter(
      (o) => o.client_visible || o.status === "proposed" || o.status === "approved",
    ).length
    const approved = offers.filter((o) => o.status === "approved").length
    return { total, visible, approved }
  }

  const getOfferStage = (record) => {
    const { total, visible, approved } = summarizeOffers(record)
    if (record.decision_offer_id || approved > 0) {
      return {
        label: "Выбран",
        color: "success",
        className: "order-item-stage-approved",
      }
    }
    if (visible > 0) {
      return {
        label: "На согласовании",
        color: "processing",
        className: "order-item-stage-proposed",
      }
    }
    if (total > 0) {
      return {
        label: "В подборе",
        color: "orange",
        className: "order-item-stage-sourcing",
      }
    }
    return {
      label: "Нет офферов",
      color: "default",
      className: "order-item-stage-empty",
    }
  }

  const isEditingRow = (record) =>
    editingItemId &&
    (record.id === editingItemId || record.local_id === editingItemId)

  const columnsItems = useMemo(
    () => [
      {
        title: "Позиция",
        dataIndex: "cat_number",
        width: 160,
        render: (v, r) => v || r.original_part_id || "—",
      },
      {
        title: "Описание",
        dataIndex: "description_ru",
        ellipsis: true,
        render: (v, r) => v || r.description_en || r.client_description || "—",
      },
      {
        title: "Модель / Производитель",
        dataIndex: "model_name",
        width: 200,
        render: (_, r) =>
          r.model_name || r.manufacturer_name
            ? `${r.manufacturer_name || ""} ${r.model_name || ""}`.trim()
            : "—",
      },
      {
        title: "ТН ВЭД",
        dataIndex: "tnved_code_value",
        width: 110,
        render: (v) => v || "—",
      },
      {
        title: "Вес, кг",
        dataIndex: "weight_kg",
        width: 90,
        render: (v) => (v != null ? v : "—"),
      },
      {
        title: "Габариты, см",
        key: "dims",
        width: 130,
        render: (_, r) => formatDims(r),
      },
      {
        title: "Кол-во",
        dataIndex: "requested_qty",
        width: 140,
        render: (v, record) => {
          const editing = isEditingRow(record)
          if (!editing) return v ?? "—"
          return (
            <InputNumber
              min={1}
              value={record.requested_qty}
              style={{ width: 120 }}
              onChange={(val) =>
                setItems((prev) =>
                  prev.map((it) =>
                    it === record ? { ...it, requested_qty: val } : it,
                  ),
                )
              }
            />
          )
        },
      },
      {
        title: "Ед.",
        dataIndex: "uom",
        width: 80,
        render: (v, record) => {
          const editing = isEditingRow(record)
          const label =
            uomOptions.find((o) => o.value === v)?.label || v || "—"
          if (!editing) return label
          return (
            <Select
              value={record.uom}
              options={uomOptions}
              style={{ width: 100 }}
              onChange={(val) =>
                setItems((prev) =>
                  prev.map((it) =>
                    it === record ? { ...it, uom: val } : it,
                  ),
                )
              }
            />
          )
        },
      },
      {
        title: "Требуемая дата",
        dataIndex: "required_date",
        width: 160,
        render: (v, record) => {
          const editing = isEditingRow(record)
          if (!editing) return v || "—"
          return (
            <DatePicker
              value={record.required_date ? dayjs(record.required_date) : null}
              onChange={(date) =>
                setItems((prev) =>
                  prev.map((it) =>
                    it === record
                      ? {
                          ...it,
                          required_date: date ? date.format("YYYY-MM-DD") : null,
                        }
                      : it,
                  ),
                )
              }
            />
          )
        },
      },
      {
        title: "Статус",
        dataIndex: "status",
        width: 140,
        render: (v, record) => {
          const meta = ITEM_STATUS_META[v] || { color: "default", label: v || "—" }
          const editing = isEditingRow(record)
          if (!editing) return <Tag color={meta.color}>{meta.label}</Tag>
          return (
            <Select
              value={record.status}
              style={{ width: 140 }}
              onChange={(val) => {
                setItems((prev) =>
                  prev.map((it) => (it === record ? { ...it, status: val } : it)),
                )
              }}
              options={Object.entries(ITEM_STATUS_META).map(([value, m]) => ({
                value,
                label: m.label,
              }))}
            />
          )
        },
      },
      {
        title: "Офферы",
        key: "offers",
        width: 220,
        render: (_, record) => {
          const summary = summarizeOffers(record)
          const stage = getOfferStage(record)
          if (!record.id || !order?.id) {
            return <Text type="secondary">Сохраните позицию</Text>
          }
          return (
            <Space size={6} wrap>
              <Tag color={stage.color}>{stage.label}</Tag>
              <Tooltip title="Показано клиенту / всего">
                <Text type="secondary">
                  {summary.visible}/{summary.total || 0}
                </Text>
              </Tooltip>
            </Space>
          )
        },
      },
      {
        title: "",
        key: "actions",
        width: 100,
        render: (_, record) => {
          const editing = isEditingRow(record)
          return (
            <ActionButtons
              size="small"
              onEdit={!editing ? () => setEditingItemId(record.id || record.local_id) : undefined}
              onSave={editing ? () => handleSaveItem(record) : undefined}
              onCancel={editing ? () => setEditingItemId(null) : undefined}
              onDelete={!editing ? () => handleDeleteItem(record) : undefined}
              confirmDelete={false}
            />
          )
        },
      },
    ],
    [handleSaveItem, handleDeleteItem, editingItemId, order?.id],
  )

  const renderHeaderTab = () => (
    <Form
      layout="vertical"
      form={form}
      initialValues={{
        status: "draft",
      }}
    >
      <Space wrap style={{ width: "100%" }} size="large" align="start">
        <div style={{ minWidth: 320 }}>
          <Form.Item label="Клиент" required>
            <Space direction="vertical" style={{ width: "100%" }} size={6}>
              <div
                style={{
                  padding: "8px 12px",
                  border: "1px solid #d9d9d9",
                  borderRadius: 6,
                  minHeight: 38,
                  background: "#fafafa",
                }}
              >
                {order?.client_company_name ||
                  (form.getFieldValue("client_id")
                    ? `Клиент #${form.getFieldValue("client_id")}`
                    : "Не выбран")}
              </div>
              {!order?.id && (
                <Button onClick={() => setClientPickerOpen(true)}>
                  Выбрать клиента
                </Button>
              )}
            </Space>
            <Form.Item name="client_id" hidden>
              <Input />
            </Form.Item>
          </Form.Item>

          <Form.Item label="Контакт" name="contact_name">
            <Input placeholder="Имя контактного лица" />
          </Form.Item>
          <Form.Item label="Телефон" name="contact_phone">
            <Input placeholder="+7..." />
          </Form.Item>
          <Form.Item label="Email" name="contact_email">
            <Input placeholder="email@example.com" />
          </Form.Item>
          <Form.Item label="Ответственный" name="responsible_user_id">
            <Select
              allowClear
              placeholder="Выбрать пользователя"
              options={responsibleOptions.map((u) => ({
                value: u.id,
                label: u.full_name || u.username || `User #${u.id}`,
              }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
        </div>

        <div style={{ minWidth: 320 }}>
          <Form.Item
            label="Номер заказа"
            name="order_number"
            rules={[{ required: true, message: "Укажите номер заказа" }]}
          >
            <Input placeholder="Например, PO-123" />
          </Form.Item>
          <Form.Item label="Статус" name="status">
            <Select
              options={[
                { value: "draft", label: "Черновик" },
                { value: "new", label: "Новый" },
                { value: "submitted", label: "Отправлен" },
                { value: "confirmed", label: "Подтверждён" },
                { value: "rework", label: "Доработка" },
                { value: "cancelled", label: "Отменён" },
              ]}
            />
          </Form.Item>
          <Form.Item label="Желаемая дата" name="requested_delivery_date">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Номер заказа клиента" name="client_po_number">
            <Input placeholder="Номер заказа клиента" />
          </Form.Item>
          <Form.Item label="Счёт клиента (валюта)">
            <Select
              placeholder="Выберите счёт"
              value={selectedBankId || undefined}
              onChange={(val) => {
                setSelectedBankId(val)
                const found = bankOptions.find((b) => b.id === val)
                if (found?.currency) {
                  form.setFieldsValue({ currency: found.currency })
                }
              }}
              options={bankOptions.map((b) => ({
                value: b.id,
                label: `${b.bank_name || "Банк"} • ${b.account_number || ""} • ${b.currency || ""}`,
              }))}
              loading={bankLoading}
              allowClear
              notFoundContent={bankLoading ? "Загрузка..." : "Нет счетов"}
            />
            <div style={{ marginTop: 6 }}>
              <Button size="small" onClick={() => setBankModalOpen(true)}>
                Добавить реквизиты
              </Button>
            </div>
          </Form.Item>
          <Form.Item label="Валюта" name="currency">
            <Input placeholder="USD" disabled={!!selectedBankId} />
          </Form.Item>
          <Form.Item label="Инкотермс" name="incoterms">
            <IncotermsSelect allowClear />
          </Form.Item>
          <Form.Item label="Условия оплаты" name="payment_terms">
            <Input placeholder="Например, 50/50" />
          </Form.Item>
          <Form.Item label="Юридический адрес">
            <Space>
              <Input
                style={{ width: 360 }}
                readOnly
                value={
                  order?.billing_address_label ||
                  form.getFieldValue("billing_address_label") ||
                  ""
                }
                placeholder="Не выбран"
              />
              <Button
                onClick={() => setBillingPickerOpen(true)}
                disabled={!order?.client_id && !form.getFieldValue("client_id")}
              >
                Выбрать адрес
              </Button>
            </Space>
          </Form.Item>
          <Form.Item name="billing_address_id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="billing_address_label" hidden>
            <Input />
          </Form.Item>
        </div>
      </Space>

      <Space wrap style={{ width: "100%", marginTop: 8 }}>
        <Form.Item label="Адрес доставки" name="shipping_address_id">
          <Space>
            <Input
              style={{ width: 360 }}
              readOnly
              value={
                order?.shipping_address_label ||
                form.getFieldValue("shipping_address_label") ||
                ""
              }
              placeholder="Не выбран"
            />
            <Button
              onClick={() => setShippingPickerOpen(true)}
              disabled={!order?.client_id && !form.getFieldValue("client_id")}
            >
              Выбрать адрес
            </Button>
          </Space>
        </Form.Item>
        <Form.Item name="shipping_address_label" hidden>
          <Input />
        </Form.Item>
      </Space>

      <Divider />
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Alert
          type="info"
          showIcon
          message="Статусы"
          description={
            <div>
              <div>Заказ: Черновик → Новый → Отправлен → Подтверждён (или Доработка/Отмена).</div>
              <div>Строки: Открыта → В подборе → Предложена → Утверждена/Отклонена.</div>
              <div>Оффер выбирает комплектовщик/продавец/админ после согласования с клиентом.</div>
            </div>
          }
        />
        <Form.Item label="Комментарий внутр." name="comment_internal">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item label="Комментарий клиента" name="comment_client">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Space>
    </Form>
  )

  const renderItemsTab = () => (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <Button onClick={() => setPartsPickerOpen(true)}>
        Добавить позиции
      </Button>
      <Table
        rowKey={itemRowKey}
        size="small"
        className="op-table"
        columns={columnsItems}
        dataSource={items}
        pagination={false}
        loading={loading}
        rowClassName={(record) => getOfferStage(record).className}
      />
    </Space>
  )

  const renderHistoryTab = () => <HistoryTimeline events={events} />

  const tabs = [
    { key: "info", label: "Шапка", children: renderHeaderTab() },
    {
      key: "items",
      label: `Строки и офферы (${items.length})`,
      children: renderItemsTab(),
    },
    { key: "history", label: "История", children: renderHistoryTab() },
  ]

  return (
    <>
      <Drawer
        title={
          order?.order_number ||
          form.getFieldValue("order_number") ||
          (order ? `Заказ #${order.id}` : "Новый заказ")
        }
        open={open}
        onClose={onClose}
        width={1200}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={onClose}>Закрыть</Button>
            {!isNew && (
              <Button onClick={() => setProposalOpen(true)} disabled={loading}>
                Предложение
              </Button>
            )}
            <Button type="primary" onClick={handleSave} loading={saving}>
              {isNew ? "Создать" : "Сохранить"}
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Alert
            type="info"
            showIcon
            message="Как сохранить заказ"
            description="Заполните номер заказа и клиента в шапке. Нажмите «Создать/Сохранить» вверху — позиции и офферы можно добавить позже на вкладке «Строки и офферы»."
          />
          <Tabs
            items={tabs}
            activeKey={activeTab}
            onChange={setActiveTab}
          />
        </Space>
      </Drawer>

      <ClientPickerDrawer
        open={clientPickerOpen}
        onClose={() => setClientPickerOpen(false)}
        onPick={(client) => {
          form.setFieldsValue({
            client_id: client.id,
            contact_name: client.contact_person,
            contact_phone: client.phone,
            contact_email: client.email,
          })
          setOrder((prev) => ({
            ...(prev || {}),
            client_id: client.id,
            client_company_name: client.company_name,
          }))
          fetchBanks(client.id)
        }}
      />

      <OriginalsPickerDrawer
        open={partsPickerOpen}
        onClose={() => setPartsPickerOpen(false)}
        onPick={(picked) => {
          handleAddItems(picked)
          setPartsPickerOpen(false)
        }}
      />

      <ProposalPreviewModal
        open={proposalOpen}
        onClose={() => setProposalOpen(false)}
        order={order}
        items={items}
        viewRole={viewRole}
      />

      <ShippingAddressPicker
        open={shippingPickerOpen}
        onClose={() => setShippingPickerOpen(false)}
        clientId={order?.client_id || form.getFieldValue("client_id")}
        onPick={(addr) => {
          form.setFieldsValue({
            shipping_address_id: addr.id,
            shipping_address_label: addr.formatted_address || "",
          })
          setOrder((prev) => ({
            ...(prev || {}),
            shipping_address_id: addr.id,
            shipping_address_label: addr.formatted_address,
          }))
        }}
      />

      <BillingAddressPicker
        open={billingPickerOpen}
        onClose={() => setBillingPickerOpen(false)}
        clientId={order?.client_id || form.getFieldValue("client_id")}
        onPick={(addr) => {
          form.setFieldsValue({
            billing_address_id: addr.id,
            billing_address_label: addr.formatted_address || "",
          })
          setOrder((prev) => ({
            ...(prev || {}),
            billing_address_id: addr.id,
            billing_address_label: addr.formatted_address,
          }))
        }}
      />

      <BankDetailsModal
        open={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        clientId={order?.client_id || form.getFieldValue("client_id")}
        onCreated={(bank) => {
          setBankOptions((prev) => [bank, ...prev])
          setSelectedBankId(bank.id)
          form.setFieldsValue({
            currency: bank.currency || form.getFieldValue("currency"),
          })
        }}
      />
    </>
  )
}
