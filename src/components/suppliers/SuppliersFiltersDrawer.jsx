import React, { useEffect, useMemo } from "react"
import { Badge, Button, Checkbox, Col, Drawer, Form, Input, InputNumber, Row, Select, Space, Typography } from "antd"

const { Text } = Typography

const toNumOrNull = (v) => {
  if (v === undefined || v === null || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const normalize = (raw = {}) => {
  const f = raw || {}
  return {
    can_oem: !!f.can_oem,
    can_analog: !!f.can_analog,
    has_contact: !!f.has_contact,
    has_address: !!f.has_address,
    risk_level: f.risk_level || "",
    reliability_min: toNumOrNull(f.reliability_min),
    reliability_max: toNumOrNull(f.reliability_max),
    lead_time_min: toNumOrNull(f.lead_time_min),
    lead_time_max: toNumOrNull(f.lead_time_max),
    country_q: (f.country_q || "").toString(),
    cap_mode: f.cap_mode || "all",
  }
}

export const countActiveFilters = (filters) => {
  const f = normalize(filters)
  let n = 0
  if (f.can_oem) n++
  if (f.can_analog) n++
  if (f.has_contact) n++
  if (f.has_address) n++
  if (f.risk_level) n++
  ;["reliability_min", "reliability_max", "lead_time_min", "lead_time_max"].forEach((k) => {
    if (f[k] != null) n++
  })
  if (f.country_q.trim()) n++
  return n
}

export default function SuppliersFiltersDrawer({ open, onClose, value, onApply }) {
  const [form] = Form.useForm()
  const initial = useMemo(() => normalize(value), [value])

  useEffect(() => {
    if (!open) return
    form.setFieldsValue(initial)
  }, [open, initial, form])

  const activeCount = useMemo(() => countActiveFilters(value), [value])

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <Space size={8}>
          <span>Фильтры</span>
          {activeCount ? <Badge count={activeCount} /> : null}
        </Space>
      }
      width={520}
      destroyOnClose
      extra={
        <Space>
          <Button
            onClick={() => {
              form.resetFields()
              onApply?.({})
            }}
          >
            Очистить
          </Button>
          <Button
            type="primary"
            onClick={async () => {
              const v = await form.validateFields()
              onApply?.(normalize(v))
              onClose?.()
            }}
          >
            Применить
          </Button>
        </Space>
      }
    >
      <div style={{ marginBottom: 10 }}>
        <Text type="secondary">Фильтры работают вместе с поиском.</Text>
      </div>

      <Form layout="vertical" form={form}>
        <Row gutter={[10, 10]}>
          <Col span={12}>
            <Form.Item name="risk_level" label="Риск">
              <Select
                allowClear
                placeholder="Все"
                options={[
                  { value: "low", label: "низкий" },
                  { value: "medium", label: "средний" },
                  { value: "high", label: "высокий" },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="country_q" label="Страна (поиск)">
              <Input placeholder="например: Россия" allowClear />
            </Form.Item>
          </Col>
        </Row>

        <Space wrap style={{ marginTop: 2 }}>
          <Form.Item name="can_oem" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox>Может OEM</Checkbox>
          </Form.Item>
          <Form.Item name="can_analog" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox>Может аналоги</Checkbox>
          </Form.Item>
          <Form.Item name="has_contact" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox>Есть контакт</Checkbox>
          </Form.Item>
          <Form.Item name="has_address" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox>Есть адрес</Checkbox>
          </Form.Item>
        </Space>

        <Row gutter={[10, 10]} style={{ marginTop: 10 }}>
          <Col span={12}>
            <Form.Item name="reliability_min" label="Рейтинг от">
              <InputNumber min={0} max={10} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="reliability_max" label="Рейтинг до">
              <InputNumber min={0} max={10} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="lead_time_min" label="Срок поставки (база) от, дн">
              <InputNumber min={0} max={365} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="lead_time_max" label="Срок поставки (база) до, дн">
              <InputNumber min={0} max={365} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  )
}

