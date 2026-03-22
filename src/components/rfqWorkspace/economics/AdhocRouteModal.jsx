import React from "react"
import { Divider, Form, Input, InputNumber, Modal, Select, Space, Typography } from "antd"

const { Text } = Typography
const TRANSPORT_OPTIONS = [
  { value: "ROAD", label: "Авто" },
  { value: "SEA", label: "Море" },
  { value: "AIR", label: "Авиа" },
  { value: "RAIL", label: "Ж/д" },
  { value: "MULTI", label: "Мультимодально" },
]

export default function AdhocRouteModal({
  open,
  onCancel,
  onOk,
  confirmLoading,
  form,
  pricingModelLabel,
  groupDirection,
}) {
  return (
    <Modal
      open={open}
      title="Ручной вариант доставки"
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={confirmLoading}
      okText="Сохранить"
      cancelText="Отмена"
      destroyOnClose
    >
      <Form layout="vertical" form={form}>
        <Form.Item label="Направление">
          <Text>{groupDirection || "Определится по группе отгрузки"}</Text>
        </Form.Item>

        <Form.Item
          name="transport_mode"
          label="Транспорт"
          rules={[{ required: true, message: "Выберите транспорт" }]}
        >
          <Select options={TRANSPORT_OPTIONS} placeholder="Выберите транспорт" />
        </Form.Item>

        <Form.Item name="name" label="Название варианта">
          <Input placeholder="Например: Море через Новороссийск" />
        </Form.Item>

        <Space style={{ width: "100%" }} size="middle" align="start">
          <Form.Item
            name="pricing_model"
            label="Модель тарифа"
            style={{ flex: 1, marginBottom: 0 }}
            rules={[{ required: true, message: "Укажите модель" }]}
          >
            <Select
              options={[
                { value: "fixed", label: pricingModelLabel("fixed") },
                { value: "per_kg", label: pricingModelLabel("per_kg") },
                { value: "per_cbm", label: pricingModelLabel("per_cbm") },
                { value: "per_kg_or_cbm_max", label: pricingModelLabel("per_kg_or_cbm_max") },
                { value: "hybrid", label: pricingModelLabel("hybrid") },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="currency"
            label="Валюта"
            style={{ width: 140, marginBottom: 0 }}
            rules={[{ required: true, message: "Укажите валюту" }]}
          >
            <Input placeholder="USD" maxLength={3} />
          </Form.Item>
        </Space>

        <Divider style={{ margin: "12px 0" }} />

        <Space style={{ width: "100%" }} size="middle" align="start">
          <Form.Item name="fixed_cost" label="Фикс. стоимость" style={{ flex: 1, marginBottom: 0 }}>
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
          <Form.Item name="min_cost" label="Мин. стоимость" style={{ flex: 1, marginBottom: 0 }}>
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Space>

        <Space style={{ width: "100%", marginTop: 8 }} size="middle" align="start">
          <Form.Item name="rate_per_kg" label="Ставка за кг" style={{ flex: 1, marginBottom: 0 }}>
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
          <Form.Item name="rate_per_cbm" label="Ставка за м³" style={{ flex: 1, marginBottom: 0 }}>
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Space>

        <Space style={{ width: "100%", marginTop: 8 }} size="middle" align="start">
          <Form.Item name="markup_pct" label="Наценка, %" style={{ flex: 1, marginBottom: 0 }}>
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="markup_fixed" label="Наценка (фикс.)" style={{ flex: 1, marginBottom: 0 }}>
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
        </Space>

        <Space style={{ width: "100%", marginTop: 8 }} size="middle" align="start">
          <Form.Item name="eta_min_days" label="ETA от, дн" style={{ flex: 1, marginBottom: 0 }}>
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
          <Form.Item name="eta_max_days" label="ETA до, дн" style={{ flex: 1, marginBottom: 0 }}>
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Space>
      </Form>
    </Modal>
  )
}
