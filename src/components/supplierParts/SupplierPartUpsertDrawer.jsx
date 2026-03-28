import React from "react"
import {
  Drawer,
  Space,
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Row,
  Col,
  Checkbox,
  Divider,
  Typography,
} from "antd"

const UOM_OPTIONS = [
  { value: "pcs", label: "шт" },
  { value: "kg", label: "кг" },
  { value: "set", label: "компл." },
]

const { Text } = Typography

export default function SupplierPartUpsertDrawer({
  open,
  title,
  form,
  saving,
  onClose,
  onSubmit,
  onSubmitAndCreate = null,
  supplierLabel = "",
  supplierPartNumberRules = null,
  materialOptions = [],
  materialsLoading = false,
  onSearchMaterials,
  onFocusMaterials,
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
        {supplierLabel ? <Text type="secondary">Поставщик: {supplierLabel}</Text> : null}
        {supplierLabel ? <Divider style={{ margin: "12px 0" }} /> : null}

        <Form.Item
          name="supplier_part_number"
          label="№ у поставщика"
          validateTrigger={["onBlur", "onSubmit"]}
          rules={supplierPartNumberRules || [{ required: true, message: "Введите номер детали" }]}
        >
          <Input placeholder="например, HTM442.8723-00" allowClear />
        </Form.Item>

        <Form.Item name="description_ru" label="Описание (RU)">
          <Input placeholder="Описание (RU)" allowClear />
        </Form.Item>

        <Form.Item name="description_en" label="Описание (EN)">
          <Input placeholder="Description (EN)" allowClear />
        </Form.Item>

        <Form.Item name="comment" label="Комментарий">
          <Input.TextArea rows={2} placeholder="Внутренний комментарий" />
        </Form.Item>

        <Row gutter={12}>
          <Col span={8}>
            <Form.Item name="uom" label="Ед. изм.">
              <Select options={UOM_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item label="Признаки" style={{ marginBottom: 8 }}>
              <Space size={16} wrap>
                <Form.Item name="is_oem" valuePropName="checked" noStyle>
                  <Checkbox>OEM</Checkbox>
                </Form.Item>
                <Form.Item name="is_overweight" valuePropName="checked" noStyle>
                  <Checkbox>Тяжелая</Checkbox>
                </Form.Item>
                <Form.Item name="is_oversize" valuePropName="checked" noStyle>
                  <Checkbox>Негабарит</Checkbox>
                </Form.Item>
              </Space>
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: "8px 0 12px" }} />
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Коммерческие условия</div>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item name="lead_time_days" label="Срок поставки, дней">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="min_order_qty" label="MOQ">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="packaging" label="Упаковка">
              <Input placeholder="например, по 10 шт" allowClear />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: "8px 0 12px" }} />
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Материал по умолчанию</div>
        <Form.Item name="default_material_id" label="Материал">
          <Select
            showSearch
            allowClear
            placeholder="Поиск по названию/стандарту"
            filterOption={false}
            loading={materialsLoading}
            onSearch={onSearchMaterials}
            onFocus={onFocusMaterials}
            options={materialOptions}
          />
        </Form.Item>
        <Form.Item name="default_material_note" label="Комментарий к материалу">
          <Input placeholder="например: вариант/примечание" allowClear />
        </Form.Item>

        <Divider style={{ margin: "8px 0 12px" }} />
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Логистика</div>
        <Form.Item name="weight_kg" label="Вес, кг">
          <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
        </Form.Item>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item name="length_cm" label="Длина, см">
              <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="width_cm" label="Ширина, см">
              <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="height_cm" label="Высота, см">
              <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  )
}
