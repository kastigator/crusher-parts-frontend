import React, { useEffect } from "react"
import { Button, Checkbox, Drawer, Form, Input, InputNumber, Select, Space, Typography } from "antd"

const { Text } = Typography

export default function SupplierCreateAdvancedDrawer({ open, onClose, value, onChange }) {
  const [form] = Form.useForm()

  useEffect(() => {
    if (!open) return
    form.setFieldsValue({
      vat_number: value?.vat_number || "",
      website: value?.website || "",
      payment_terms: value?.payment_terms || "",
      preferred_currency: value?.preferred_currency || "",
      default_incoterms: value?.default_incoterms || "",
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
      payment_terms: v.payment_terms || "",
      preferred_currency: v.preferred_currency || "",
      default_incoterms: v.default_incoterms || "",
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
      default_incoterms: "",
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
      destroyOnClose
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
          Эти поля не обязательны при создании. Контакты/адреса/банковские реквизиты добавляются в карточке поставщика.
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
        <Form.Item name="payment_terms" label="Условия оплаты">
          <Input placeholder="например: 30% предоплата / NET30" allowClear />
        </Form.Item>

        <Space style={{ width: "100%" }} size={10} wrap>
          <Form.Item name="preferred_currency" label="Валюта" style={{ flex: 1, minWidth: 180 }}>
            <Input placeholder="USD" maxLength={3} allowClear />
          </Form.Item>
          <Form.Item name="default_incoterms" label="Инкотермс" style={{ flex: 1, minWidth: 180 }}>
            <Input placeholder="EXW / FOB / FCA" allowClear />
          </Form.Item>
          <Form.Item
            name="default_pickup_location"
            label="Город/порт"
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
            label="Срок поставки (база), дн"
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

