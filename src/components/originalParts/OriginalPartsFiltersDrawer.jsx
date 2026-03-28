import React, { useEffect, useMemo, useState } from "react"
import {
  Drawer,
  Form,
  Space,
  Button,
  InputNumber,
  Checkbox,
  Divider,
  Select,
  Typography,
} from "antd"
import axios from "@/api/axiosInstance"

const { Text } = Typography

const toNumOrNull = (v) => {
  if (v === undefined || v === null || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const normalizeFilters = (raw = {}) => {
  const f = raw || {}
  return {
    weight_min: toNumOrNull(f.weight_min),
    weight_max: toNumOrNull(f.weight_max),
    length_min: toNumOrNull(f.length_min),
    length_max: toNumOrNull(f.length_max),
    width_min: toNumOrNull(f.width_min),
    width_max: toNumOrNull(f.width_max),
    height_min: toNumOrNull(f.height_min),
    height_max: toNumOrNull(f.height_max),
    has_drawing: !!f.has_drawing,
    is_overweight: !!f.is_overweight,
    is_oversize: !!f.is_oversize,
    material_mode: f.material_mode === "any" ? "any" : "default",
    material_id: toNumOrNull(f.material_id),
    bom_material_depth: f.bom_material_depth === "direct" ? "direct" : "any",
    bom_material_mode: f.bom_material_mode === "any" ? "any" : "default",
    bom_material_id: toNumOrNull(f.bom_material_id),
  }
}

export default function OriginalPartsFiltersDrawer({ open, onClose, value, onApply }) {
  const [form] = Form.useForm()
  const initial = useMemo(() => normalizeFilters(value), [value])

  useEffect(() => {
    if (!open) return
    form.setFieldsValue(initial)
  }, [open, initial, form])

  // Materials search
  const [materialOptions, setMaterialOptions] = useState([])
  const [materialsLoading, setMaterialsLoading] = useState(false)

  const fetchMaterials = async (q = "") => {
    setMaterialsLoading(true)
    try {
      const { data } = await axios.get("/materials", { params: { q, limit: 50 } })
      const opts = (Array.isArray(data) ? data : []).map((m) => ({
        value: m.id,
        label: `${m.name}${m.standard ? " · " + m.standard : ""}`,
      }))
      setMaterialOptions(opts)
    } finally {
      setMaterialsLoading(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Фильтры"
      width={420}
      destroyOnHidden
      extra={
        <Space>
          <Button
            onClick={() => {
              form.resetFields()
            }}
          >
            Сбросить
          </Button>
          <Button
            type="primary"
            onClick={async () => {
              const v = await form.validateFields()
              onApply?.(normalizeFilters(v))
              onClose?.()
            }}
          >
            Применить
          </Button>
        </Space>
      }
    >
      <Form layout="vertical" form={form}>
        <Text type="secondary">
          Вес/габариты фильтруются по <b>основным</b> значениям (default material spec → fallback).
        </Text>

        <Divider orientation="left" plain>
          Габариты/логистика
        </Divider>

        <Space direction="vertical" style={{ width: "100%" }} size={10}>
          <Space style={{ width: "100%" }} size={10}>
            <Form.Item label="Вес, кг (min)" name="weight_min" style={{ flex: 1, marginBottom: 0 }}>
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="Вес, кг (max)" name="weight_max" style={{ flex: 1, marginBottom: 0 }}>
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
          </Space>

          <Space style={{ width: "100%" }} size={10}>
            <Form.Item label="Длина, см (min)" name="length_min" style={{ flex: 1, marginBottom: 0 }}>
              <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="Длина, см (max)" name="length_max" style={{ flex: 1, marginBottom: 0 }}>
              <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
            </Form.Item>
          </Space>

          <Space style={{ width: "100%" }} size={10}>
            <Form.Item label="Ширина, см (min)" name="width_min" style={{ flex: 1, marginBottom: 0 }}>
              <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="Ширина, см (max)" name="width_max" style={{ flex: 1, marginBottom: 0 }}>
              <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
            </Form.Item>
          </Space>

          <Space style={{ width: "100%" }} size={10}>
            <Form.Item label="Высота, см (min)" name="height_min" style={{ flex: 1, marginBottom: 0 }}>
              <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="Высота, см (max)" name="height_max" style={{ flex: 1, marginBottom: 0 }}>
              <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
            </Form.Item>
          </Space>

          <Space wrap>
            <Form.Item name="has_drawing" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Checkbox>Есть КД</Checkbox>
            </Form.Item>
            <Form.Item name="is_overweight" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Checkbox>Тяжелая</Checkbox>
            </Form.Item>
            <Form.Item name="is_oversize" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Checkbox>Негабарит</Checkbox>
            </Form.Item>
          </Space>
        </Space>

        <Divider orientation="left" plain>
          Материал позиции
        </Divider>

        <Form.Item label="Режим" name="material_mode">
          <Select
            options={[
              { value: "default", label: "Default материал" },
              { value: "any", label: "Любой материал (ANY)" },
            ]}
          />
        </Form.Item>
        <Form.Item label="Материал" name="material_id">
          <Select
            showSearch
            allowClear
            placeholder="Поиск по названию/коду"
            filterOption={false}
            onSearch={(q) => fetchMaterials(q)}
            onFocus={() => fetchMaterials("")}
            loading={materialsLoading}
            options={materialOptions}
          />
        </Form.Item>

        <Divider orientation="left" plain>
          Материал в составе BOM
        </Divider>

        <Space style={{ width: "100%" }} size={10}>
          <Form.Item label="Глубина" name="bom_material_depth" style={{ flex: 1 }}>
            <Select
              options={[
                { value: "any", label: "Любой уровень" },
                { value: "direct", label: "Только прямые дети" },
              ]}
            />
          </Form.Item>
          <Form.Item label="Режим" name="bom_material_mode" style={{ flex: 1 }}>
            <Select
              options={[
                { value: "default", label: "Default у деталей" },
                { value: "any", label: "Любой у деталей (ANY)" },
              ]}
            />
          </Form.Item>
        </Space>

        <Form.Item label="Материал в составе" name="bom_material_id">
          <Select
            showSearch
            allowClear
            placeholder="Поиск по названию/коду"
            filterOption={false}
            onSearch={(q) => fetchMaterials(q)}
            onFocus={() => fetchMaterials("")}
            loading={materialsLoading}
            options={materialOptions}
          />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
