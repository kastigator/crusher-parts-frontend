import React from "react"
import { Form, Input, Modal } from "antd"

export default function CreateClientModal({
  open,
  onCancel,
  form,
  onFinish,
  loading,
}) {
  return (
    <Modal
      title="Создать клиента"
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText="Создать"
      cancelText="Отмена"
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          label="Название компании"
          name="company_name"
          rules={[{ required: true, message: "Введите название компании" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item label="Контактное лицо" name="contact_person">
          <Input />
        </Form.Item>
        <Form.Item label="Телефон" name="phone">
          <Input />
        </Form.Item>
        <Form.Item label="E-mail" name="email">
          <Input />
        </Form.Item>
        <Form.Item label="Комментарий" name="notes">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
