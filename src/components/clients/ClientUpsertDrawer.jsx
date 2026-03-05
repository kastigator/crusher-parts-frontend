import React from "react"
import { Button, Drawer, Form, Input, Space } from "antd"

export default function ClientUpsertDrawer({
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
      destroyOnClose
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
          name="company_name"
          label="Компания"
          rules={[{ required: true, message: "Введите название компании" }]}
        >
          <Input placeholder="Название компании" allowClear />
        </Form.Item>

        <Form.Item name="contact_person" label="Контакт">
          <Input placeholder="ФИО контактного лица" allowClear />
        </Form.Item>

        <Space size={12} wrap style={{ width: "100%" }}>
          <Form.Item name="phone" label="Телефон" style={{ minWidth: 220, flex: 1 }}>
            <Input placeholder="+7…" allowClear />
          </Form.Item>
          <Form.Item name="email" label="E-mail" style={{ minWidth: 220, flex: 1 }}>
            <Input placeholder="example@mail.com" allowClear />
          </Form.Item>
        </Space>

        <Space size={12} wrap style={{ width: "100%" }}>
          <Form.Item
            name="registration_number"
            label="Регистрационный номер"
            style={{ minWidth: 220, flex: 1 }}
          >
            <Input placeholder="Рег. номер" allowClear />
          </Form.Item>
          <Form.Item name="tax_id" label="ИНН / Tax ID" style={{ minWidth: 220, flex: 1 }}>
            <Input placeholder="ИНН / Tax ID" allowClear />
          </Form.Item>
        </Space>

        <Form.Item name="website" label="Сайт">
          <Input placeholder="https://…" allowClear />
        </Form.Item>

        <Form.Item name="notes" label="Примечание">
          <Input.TextArea rows={3} placeholder="Внутреннее примечание" />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
