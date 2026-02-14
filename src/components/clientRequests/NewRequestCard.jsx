import React from "react"
import { AutoComplete, Button, Card, Collapse, DatePicker, Form, Input, Select, Space } from "antd"

export default function NewRequestCard({
  createForm,
  handleCreate,
  clientSelectOptions,
  clients,
  setCreateClientOpen,
  loadContacts,
  userOptions,
  sourceOptions,
  contactsLoading,
  contactOptions,
  contactDropdownOpen,
  setContactDropdownOpen,
}) {
  return (
    <Card title="Новая заявка" size="small">
      <Form
        form={createForm}
        layout="vertical"
        onFinish={handleCreate}
      >
        <Space wrap align="start">
          <Form.Item
            label="Клиент"
            name="client_id"
            rules={[{ required: true, message: "Выберите клиента" }]}
          >
            <Select
              style={{ width: 260 }}
              options={clientSelectOptions}
              showSearch
              optionFilterProp="label"
              placeholder="Выберите клиента"
              onChange={(val) => {
                if (val === "__create__") {
                  createForm.setFieldsValue({ client_id: null })
                  setCreateClientOpen(true)
                  return
                }
                const client = clients.find((c) => c.id === val)
                if (!client) return
                const current = createForm.getFieldsValue([
                  "contact_name",
                  "contact_email",
                  "contact_phone",
                ])
                createForm.setFieldsValue({
                  contact_name: current.contact_name || client.contact_person || "",
                  contact_email: current.contact_email || client.email || "",
                  contact_phone: current.contact_phone || client.phone || "",
                })
                loadContacts(val)
              }}
            />
          </Form.Item>
          <Form.Item label="Ответственный" name="assigned_to_user_id">
            <Select
              style={{ width: 220 }}
              options={userOptions}
              showSearch
              optionFilterProp="label"
              placeholder="Назначить"
              allowClear
            />
          </Form.Item>
          <Form.Item
            label="Внутренний номер"
            name="internal_number"
            rules={[{ required: true, message: "Введите внутренний номер" }]}
          >
            <Input style={{ width: 200 }} />
          </Form.Item>
          <Form.Item label="Референс клиента" name="client_reference">
            <Input style={{ width: 220 }} />
          </Form.Item>
          <Form.Item label="Комментарий (внутр.)" name="comment_internal">
            <Input.TextArea style={{ width: 320 }} rows={2} />
          </Form.Item>
        </Space>
        <Collapse
          items={[
            {
              key: "extra",
              label: "Дополнительно",
              children: (
                <Space wrap align="start">
                  <Form.Item label="Источник" name="source_type">
                    <Select style={{ width: 200 }} options={sourceOptions} />
                  </Form.Item>
                  <Form.Item label="Дата получения" name="received_at">
                    <DatePicker
                      style={{ width: 200 }}
                      format="DD.MM.YYYY"
                      placeholder="ДД.ММ.ГГГГ"
                    />
                  </Form.Item>
                  <Form.Item label="Дедлайн обработки" name="processing_deadline">
                    <DatePicker style={{ width: 200 }} format="DD.MM.YYYY" />
                  </Form.Item>
                  <Form.Item
                    label="Контакт"
                    name="contact_name"
                    tooltip={contactsLoading ? "Загрузка контактов клиента..." : undefined}
                    extra="Новый контакт будет добавлен в карточку клиента."
                  >
                    <AutoComplete
                      style={{ width: 220 }}
                      options={contactOptions}
                      placeholder="Выберите или введите"
                      filterOption={false}
                      open={contactDropdownOpen}
                      onFocus={() => {
                        setContactDropdownOpen(true)
                        const clientId = createForm.getFieldValue("client_id")
                        if (clientId) {
                          loadContacts(clientId, false)
                        }
                      }}
                      onBlur={() => setContactDropdownOpen(false)}
                      onSelect={(_, option) => {
                        setContactDropdownOpen(false)
                        if (option?.email || option?.phone) {
                          createForm.setFieldsValue({
                            contact_name: option.value || "",
                            contact_email: option.email || "",
                            contact_phone: option.phone || "",
                          })
                        }
                      }}
                      onChange={(value) => {
                        const match = contactOptions.find((opt) => opt.value === value)
                        if (!match) {
                          createForm.setFieldsValue({
                            contact_email: "",
                            contact_phone: "",
                          })
                        }
                      }}
                    >
                      <Input />
                    </AutoComplete>
                  </Form.Item>
                  <Form.Item
                    label="E-mail"
                    name="contact_email"
                    tooltip="E-mail для связи по этой заявке"
                  >
                    <Input style={{ width: 200 }} />
                  </Form.Item>
                  <Form.Item label="Телефон" name="contact_phone">
                    <Input style={{ width: 180 }} />
                  </Form.Item>
                  <Form.Item label="Комментарий клиента" name="comment_client">
                    <Input.TextArea style={{ width: 320 }} rows={2} />
                  </Form.Item>
                </Space>
              ),
            },
          ]}
        />
        <div style={{ marginTop: 12 }}>
          <Button type="primary" htmlType="submit">
            Создать заявку
          </Button>
        </div>
      </Form>
    </Card>
  )
}
