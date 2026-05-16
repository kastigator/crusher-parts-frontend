import React, { useEffect, useState, useCallback } from "react"
import { Drawer, Form, Space, Button, Input, InputNumber, Checkbox, Typography, Select, Divider } from "antd"
import TnvedPicker from "@/components/fields/TnvedPicker"
import axios from "@/api/axiosInstance"
import { compactInputNumberProps } from "@/utils/numberFormat"

const { Text } = Typography

export default function OriginalPartCreateAdvancedDrawer({
  open,
  onClose,
  value,
  onChange,
}) {
  const [form] = Form.useForm()
  const [materialOptions, setMaterialOptions] = useState([])
  const [materialsLoading, setMaterialsLoading] = useState(false)

  const fetchMaterials = useCallback(async (q = "") => {
    setMaterialsLoading(true)
    try {
      const { data } = await axios.get("/materials", {
        params: { q, limit: 50 },
      })
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
      tech_description: value?.tech_description || "",
      tnved: value?.tnved || null,
      default_material_id: value?.default_material_id ?? null,
      default_material_note: value?.default_material_note || "",
      weight_kg: value?.weight_kg ?? null,
      length_cm: value?.length_cm ?? null,
      width_cm: value?.width_cm ?? null,
      height_cm: value?.height_cm ?? null,
      has_drawing: !!value?.has_drawing,
      is_overweight: !!value?.is_overweight,
      is_oversize: !!value?.is_oversize,
    })

    fetchMaterials("")
  }, [open, value, form, fetchMaterials])

  const apply = async () => {
    const v = await form.validateFields()
    onChange?.({
      tech_description: v.tech_description || "",
      tnved: v.tnved || null,
      default_material_id: v.default_material_id ?? null,
      default_material_note: v.default_material_note || "",
      weight_kg: v.weight_kg ?? null,
      length_cm: v.length_cm ?? null,
      width_cm: v.width_cm ?? null,
      height_cm: v.height_cm ?? null,
      has_drawing: !!v.has_drawing,
      is_overweight: !!v.is_overweight,
      is_oversize: !!v.is_oversize,
    })
    onClose?.()
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Расширенные поля"
      width={520}
      destroyOnHidden
      extra={
        <Space>
          <Button
            onClick={() => {
              form.resetFields()
              onChange?.({
                tech_description: "",
                tnved: null,
                default_material_id: null,
                default_material_note: "",
                weight_kg: null,
                length_cm: null,
                width_cm: null,
                height_cm: null,
                has_drawing: false,
                is_overweight: false,
                is_oversize: false,
              })
            }}
          >
            Очистить
          </Button>
          <Button type="primary" onClick={apply}>
            Применить
          </Button>
        </Space>
      }
    >
      <Form layout="vertical" form={form}>
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary">
            Эти поля не обязательны при создании. Заполняй только то, что знаешь.
          </Text>
        </div>

        <div style={{ marginTop: 10, fontWeight: 700 }}>Тех. описание</div>
        <Form.Item name="tech_description" style={{ marginTop: 6 }}>
          <Input.TextArea
            placeholder="Коротко о детали: назначение, особенности, требования..."
            autoSize={{ minRows: 4, maxRows: 10 }}
          />
        </Form.Item>

        <div style={{ marginTop: 4, fontWeight: 700 }}>Классификация</div>
        <Form.Item name="tnved" label="ТН ВЭД" style={{ marginTop: 6 }}>
          <TnvedPicker allowClear style={{ width: "100%" }} />
        </Form.Item>

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

        <Divider style={{ margin: "14px 0 10px" }} />
        <div style={{ fontWeight: 700 }}>Материал</div>
        <div style={{ marginTop: 6, marginBottom: 8 }}>
          <Text type="secondary">
            Если выберешь материал по умолчанию, он будет добавлен в «Материалы» детали.
            Вес/габариты ниже будут сохранены как «спека» для этого материала.
          </Text>
        </div>
        <Form.Item name="default_material_id" label="Материал по умолчанию">
          <Select
            showSearch
            allowClear
            placeholder="Поиск по названию/коду/стандарту"
            filterOption={false}
            loading={materialsLoading}
            onSearch={(q) => fetchMaterials(q)}
            onFocus={() => fetchMaterials("")}
            options={materialOptions.map((o) => ({
              value: o.value,
              label: `${o.label}${o.standard ? " · " + o.standard : ""}`,
            }))}
            dropdownRender={(menu) => (
              <>
                {menu}
                <Divider style={{ margin: "8px 0" }} />
                <div style={{ padding: "0 8px 8px", color: "#6b7280" }}>
                  Нет нужного материала? Создай/импортируй его в каталоге «Материалы».
                </div>
              </>
            )}
          />
        </Form.Item>
        <Form.Item name="default_material_note" label="Комментарий (к материалу)">
          <Input placeholder="например: вариант/примечание" allowClear />
        </Form.Item>

        <div style={{ marginTop: 14, fontWeight: 700 }}>Логистика</div>
        <Form.Item name="weight_kg" label="Вес, кг" style={{ marginTop: 6 }}>
          <InputNumber style={{ width: "100%" }} min={0} step={0.01} {...compactInputNumberProps} />
        </Form.Item>

        <Space style={{ width: "100%" }} size={10}>
          <Form.Item name="length_cm" label="Длина, см" style={{ flex: 1 }}>
            <InputNumber style={{ width: "100%" }} min={0} step={0.1} {...compactInputNumberProps} />
          </Form.Item>
          <Form.Item name="width_cm" label="Ширина, см" style={{ flex: 1 }}>
            <InputNumber style={{ width: "100%" }} min={0} step={0.1} {...compactInputNumberProps} />
          </Form.Item>
          <Form.Item name="height_cm" label="Высота, см" style={{ flex: 1 }}>
            <InputNumber style={{ width: "100%" }} min={0} step={0.1} {...compactInputNumberProps} />
          </Form.Item>
        </Space>
      </Form>
    </Drawer>
  )
}
