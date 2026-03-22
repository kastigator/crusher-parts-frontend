import React from "react"
import { Button, Checkbox, Form, Input, Modal, Space } from "antd"
import useCapabilities from "@/hooks/useCapabilities"

export default function SupplierCreateModal({
  open,
  onCancel,
  form,
  onFinish,
  autoAddCreatedSupplier,
  setAutoAddCreatedSupplier,
}) {
  const { can } = useCapabilities()
  const canEditCatalogs = can("catalogs.edit", "workflow.rfq.master_data.write")
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      title="Создать поставщика"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
      >
        <Form.Item
          label="Название"
          name="name"
          rules={[{ required: true, message: "Введите название поставщика" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="Код поставщика"
          name="public_code"
          rules={[{ required: true, message: "Введите код поставщика" }]}
        >
          <Input placeholder="Например SUP-01" />
        </Form.Item>
        <Form.Item>
          <Checkbox
            checked={autoAddCreatedSupplier}
            onChange={(e) => setAutoAddCreatedSupplier(e.target.checked)}
          >
            Сразу добавить в RFQ
          </Checkbox>
        </Form.Item>
        <Space>
          <Button onClick={onCancel}>Отмена</Button>
          <Button type="primary" htmlType="submit" disabled={!canEditCatalogs}>
            Создать
          </Button>
        </Space>
      </Form>
    </Modal>
  )
}
