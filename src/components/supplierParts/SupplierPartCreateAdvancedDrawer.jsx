import React, { useCallback, useEffect, useState } from "react"
import {
  Drawer,
  Form,
  Space,
  Button,
  Input,
  InputNumber,
  Checkbox,
  Typography,
  Select,
  Divider,
} from "antd"
import axios from "@/api/axiosInstance"

const { Text } = Typography

export default function SupplierPartCreateAdvancedDrawer({
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
      comment: value?.comment || "",
      lead_time_days: value?.lead_time_days ?? null,
      min_order_qty: value?.min_order_qty ?? null,
      packaging: value?.packaging || "",

      default_material_id: value?.default_material_id ?? null,
      default_material_note: value?.default_material_note || "",

      weight_kg: value?.weight_kg ?? null,
      length_cm: value?.length_cm ?? null,
      width_cm: value?.width_cm ?? null,
      height_cm: value?.height_cm ?? null,

      is_oem: !!value?.is_oem,
      is_overweight: !!value?.is_overweight,
      is_oversize: !!value?.is_oversize,
    })

    fetchMaterials("")
  }, [open, value, form, fetchMaterials])

  const apply = async () => {
    const v = await form.validateFields()
    onChange?.({
      comment: v.comment || "",
      lead_time_days: v.lead_time_days ?? null,
      min_order_qty: v.min_order_qty ?? null,
      packaging: v.packaging || "",

      default_material_id: v.default_material_id ?? null,
      default_material_note: v.default_material_note || "",

      weight_kg: v.weight_kg ?? null,
      length_cm: v.length_cm ?? null,
      width_cm: v.width_cm ?? null,
      height_cm: v.height_cm ?? null,

      is_oem: !!v.is_oem,
      is_overweight: !!v.is_overweight,
      is_oversize: !!v.is_oversize,
    })
    onClose?.()
  }

  const clear = () => {
    form.resetFields()
    onChange?.({
      comment: "",
      lead_time_days: null,
      min_order_qty: null,
      packaging: "",
      default_material_id: null,
      default_material_note: "",
      weight_kg: null,
      length_cm: null,
      width_cm: null,
      height_cm: null,
      is_oem: false,
      is_overweight: false,
      is_oversize: false,
    })
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
          <Button onClick={clear}>Очистить</Button>
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

        <div style={{ marginTop: 4, fontWeight: 700 }}>Тип детали</div>
        <Space wrap style={{ marginTop: 6 }}>
          <Form.Item name="is_oem" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox>OEM</Checkbox>
          </Form.Item>
          <Form.Item name="is_overweight" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox>Тяжелая</Checkbox>
          </Form.Item>
          <Form.Item name="is_oversize" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox>Негабарит</Checkbox>
          </Form.Item>
        </Space>

        <Divider style={{ margin: "14px 0 10px" }} />
        <div style={{ fontWeight: 700 }}>Коммерческие условия</div>
        <Form.Item name="comment" label="Комментарий" style={{ marginTop: 6 }}>
          <Input.TextArea rows={2} placeholder="Внутренний комментарий" />
        </Form.Item>

        <Space style={{ width: "100%" }} size={10} wrap>
          <Form.Item name="lead_time_days" label="Срок поставки, дней" style={{ flex: 1, minWidth: 220 }}>
            <InputNumber min={0} max={365} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="min_order_qty" label="MOQ" style={{ flex: 1, minWidth: 180 }}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Space>
        <Form.Item name="packaging" label="Упаковка">
          <Input placeholder="например, по 10 шт" allowClear />
        </Form.Item>

        <Divider style={{ margin: "14px 0 10px" }} />
        <div style={{ fontWeight: 700 }}>Материал</div>
        <div style={{ marginTop: 6, marginBottom: 8 }}>
          <Text type="secondary">
            Если выберешь материал по умолчанию, он будет добавлен в «Материалы» детали поставщика.
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

        <Divider style={{ margin: "14px 0 10px" }} />
        <div style={{ fontWeight: 700 }}>Логистика</div>
        <Form.Item name="weight_kg" label="Вес, кг" style={{ marginTop: 6 }}>
          <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
        </Form.Item>
        <Space style={{ width: "100%" }} size={10}>
          <Form.Item name="length_cm" label="Длина, см" style={{ flex: 1 }}>
            <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="width_cm" label="Ширина, см" style={{ flex: 1 }}>
            <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="height_cm" label="Высота, см" style={{ flex: 1 }}>
            <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
          </Form.Item>
        </Space>
      </Form>
    </Drawer>
  )
}

