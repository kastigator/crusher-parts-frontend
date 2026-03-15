import React, { useEffect, useMemo, useState } from "react"
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd"
import axios from "@/api/axiosInstance"

const EMPTY_FORM = {
  part_type: "",
  designation: "",
  standard_system: "",
  strength_class: "",
  material_spec: "",
  coating: "",
  thread_spec: "",
  size_note: "",
  uom: "pcs",
  description_ru: "",
  description_en: "",
  notes: "",
  is_active: true,
}

const textOrDash = (value) => {
  const v = String(value || "").trim()
  return v || "—"
}

export default function StandardPartsMain() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState("")
  const [partType, setPartType] = useState(undefined)
  const [activeOnly, setActiveOnly] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [form] = Form.useForm()

  const loadRows = async () => {
    setLoading(true)
    try {
      const params = {
        limit: 500,
        is_active: activeOnly ? 1 : undefined,
        q: query || undefined,
        part_type: partType || undefined,
      }
      const { data } = await axios.get("/standard-parts", { params })
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /standard-parts error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить стандартные детали")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRows()
  }, [query, partType, activeOnly])

  const partTypeOptions = useMemo(() => {
    const unique = new Set()
    rows.forEach((row) => {
      const value = String(row.part_type || "").trim()
      if (value) unique.add(value)
    })
    return [...unique].sort((a, b) => a.localeCompare(b, "ru")).map((value) => ({
      value,
      label: value,
    }))
  }, [rows])

  const openCreate = () => {
    setEditingRow(null)
    form.setFieldsValue(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditingRow(row)
    form.setFieldsValue({
      ...EMPTY_FORM,
      ...row,
      is_active: !!row.is_active,
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const payload = {
        ...values,
        is_active: values.is_active ? 1 : 0,
      }
      if (editingRow?.id) {
        await axios.put(`/standard-parts/${editingRow.id}`, payload)
        message.success("Стандартная деталь обновлена")
      } else {
        await axios.post("/standard-parts", payload)
        message.success("Стандартная деталь создана")
      }
      setModalOpen(false)
      await loadRows()
    } catch (err) {
      if (err?.errorFields) return
      console.error("save standard part error:", err)
      message.error(err?.response?.data?.message || "Не удалось сохранить стандартную деталь")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row) => {
    try {
      await axios.delete(`/standard-parts/${row.id}`)
      message.success("Стандартная деталь удалена")
      await loadRows()
    } catch (err) {
      console.error("delete standard part error:", err)
      message.error(err?.response?.data?.message || "Не удалось удалить стандартную деталь")
    }
  }

  const columns = [
    {
      title: "Тип",
      dataIndex: "part_type",
      width: 180,
      render: (value) => <Tag color="blue">{textOrDash(value)}</Tag>,
    },
    {
      title: "Обозначение",
      dataIndex: "designation",
      width: 220,
      render: (value) => <Typography.Text strong>{textOrDash(value)}</Typography.Text>,
    },
    {
      title: "Стандарт",
      dataIndex: "standard_system",
      width: 160,
      render: textOrDash,
    },
    {
      title: "Класс",
      dataIndex: "strength_class",
      width: 140,
      render: textOrDash,
    },
    {
      title: "Материал",
      dataIndex: "material_spec",
      width: 180,
      render: textOrDash,
    },
    {
      title: "OEM links",
      dataIndex: "oem_links_count",
      width: 100,
      align: "center",
      render: (value) => value || 0,
    },
    {
      title: "Supplier links",
      dataIndex: "supplier_links_count",
      width: 120,
      align: "center",
      render: (value) => value || 0,
    },
    {
      title: "Активна",
      dataIndex: "is_active",
      width: 100,
      align: "center",
      render: (value) => (value ? <Tag color="green">Да</Tag> : <Tag>Нет</Tag>),
    },
    {
      title: "Действия",
      key: "actions",
      width: 180,
      fixed: "right",
      render: (_, row) => (
        <Space size="small">
          <Button size="small" onClick={() => openEdit(row)}>
            Изменить
          </Button>
          <Popconfirm
            title="Удалить стандартную деталь?"
            description={row.designation}
            okText="Удалить"
            cancelText="Отмена"
            onConfirm={() => handleDelete(row)}
          >
            <Button size="small" danger>
              Удалить
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card>
      <Space
        direction="vertical"
        size={16}
        style={{ width: "100%" }}
      >
        <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
          <Space wrap>
            <Input.Search
              allowClear
              placeholder="Поиск по обозначению, типу, стандарту, материалу"
              style={{ width: 360 }}
              onSearch={setQuery}
              onChange={(e) => {
                if (!e.target.value) setQuery("")
              }}
            />
            <Select
              allowClear
              placeholder="Тип детали"
              style={{ width: 220 }}
              value={partType}
              options={partTypeOptions}
              onChange={setPartType}
            />
            <Space size="small">
              <Switch checked={activeOnly} onChange={setActiveOnly} />
              <Typography.Text>Только активные</Typography.Text>
            </Space>
          </Space>

          <Button type="primary" onClick={openCreate}>
            Создать стандартную деталь
          </Button>
        </Space>

        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          columns={columns}
          scroll={{ x: 1500 }}
          pagination={{ pageSize: 50, showSizeChanger: false }}
        />
      </Space>

      <Modal
        open={modalOpen}
        title={editingRow ? "Редактирование стандартной детали" : "Новая стандартная деталь"}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        okText={editingRow ? "Сохранить" : "Создать"}
        cancelText="Отмена"
        width={760}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={EMPTY_FORM}
        >
          <Space wrap style={{ width: "100%" }} size={16}>
            <Form.Item
              label="Тип детали"
              name="part_type"
              rules={[{ required: true, message: "Укажите тип детали" }]}
              style={{ width: 220 }}
            >
              <Input placeholder="Bolt / Nut / Washer" />
            </Form.Item>
            <Form.Item
              label="Обозначение"
              name="designation"
              rules={[{ required: true, message: "Укажите обозначение" }]}
              style={{ width: 260 }}
            >
              <Input placeholder="M8x16 DIN 933 8.8" />
            </Form.Item>
            <Form.Item label="Стандарт" name="standard_system" style={{ width: 180 }}>
              <Input placeholder="DIN / ISO / GOST" />
            </Form.Item>
            <Form.Item label="Ед. изм." name="uom" style={{ width: 120 }}>
              <Input placeholder="pcs" />
            </Form.Item>
            <Form.Item label="Класс прочности" name="strength_class" style={{ width: 180 }}>
              <Input placeholder="8.8" />
            </Form.Item>
            <Form.Item label="Материал" name="material_spec" style={{ width: 220 }}>
              <Input placeholder="Steel / A2 / A4" />
            </Form.Item>
            <Form.Item label="Покрытие" name="coating" style={{ width: 180 }}>
              <Input placeholder="Zn" />
            </Form.Item>
            <Form.Item label="Резьба" name="thread_spec" style={{ width: 180 }}>
              <Input placeholder="M8" />
            </Form.Item>
            <Form.Item label="Размер / note" name="size_note" style={{ width: 220 }}>
              <Input placeholder="L=16, fine thread" />
            </Form.Item>
          </Space>

          <Form.Item label="Описание RU" name="description_ru">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Описание EN" name="description_en">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Заметки" name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Активна" name="is_active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
