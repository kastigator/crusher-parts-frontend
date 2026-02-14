import React from "react"
import { Checkbox, DatePicker, Form, Input, InputNumber, Modal, Select, Space } from "antd"

export default function EditItemModal({
  open,
  onCancel,
  form,
  onFinish,
  setOriginalSearch,
  originalLoading,
  originalOptions,
  uomOptions,
}) {
  return (
    <Modal
      title="Редактировать позицию"
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="Сохранить"
      cancelText="Отмена"
      width={760}
    >
      <Form form={form} onFinish={onFinish} layout="vertical">
        <Space wrap align="start">
          <Form.Item
            label="Оригинал"
            name="original_part_id"
            tooltip="Поиск по каталожному номеру или названию"
          >
            <Select
              style={{ width: 220 }}
              showSearch
              allowClear
              filterOption={false}
              onSearch={setOriginalSearch}
              notFoundContent={originalLoading ? "Поиск..." : "Нет совпадений"}
              options={originalOptions.map((opt) => ({
                value: opt.value,
                label: opt.label,
                title: opt.description || undefined,
              }))}
              optionLabelProp="label"
            />
          </Form.Item>
          <Form.Item label="№ клиента" name="client_part_number">
            <Input style={{ width: 200 }} />
          </Form.Item>
          <Form.Item label="Описание клиента" name="client_description">
            <Input style={{ width: 220 }} />
          </Form.Item>
          <Form.Item label="Кол-во" name="requested_qty">
            <InputNumber style={{ width: 120 }} min={0} />
          </Form.Item>
          <Form.Item label="Ед." name="uom">
            <Select style={{ width: 100 }} options={uomOptions} />
          </Form.Item>
          <Form.Item label="Приоритет" name="priority">
            <Input style={{ width: 140 }} />
          </Form.Item>
          <Form.Item label="Срок" name="required_date">
            <DatePicker style={{ width: 160 }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="oem_only" valuePropName="checked">
            <Checkbox>OEM только</Checkbox>
          </Form.Item>
        </Space>
        <Space wrap align="start">
          <Form.Item label="Комментарий клиента" name="client_comment">
            <Input.TextArea style={{ width: 320 }} rows={2} />
          </Form.Item>
          <Form.Item label="Комментарий внутр." name="internal_comment">
            <Input.TextArea style={{ width: 320 }} rows={2} />
          </Form.Item>
        </Space>
      </Form>
    </Modal>
  )
}
