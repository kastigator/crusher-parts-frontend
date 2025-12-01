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
} from "antd"
import axios from "@/api/axiosInstance"
import "@/styles/tableStyles.css"

export default function OriginalPartMaterialsTab({ partId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [options, setOptions] = useState([])
  const [adding, setAdding] = useState(false)
  const [form] = Form.useForm()

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
      await axios.delete(
        `/original-part-materials/${partId}/${record.material_id}`
      )
      await load()
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
        destroyOnClose
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
    </>
  )
}
