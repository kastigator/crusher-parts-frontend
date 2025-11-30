import React, { useEffect, useMemo, useState } from "react"
import {
  Modal,
  Form,
  Input,
  Button,
  Select,
  TreeSelect,
  Space,
  Switch,
  Typography,
  Divider,
  message,
} from "antd"
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons"

const { TextArea } = Input
const { Text } = Typography

const emptyProperty = { code: "", display_name: "", value_num: "", unit: "", use_curve: false }

export default function MaterialFormModal({
  open,
  onClose,
  onSubmit,
  initialData,
  categories,
}) {
  const [form] = Form.useForm()
  const [properties, setProperties] = useState([])
  const [aliases, setAliases] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setProperties(
        Array.isArray(initialData?.properties) && initialData.properties.length
          ? initialData.properties.map((p) => ({ ...p }))
          : []
      )
      setAliases(
        Array.isArray(initialData?.aliases)
          ? initialData.aliases.map((a) => a.alias || a)
          : []
      )
      form.setFieldsValue({
        name: initialData?.name || "",
        code: initialData?.code || "",
        standard: initialData?.standard || "",
        category_id: initialData?.category_id || null,
        source_file: initialData?.source_file || "",
        source_path: initialData?.source_path || "",
        description: initialData?.description || "",
      })
    } else {
      form.resetFields()
      setProperties([])
      setAliases([])
    }
  }, [open, initialData, form])

  const treeData = useMemo(() => {
    const map = {}
    categories.forEach((c) => {
      map[c.id] = { title: c.name, value: c.id, key: c.id, children: [] }
    })
    const roots = []
    categories.forEach((c) => {
      const node = map[c.id]
      if (c.parent_id && map[c.parent_id]) {
        map[c.parent_id].children.push(node)
      } else {
        roots.push(node)
      }
    })
    return roots
  }, [categories])

  const handleAddProperty = () => {
    setProperties((prev) => [...prev, { ...emptyProperty }])
  }

  const handlePropChange = (idx, field, value) => {
    setProperties((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    )
  }

  const handleRemoveProp = (idx) => {
    setProperties((prev) => prev.filter((_, i) => i !== idx))
  }

  const submit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      const payload = {
        ...values,
        properties: properties
          .filter((p) => p.code?.trim())
          .map((p) => ({
            ...p,
            value_num: p.value_num === "" ? null : Number(p.value_num),
          })),
        aliases: aliases.map((a) => ({ alias: a })),
        // кривые пока не редактируем — если они пришли, пробрасываем как есть
        curves: initialData?.curves || [],
      }
      await onSubmit?.(payload)
    } catch (err) {
      if (err?.errorFields) return
      message.error(err?.message || "Не удалось сохранить материал")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={submit}
      okText="Сохранить"
      confirmLoading={loading}
      title={initialData?.id ? "Редактирование материала" : "Новый материал"}
      width={720}
      destroyOnClose
    >
      <Form layout="vertical" form={form}>
        <Form.Item
          label="Название"
          name="name"
          rules={[{ required: true, message: "Укажите название" }]}
        >
          <Input placeholder="Например, AISI 304" />
        </Form.Item>

        <Space size={12} style={{ width: "100%" }}>
          <Form.Item label="Код/марка" name="code" style={{ flex: 1 }}>
            <Input placeholder="Напр., 304" />
          </Form.Item>
          <Form.Item label="Стандарт" name="standard" style={{ flex: 1 }}>
            <Input placeholder="ASTM / ГОСТ / DIN" />
          </Form.Item>
        </Space>

        <Form.Item label="Категория" name="category_id">
          <TreeSelect
            allowClear
            treeData={treeData}
            placeholder="Выберите категорию"
            treeDefaultExpandAll
            style={{ width: "100%" }}
            dropdownStyle={{ maxHeight: 400, overflow: "auto" }}
          />
        </Form.Item>

        <Space size={12} style={{ width: "100%" }}>
          <Form.Item label="Источник (файл)" name="source_file" style={{ flex: 1 }}>
            <Input placeholder="solidworks materials.sldmat" />
          </Form.Item>
          <Form.Item label="Путь в источнике" name="source_path" style={{ flex: 1 }}>
            <Input placeholder="Сталь / Нержавеющая" />
          </Form.Item>
        </Space>

        <Form.Item label="Описание" name="description">
          <TextArea rows={2} placeholder="Краткое описание" />
        </Form.Item>

        <Form.Item label="Алиасы / синонимы">
          <Select
            mode="tags"
            value={aliases}
            onChange={setAliases}
            style={{ width: "100%" }}
            placeholder="Добавьте синонимы"
          />
        </Form.Item>

        <Divider plain>Свойства</Divider>
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          {properties.length === 0 && (
            <Text type="secondary">Свойства не заданы</Text>
          )}
          {properties.map((p, idx) => (
            <Space key={idx} align="start" style={{ width: "100%" }}>
              <Input
                style={{ width: 120 }}
                placeholder="Код (DENS)"
                value={p.code}
                onChange={(e) => handlePropChange(idx, "code", e.target.value)}
              />
              <Input
                style={{ width: 200 }}
                placeholder="Название"
                value={p.display_name}
                onChange={(e) =>
                  handlePropChange(idx, "display_name", e.target.value)
                }
              />
              <Input
                style={{ width: 140 }}
                placeholder="Значение"
                value={p.value_num}
                onChange={(e) => handlePropChange(idx, "value_num", e.target.value)}
              />
              <Input
                style={{ width: 100 }}
                placeholder="Ед."
                value={p.unit}
                onChange={(e) => handlePropChange(idx, "unit", e.target.value)}
              />
              <Space align="center">
                <span style={{ fontSize: 12 }}>кривая</span>
                <Switch
                  size="small"
                  checked={!!p.use_curve}
                  onChange={(v) => handlePropChange(idx, "use_curve", v)}
                />
              </Space>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleRemoveProp(idx)}
              />
            </Space>
          ))}
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={handleAddProperty}
            style={{ width: 200 }}
          >
            Добавить свойство
          </Button>
        </Space>
      </Form>
    </Modal>
  )
}
