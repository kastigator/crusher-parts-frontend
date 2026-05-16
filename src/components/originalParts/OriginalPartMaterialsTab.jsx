import React, { useEffect, useState, useCallback } from "react"
import {
  Table,
  Button,
  Space,
  Tag,
  Popconfirm,
  Modal,
  Select,
  Input,
  Form,
  message,
  Checkbox,
  InputNumber,
} from "antd"
import { EditOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import { runTrashDeleteFlow } from "@/utils/trashUi"
import { formatCompactNumber, toNumberOrNull } from "@/utils/numberFormat"
import "@/styles/tableStyles.css"

export default function OriginalPartMaterialsTab({ partId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [options, setOptions] = useState([])
  const [adding, setAdding] = useState(false)
  const [form] = Form.useForm()

  const [specOpen, setSpecOpen] = useState(false)
  const [specRecord, setSpecRecord] = useState(null)
  const [specSaving, setSpecSaving] = useState(false)
  const [specForm] = Form.useForm()

  const load = useCallback(async () => {
    if (!partId) {
      setRows([])
      return
    }
    setLoading(true)
    try {
      const { data } = await axios.get(`/original-part-materials/${partId}`)
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error("Ошибка загрузки материалов детали", e)
      message.error("Не удалось загрузить материалы детали")
    } finally {
      setLoading(false)
    }
  }, [partId])

  useEffect(() => {
    load()
  }, [load])

  const fetchMaterials = async (q = "") => {
    try {
      const { data } = await axios.get("/materials", {
        params: { q, limit: 50 },
      })
      const opts = (data || []).map((m) => ({
        value: m.id,
        label: m.name,
        standard: m.standard,
      }))
      setOptions(opts)
    } catch (e) {
      console.error("Не удалось загрузить справочник материалов", e)
    }
  }

  const openPicker = () => {
    form.resetFields()
    setPickerOpen(true)
    fetchMaterials("")
  }

  const openSpec = (record) => {
    setSpecRecord(record)
    specForm.setFieldsValue({
      weight_kg: toNumberOrNull(record?.spec_weight_kg),
      length_cm: toNumberOrNull(record?.spec_length_cm),
      width_cm: toNumberOrNull(record?.spec_width_cm),
      height_cm: toNumberOrNull(record?.spec_height_cm),
    })
    setSpecOpen(true)
  }

  const saveSpec = async () => {
    if (!specRecord?.material_id) return
    try {
      const v = await specForm.validateFields()
      setSpecSaving(true)
      await axios.put("/original-part-material-specs", {
        original_part_id: partId,
        material_id: specRecord.material_id,
        weight_kg: v.weight_kg ?? null,
        length_cm: v.length_cm ?? null,
        width_cm: v.width_cm ?? null,
        height_cm: v.height_cm ?? null,
      })
      message.success("Спецификация сохранена")
      setSpecOpen(false)
      setSpecRecord(null)
      await load()
    } catch (e) {
      if (e?.errorFields) return
      console.error("Ошибка сохранения спецификации", e)
      message.error(e?.response?.data?.message || "Не удалось сохранить спецификацию")
    } finally {
      setSpecSaving(false)
    }
  }

  const fmt = (v) => formatCompactNumber(v)

  const addMaterial = async () => {
    try {
      const v = await form.validateFields()
      setAdding(true)
      await axios.post("/original-part-materials", {
        original_part_id: partId,
        material_id: v.material_id,
        is_default: v.is_default ? 1 : 0,
        note: v.note || null,
      })
      message.success("Материал добавлен")
      setPickerOpen(false)
      await load()
    } catch (e) {
      if (e?.errorFields) return
      console.error("Ошибка добавления материала", e)
      message.error(e?.response?.data?.message || "Не удалось добавить материал")
    } finally {
      setAdding(false)
    }
  }

  const makeDefault = async (record) => {
    try {
      await axios.post("/original-part-materials", {
        original_part_id: partId,
        material_id: record.material_id,
        is_default: 1,
        note: record.note || null,
      })
      await load()
    } catch (e) {
      console.error("Ошибка установки по умолчанию", e)
      message.error("Не удалось изменить материал")
    }
  }

  const removeMaterial = async (record) => {
    try {
      const result = await runTrashDeleteFlow({
        entityType: "oem_part_materials",
        entityId: partId,
        previewParams: { material_id: record.material_id },
        deleteUrl: `/original-part-materials/${partId}/${record.material_id}`,
        successMessage: "Связь материала удалена",
      })
      if (result?.deleted) {
        await load()
      }
    } catch (e) {
      console.error("Ошибка удаления материала", e)
      message.error("Не удалось удалить материал")
    }
  }

  const columns = [
    {
      title: "Материал",
      dataIndex: "material_name",
      key: "material_name",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 600 }}>{r.material_name}</span>
          {r.material_standard && (
            <span style={{ fontSize: 12, color: "#6b7280" }}>{r.material_standard}</span>
          )}
        </Space>
      ),
    },
    {
      title: "Спецификация",
      key: "spec",
      width: 220,
      render: (_, r) => {
        const hasAny =
          r.spec_weight_kg != null ||
          r.spec_length_cm != null ||
          r.spec_width_cm != null ||
          r.spec_height_cm != null
        return (
          <Space direction="vertical" size={0}>
            <span style={{ color: hasAny ? "#111827" : "#9ca3af" }}>
              Вес: {fmt(r.spec_weight_kg)}
            </span>
            <span style={{ color: hasAny ? "#111827" : "#9ca3af" }}>
              Габариты: {fmt(r.spec_length_cm)}×{fmt(r.spec_width_cm)}×{fmt(r.spec_height_cm)}
            </span>
          </Space>
        )
      },
    },
    {
      title: "Описание",
      dataIndex: "material_description",
      key: "material_description",
      render: (v) => v || <span style={{ color: "#9ca3af" }}>—</span>,
    },
    {
      title: "По умолчанию",
      dataIndex: "is_default",
      key: "is_default",
      width: 120,
      render: (v) =>
        v ? <Tag color="blue">да</Tag> : <span style={{ color: "#9ca3af" }}>нет</span>,
    },
    {
      title: "Комментарий",
      dataIndex: "note",
      key: "note",
      render: (v) => v || <span style={{ color: "#9ca3af" }}>—</span>,
    },
    {
      title: "Действия",
      key: "actions",
      width: 160,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openSpec(record)}>
            Спека
          </Button>
          {!record.is_default && (
            <Button size="small" onClick={() => makeDefault(record)}>
              По умолчанию
            </Button>
          )}
          <Popconfirm
            title="Удалить материал?"
            okText="Да"
            cancelText="Нет"
            onConfirm={() => removeMaterial(record)}
          >
            <Button danger size="small">
              Удалить
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" onClick={openPicker}>
          Добавить материал
        </Button>
      </Space>
      <Table
        className="op-table"
        size="small"
        rowKey={(r) => `${r.original_part_id}-${r.material_id}`}
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={false}
        locale={{ emptyText: "Материалы не указаны" }}
      />

      <Modal
        open={pickerOpen}
        title="Добавить материал"
        onCancel={() => setPickerOpen(false)}
        onOk={addMaterial}
        confirmLoading={adding}
        destroyOnHidden
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            label="Материал"
            name="material_id"
            rules={[{ required: true, message: "Выберите материал" }]}
          >
            <Select
              showSearch
              placeholder="Поиск по названию/коду"
              filterOption={false}
              onSearch={(q) => fetchMaterials(q)}
              options={options.map((o) => ({
                value: o.value,
                label: `${o.label}${o.standard ? " · " + o.standard : ""}`,
              }))}
              onFocus={() => fetchMaterials("")}
            />
          </Form.Item>
          <Form.Item label="Сделать по умолчанию" name="is_default" valuePropName="checked">
            <Checkbox />
          </Form.Item>
          <Form.Item label="Комментарий" name="note">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={specOpen}
        title={
          specRecord?.material_name
            ? `Спецификация: ${specRecord.material_name}`
            : "Спецификация материала"
        }
        onCancel={() => {
          setSpecOpen(false)
          setSpecRecord(null)
        }}
        onOk={saveSpec}
        confirmLoading={specSaving}
        destroyOnHidden
      >
        <div style={{ color: "#6b7280", marginBottom: 12 }}>
          Эти значения используются как «основные» вес/габариты, когда этот материал выбран по умолчанию.
        </div>
        <Form layout="vertical" form={specForm}>
          <Form.Item label="Вес, кг" name="weight_kg">
            <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
          </Form.Item>
          <Space style={{ width: "100%" }} size={10}>
            <Form.Item label="Длина, см" name="length_cm" style={{ flex: 1 }}>
              <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="Ширина, см" name="width_cm" style={{ flex: 1 }}>
              <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="Высота, см" name="height_cm" style={{ flex: 1 }}>
              <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
            </Form.Item>
          </Space>
          <Button
            type="link"
            onClick={() => {
              specForm.setFieldsValue({
                weight_kg: null,
                length_cm: null,
                width_cm: null,
                height_cm: null,
              })
            }}
            style={{ padding: 0 }}
          >
            Очистить спецификацию (удалить)
          </Button>
        </Form>
      </Modal>
    </>
  )
}
