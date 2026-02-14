import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Badge, Button, Checkbox, Col, Divider, Drawer, Form, InputNumber, Row, Select, Space, Typography } from "antd"
import axios from "@/api/axiosInstance"
import { countActiveFilters } from "./supplierPartsFiltersUtils"

const { Text } = Typography

export default function SupplierPartsFiltersDrawer({
  open,
  onClose,
  value,
  onApply,
}) {
  const [form] = Form.useForm()
  const [materialOptions, setMaterialOptions] = useState([])
  const [materialsLoading, setMaterialsLoading] = useState(false)

  const fetchMaterials = useCallback(async (q = "") => {
    setMaterialsLoading(true)
    try {
      const { data } = await axios.get("/materials", { params: { q, limit: 50 } })
      const opts = (data || []).map((m) => ({
        value: m.id,
        label: m.name,
        standard: m.standard,
      }))
      setMaterialOptions(opts)
    } catch (e) {
      console.error("Не удалось загрузить справочник материалов", e)
    } finally {
      setMaterialsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    form.setFieldsValue({
      part_type: value?.part_type || null,
      originals_mode: value?.originals_mode || "any",

      weight_min: value?.weight_min ?? null,
      weight_max: value?.weight_max ?? null,
      lead_time_min: value?.lead_time_min ?? null,
      lead_time_max: value?.lead_time_max ?? null,
      moq_min: value?.moq_min ?? null,
      moq_max: value?.moq_max ?? null,

      length_min: value?.length_min ?? null,
      length_max: value?.length_max ?? null,
      width_min: value?.width_min ?? null,
      width_max: value?.width_max ?? null,
      height_min: value?.height_min ?? null,
      height_max: value?.height_max ?? null,

      is_overweight: !!value?.is_overweight,
      is_oversize: !!value?.is_oversize,

      material_id: value?.material_id ?? null,
      material_mode: value?.material_mode || "any",
    })
    fetchMaterials("")
  }, [open, value, form, fetchMaterials])

  const apply = async () => {
    const v = await form.validateFields()
    onApply?.({
      part_type: v.part_type || null,
      originals_mode: v.originals_mode || "any",

      weight_min: v.weight_min ?? null,
      weight_max: v.weight_max ?? null,
      lead_time_min: v.lead_time_min ?? null,
      lead_time_max: v.lead_time_max ?? null,
      moq_min: v.moq_min ?? null,
      moq_max: v.moq_max ?? null,

      length_min: v.length_min ?? null,
      length_max: v.length_max ?? null,
      width_min: v.width_min ?? null,
      width_max: v.width_max ?? null,
      height_min: v.height_min ?? null,
      height_max: v.height_max ?? null,

      is_overweight: !!v.is_overweight,
      is_oversize: !!v.is_oversize,

      material_id: v.material_id ?? null,
      material_mode: v.material_mode || "any",
    })
    onClose?.()
  }

  const clear = () => {
    form.resetFields()
    onApply?.({})
  }

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
          <Button onClick={clear}>Очистить</Button>
          <Button type="primary" onClick={apply}>
            Применить
          </Button>
        </Space>
      }
    >
      <Form layout="vertical" form={form}>
        <div style={{ marginBottom: 10 }}>
          <Text type="secondary">
            Фильтры работают вместе с поиском. Пустые значения не учитываются.
          </Text>
        </div>

        <Row gutter={[10, 10]}>
          <Col span={12}>
            <Form.Item name="part_type" label="Тип">
              <Select
                allowClear
                placeholder="Все"
                options={[
                  { value: "OEM", label: "OEM" },
                  { value: "ANALOG", label: "Аналоги" },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="originals_mode" label="Привязки к оригиналам">
              <Select
                options={[
                  { value: "any", label: "Все" },
                  { value: "linked", label: "Есть привязки" },
                  { value: "unlinked", label: "Без привязок" },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Space wrap style={{ marginTop: 2 }}>
          <Form.Item name="is_overweight" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox>Тяжелая</Checkbox>
          </Form.Item>
          <Form.Item name="is_oversize" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox>Негабарит</Checkbox>
          </Form.Item>
        </Space>

        <Divider style={{ margin: "14px 0 10px" }} />
        <div style={{ fontWeight: 700 }}>Материал</div>
        <Row gutter={[10, 10]} style={{ marginTop: 6 }}>
          <Col span={14}>
            <Form.Item name="material_id" label="Материал">
              <Select
                showSearch
                allowClear
                placeholder="Выберите материал"
                filterOption={false}
                loading={materialsLoading}
                onSearch={(q) => fetchMaterials(q)}
                onFocus={() => fetchMaterials("")}
                options={materialOptions.map((o) => ({
                  value: o.value,
                  label: `${o.label}${o.standard ? " · " + o.standard : ""}`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item name="material_mode" label="Где искать">
              <Select
                options={[
                  { value: "any", label: "Любой" },
                  { value: "default", label: "По умолчанию" },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: "14px 0 10px" }} />
        <div style={{ fontWeight: 700 }}>Диапазоны</div>
        <Row gutter={[10, 10]} style={{ marginTop: 6 }}>
          <Col span={12}>
            <Form.Item name="weight_min" label="Вес от, кг">
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="weight_max" label="Вес до, кг">
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="lead_time_min" label="Срок поставки от, дн">
              <InputNumber min={0} step={1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="lead_time_max" label="Срок поставки до, дн">
              <InputNumber min={0} step={1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="moq_min" label="MOQ от">
              <InputNumber min={0} step={1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="moq_max" label="MOQ до">
              <InputNumber min={0} step={1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: "14px 0 10px" }} />
        <div style={{ fontWeight: 700 }}>Габариты, см</div>
        <Row gutter={[10, 10]} style={{ marginTop: 6 }}>
          <Col span={12}>
            <Form.Item name="length_min" label="Длина от">
              <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="length_max" label="Длина до">
              <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="width_min" label="Ширина от">
              <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="width_max" label="Ширина до">
              <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="height_min" label="Высота от">
              <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="height_max" label="Высота до">
              <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  )
}
