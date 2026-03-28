import React from "react"
import {
  Button,
  Checkbox,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
} from "antd"
import {
  SUPPLIER_DEFAULT_CURRENCY_OPTIONS,
  SUPPLIER_DEFAULT_PAYMENT_TERMS_OPTIONS,
} from "@/constants/supplierDefaults"

export default function SupplierUpsertDrawer({
  open,
  title,
  form,
  saving,
  onClose,
  onSubmit,
  onSubmitAndCreate = null,
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={title}
      width={560}
      destroyOnHidden
      extra={
        <Space>
          <Button onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          {onSubmitAndCreate ? (
            <Button onClick={onSubmitAndCreate} disabled={saving}>
              Создать еще
            </Button>
          ) : null}
          <Button type="primary" loading={saving} onClick={onSubmit}>
            {onSubmitAndCreate ? "Создать" : "Сохранить"}
          </Button>
        </Space>
      }
    >
      <Form layout="vertical" form={form}>
        <Form.Item
          name="name"
          label="Название"
          rules={[{ required: true, message: "Введите название поставщика" }]}
        >
          <Input placeholder="Название поставщика" allowClear />
        </Form.Item>

        <Form.Item
          name="public_code"
          label="Код"
          rules={[{ required: true, message: "Введите код поставщика" }]}
        >
          <Input placeholder="например, S001" allowClear />
        </Form.Item>

        <Divider style={{ margin: "8px 0 12px" }} />
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Юридические данные</div>
        <Form.Item name="vat_number" label="VAT">
          <Input placeholder="VAT / INN" allowClear />
        </Form.Item>

        <Divider style={{ margin: "8px 0 12px" }} />
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Условия</div>
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
        <Space size={12} wrap style={{ width: "100%" }}>
          <Form.Item
            name="preferred_currency"
            label="Валюта по умолчанию"
            style={{ minWidth: 170, flex: 1 }}
          >
            <Select
              allowClear
              placeholder="Выберите валюту"
              options={SUPPLIER_DEFAULT_CURRENCY_OPTIONS}
            />
          </Form.Item>
          <Form.Item
            name="default_pickup_location"
            label="Город/порт отгрузки"
            style={{ minWidth: 260, flex: 2 }}
          >
            <Input placeholder="например: Shanghai" allowClear />
          </Form.Item>
        </Space>

        <Divider style={{ margin: "8px 0 12px" }} />
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Возможности</div>
        <Form.Item label="Поставки" style={{ marginBottom: 8 }}>
          <Space size={16} wrap>
            <Form.Item name="can_oem" valuePropName="checked" noStyle>
              <Checkbox>OEM</Checkbox>
            </Form.Item>
            <Form.Item name="can_analog" valuePropName="checked" noStyle>
              <Checkbox>Аналоги</Checkbox>
            </Form.Item>
          </Space>
        </Form.Item>
        <Space size={12} wrap style={{ width: "100%" }}>
          <Form.Item name="reliability_rating" label="Рейтинг надежности" style={{ minWidth: 170 }}>
            <InputNumber min={0} max={10} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="risk_level" label="Риск" style={{ minWidth: 170 }}>
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
            label="Срок поставки базовый, дн"
            style={{ minWidth: 190 }}
          >
            <InputNumber min={0} max={365} style={{ width: "100%" }} />
          </Form.Item>
        </Space>

        <Divider style={{ margin: "8px 0 12px" }} />
        <Form.Item name="notes" label="Заметки">
          <Input.TextArea rows={3} placeholder="внутренние заметки" />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
