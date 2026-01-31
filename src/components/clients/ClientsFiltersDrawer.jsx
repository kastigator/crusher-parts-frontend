import React, { useEffect, useMemo } from "react"
import { Badge, Button, Checkbox, Drawer, Form, Space, Typography } from "antd"

const { Text } = Typography

const normalize = (raw = {}) => {
  const f = raw || {}
  return {
    has_phone: !!f.has_phone,
    has_email: !!f.has_email,
    has_tax_id: !!f.has_tax_id,
    has_website: !!f.has_website,
  }
}

export const countActiveFilters = (filters) => {
  const f = normalize(filters)
  let n = 0
  if (f.has_phone) n++
  if (f.has_email) n++
  if (f.has_tax_id) n++
  if (f.has_website) n++
  return n
}

export default function ClientsFiltersDrawer({ open, onClose, value, onApply }) {
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
      width={420}
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
        <Text type="secondary">Фильтры применяются вместе с поиском.</Text>
      </div>

      <Form layout="vertical" form={form}>
        <Space direction="vertical" size={6}>
          <Form.Item name="has_phone" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox>Только с телефоном</Checkbox>
          </Form.Item>
          <Form.Item name="has_email" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox>Только с e-mail</Checkbox>
          </Form.Item>
          <Form.Item name="has_tax_id" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox>Только с Tax ID/ИНН</Checkbox>
          </Form.Item>
          <Form.Item name="has_website" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox>Только с сайтом</Checkbox>
          </Form.Item>
        </Space>
      </Form>
    </Drawer>
  )
}

