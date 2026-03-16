import React, { useEffect, useMemo, useState } from "react"
import { DatePicker, Form, Input, InputNumber, Modal, Select, Space, Typography, message } from "antd"
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

export default function SupplierQualityEventModal({
  open,
  supplierId,
  purchaseOrder,
  onClose,
  onCreated,
}) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [loadingLines, setLoadingLines] = useState(false)
  const [purchaseOrderLines, setPurchaseOrderLines] = useState([])
  const eventType = Form.useWatch("event_type", form)

  useEffect(() => {
    if (!open || !supplierId || !purchaseOrder?.id) {
      setPurchaseOrderLines([])
      return
    }
    let cancelled = false
    const loadLines = async () => {
      setLoadingLines(true)
      try {
        const { data } = await axios.get(`/suppliers/${supplierId}/purchase-orders/${purchaseOrder.id}/lines`)
        if (cancelled) return
        setPurchaseOrderLines(Array.isArray(data) ? data : [])
      } catch (e) {
        if (cancelled) return
        setPurchaseOrderLines([])
        message.error(e?.response?.data?.message || "Не удалось загрузить строки PO")
      } finally {
        if (!cancelled) setLoadingLines(false)
      }
    }
    loadLines()
    return () => {
      cancelled = true
    }
  }, [open, purchaseOrder?.id, supplierId])

  useEffect(() => {
    if (!open) {
      form.resetFields()
      return
    }
    form.setFieldsValue({
      event_type: "COMPLAINT",
      severity: 3,
      status: "open",
      supplier_purchase_order_id: purchaseOrder?.id || null,
    })
  }, [form, open, purchaseOrder?.id])

  const selectedLineId = Form.useWatch("supplier_purchase_order_line_id", form)
  const selectedLine = useMemo(
    () => purchaseOrderLines.find((line) => Number(line.id) === Number(selectedLineId || 0)) || null,
    [purchaseOrderLines, selectedLineId]
  )

  const handleLineChange = (value) => {
    const line = purchaseOrderLines.find((item) => Number(item.id) === Number(value || 0)) || null
    form.setFieldsValue({
      rfq_response_line_id: line?.rfq_response_line_id || null,
      selection_id: line?.selection_id || null,
      selection_line_id: line?.selection_line_id || null,
      sales_quote_id: line?.sales_quote_id || null,
      sales_quote_line_id: line?.sales_quote_line_id || null,
      original_part_id: line?.original_part_id || null,
    })
  }

  const handleSubmit = async (values) => {
    if (!supplierId || !purchaseOrder?.id) return
    setSubmitting(true)
    try {
      await axios.post(`/suppliers/${supplierId}/quality-events`, {
        event_type: values.event_type,
        severity: values.severity ?? 3,
        status: values.status || "open",
        occurred_at: values.occurred_at ? dayjs(values.occurred_at).format("YYYY-MM-DD") : null,
        expected_date: values.expected_date ? dayjs(values.expected_date).format("YYYY-MM-DD") : null,
        actual_date: values.actual_date ? dayjs(values.actual_date).format("YYYY-MM-DD") : null,
        delay_days: values.delay_days ?? null,
        rating: values.rating ?? null,
        note: values.note || null,
        qty_affected: values.qty_affected ?? null,
        supplier_purchase_order_id: purchaseOrder.id,
        supplier_purchase_order_line_id: values.supplier_purchase_order_line_id || null,
        rfq_response_line_id: values.rfq_response_line_id || null,
        selection_id: values.selection_id || null,
        selection_line_id: values.selection_line_id || null,
        sales_quote_id: values.sales_quote_id || null,
        sales_quote_line_id: values.sales_quote_line_id || null,
        original_part_id: values.original_part_id || null,
      })
      message.success("Событие качества создано")
      onClose?.()
      onCreated?.()
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось создать событие качества")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={purchaseOrder?.id ? `Событие качества по PO #${purchaseOrder.id}` : "Событие качества"}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Сохранить"
      cancelText="Отмена"
      confirmLoading={submitting}
      width={760}
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          Событие лучше привязывать к конкретной строке <strong>PO</strong>, чтобы рекламация или задержка
          автоматически связывались с поставщиком, деталью, выбором закупки и коммерческим контуром.
        </Typography.Paragraph>

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Space wrap align="start">
            <Form.Item label="Тип" name="event_type" rules={[{ required: true, message: "Выберите тип" }]}>
              <Select style={{ width: 220 }} options={TYPE_OPTIONS} />
            </Form.Item>
            <Form.Item label="Серьёзность" name="severity">
              <InputNumber style={{ width: 140 }} min={1} max={5} />
            </Form.Item>
            <Form.Item label="Статус" name="status">
              <Select style={{ width: 160 }} options={STATUS_OPTIONS} />
            </Form.Item>
            <Form.Item label="Дата события" name="occurred_at">
              <DatePicker style={{ width: 160 }} format="DD.MM.YYYY" />
            </Form.Item>
          </Space>

          <Space wrap align="start">
            <Form.Item label="Строка PO" name="supplier_purchase_order_line_id">
              <Select
                style={{ width: 340 }}
                showSearch
                allowClear
                loading={loadingLines}
                optionFilterProp="label"
                options={purchaseOrderLines.map((line) => ({
                  value: line.id,
                  label: `#${line.id} · ${line.original_cat_number || "без номера"} · ${line.qty || 0} ${line.currency || ""}`.trim(),
                }))}
                onChange={handleLineChange}
                placeholder="Выберите строку PO"
              />
            </Form.Item>
            <Form.Item label="Кол-во под вопросом" name="qty_affected">
              <InputNumber style={{ width: 180 }} min={0} />
            </Form.Item>
          </Space>

          {selectedLine ? (
            <Typography.Text type="secondary">
              Деталь: {selectedLine.original_cat_number || "без номера"}
              {selectedLine.original_description_ru ? ` · ${selectedLine.original_description_ru}` : ""}
            </Typography.Text>
          ) : null}

          {eventType === "DELAY" ? (
            <Space wrap align="start" style={{ marginTop: 12 }}>
              <Form.Item label="Ожид. дата" name="expected_date">
                <DatePicker style={{ width: 160 }} format="DD.MM.YYYY" />
              </Form.Item>
              <Form.Item label="Факт. дата" name="actual_date">
                <DatePicker style={{ width: 160 }} format="DD.MM.YYYY" />
              </Form.Item>
              <Form.Item label="Задержка, дни" name="delay_days">
                <InputNumber style={{ width: 160 }} min={0} />
              </Form.Item>
            </Space>
          ) : null}

          {eventType === "PROCESSING_RATING" ? (
            <Form.Item label="Оценка" name="rating" style={{ marginTop: 12 }}>
              <InputNumber style={{ width: 160 }} min={1} max={5} />
            </Form.Item>
          ) : null}

          <Form.Item label="Комментарий" name="note" style={{ marginTop: 12 }}>
            <Input.TextArea rows={4} />
          </Form.Item>

          <Form.Item name="supplier_purchase_order_id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="rfq_response_line_id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="selection_id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="selection_line_id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="sales_quote_id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="sales_quote_line_id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="original_part_id" hidden>
            <Input />
          </Form.Item>
        </Form>
      </Space>
    </Modal>
  )
}
