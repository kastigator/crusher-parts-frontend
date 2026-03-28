import React, { useEffect } from "react"
import { Button, Checkbox, Drawer, Form, Input, InputNumber, Select, Space, Typography } from "antd"
import {
  SUPPLIER_DEFAULT_CURRENCY_OPTIONS,
  SUPPLIER_DEFAULT_PAYMENT_TERMS_OPTIONS,
  normalizeSupplierDefaultCurrency,
  normalizeSupplierDefaultPaymentTerms,
} from "@/constants/supplierDefaults"

const { Text } = Typography

export default function SupplierCreateAdvancedDrawer({ open, onClose, value, onChange }) {
  const [form] = Form.useForm()

  useEffect(() => {
    if (!open) return
    form.setFieldsValue({
      vat_number: value?.vat_number || "",
      website: value?.website || "",
      payment_terms: normalizeSupplierDefaultPaymentTerms(value?.payment_terms),
      preferred_currency: normalizeSupplierDefaultCurrency(value?.preferred_currency),
      default_pickup_location: value?.default_pickup_location || "",
      can_oem: !!value?.can_oem,
      can_analog: value?.can_analog === undefined ? true : !!value?.can_analog,
      reliability_rating: value?.reliability_rating ?? null,
      risk_level: value?.risk_level || "",
      default_lead_time_days: value?.default_lead_time_days ?? null,
      notes: value?.notes || "",
    })
  }, [open, value, form])

  const apply = async () => {
    const v = await form.validateFields()
    onChange?.({
      vat_number: v.vat_number || "",
      website: v.website || "",
      payment_terms: normalizeSupplierDefaultPaymentTerms(v.payment_terms || ""),
      preferred_currency: normalizeSupplierDefaultCurrency(v.preferred_currency || ""),
      default_pickup_location: v.default_pickup_location || "",
      can_oem: !!v.can_oem,
      can_analog: !!v.can_analog,
      reliability_rating: v.reliability_rating ?? null,
      risk_level: v.risk_level || "",
      default_lead_time_days: v.default_lead_time_days ?? null,
      notes: v.notes || "",
    })
    onClose?.()
  }

  const clear = () => {
    form.resetFields()
    onChange?.({
      vat_number: "",
      website: "",
      payment_terms: "",
      preferred_currency: "",
      default_pickup_location: "",
      can_oem: false,
      can_analog: true,
      reliability_rating: null,
      risk_level: "",
      default_lead_time_days: null,
      notes: "",
    })
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Расширенные поля"
      width={520}
      destroyOnHidden
      extra={
        <Space>
          <Button onClick={clear}>Очистить</Button>
          <Button type="primary" onClick={apply}>
            Применить
          </Button>
        </Space>
      }
    >
        <div style={{ marginBottom: 10 }}>
          <Text type="secondary">
            Эти поля не обязательны при создании. Значения будут использоваться как базовые
            (по умолчанию) для новых RFQ. Контакты/адреса/банковские реквизиты добавляются
            в карточке поставщика. Валюта и условия оплаты выбираются из справочника, чтобы
            избежать дублей с разным написанием.
          </Text>
        </div>

      <Form layout="vertical" form={form}>
        <div style={{ marginTop: 6, fontWeight: 700 }}>Юридические данные</div>
        <Form.Item name="vat_number" label="VAT">
          <Input placeholder="VAT / INN" allowClear />
        </Form.Item>

        <div style={{ marginTop: 6, fontWeight: 700 }}>Условия</div>
        <Form.Item name="website" label="Сайт">
          <Input placeholder="https://…" allowClear />
        </Form.Item>
        <Form.Item name="payment_terms" label="Базовые условия оплаты (по умолчанию)">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Выберите условие"
            options={SUPPLIER_DEFAULT_PAYMENT_TERMS_OPTIONS}
          />
        </Form.Item>

        <Space style={{ width: "100%" }} size={10} wrap>
          <Form.Item
            name="preferred_currency"
            label="Валюта по умолчанию"
            style={{ flex: 1, minWidth: 180 }}
          >
            <Select
              allowClear
              placeholder="Выберите валюту"
              options={SUPPLIER_DEFAULT_CURRENCY_OPTIONS}
            />
          </Form.Item>
          <Form.Item
            name="default_pickup_location"
            label="Город/порт отгрузки (по умолчанию)"
            style={{ flex: 2, minWidth: 260 }}
          >
            <Input placeholder="например: Shanghai" allowClear />
          </Form.Item>
        </Space>

        <div style={{ marginTop: 6, fontWeight: 700 }}>Возможности</div>
        <Space wrap style={{ marginBottom: 8 }}>
          <Form.Item name="can_oem" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox>Может OEM</Checkbox>
          </Form.Item>
          <Form.Item name="can_analog" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox>Может аналоги</Checkbox>
          </Form.Item>
        </Space>

        <Space style={{ width: "100%" }} size={10} wrap>
          <Form.Item
            name="reliability_rating"
            label="Рейтинг надёжности"
            style={{ minWidth: 220 }}
          >
            <InputNumber style={{ width: "100%" }} min={0} max={10} />
          </Form.Item>
          <Form.Item name="risk_level" label="Риск" style={{ minWidth: 220 }}>
            <Select
              allowClear
              placeholder="не выбран"
              options={[
                { value: "low", label: "низкий" },
                { value: "medium", label: "средний" },
                { value: "high", label: "высокий" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="default_lead_time_days"
            label="Срок поставки базовый (ориентир), дн"
            style={{ minWidth: 220 }}
          >
            <InputNumber style={{ width: "100%" }} min={0} max={365} />
          </Form.Item>
        </Space>

        <Form.Item name="notes" label="Заметки">
          <Input.TextArea rows={3} placeholder="внутренние заметки" />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
