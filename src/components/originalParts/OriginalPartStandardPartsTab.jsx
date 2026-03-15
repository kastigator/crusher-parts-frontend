import React, { useCallback, useEffect, useState } from "react"
import { Button, Checkbox, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, message } from "antd"
import axios from "@/api/axiosInstance"

const textOrDash = (value) => {
  const v = String(value || "").trim()
  return v || "—"
}

export default function OriginalPartStandardPartsTab({ partId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [options, setOptions] = useState([])
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const load = useCallback(async () => {
    if (!partId) {
      setRows([])
      return
    }
    setLoading(true)
    try {
      const { data } = await axios.get("/oem-part-standard-parts", {
        params: { oem_part_id: partId },
      })
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /oem-part-standard-parts error:", err)
      message.error("Не удалось загрузить стандартные детали")
    } finally {
      setLoading(false)
    }
  }, [partId])

  useEffect(() => {
    load()
  }, [load])

  const fetchStandardParts = async (q = "") => {
    try {
      const { data } = await axios.get("/standard-parts", {
        params: { q, limit: 50 },
      })
      setOptions(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /standard-parts error:", err)
      message.error("Не удалось загрузить каталог стандартных деталей")
    }
  }

  const openPicker = () => {
    form.resetFields()
    setPickerOpen(true)
    fetchStandardParts("")
  }

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      await axios.post("/oem-part-standard-parts", {
        oem_part_id: partId,
        standard_part_id: values.standard_part_id,
        is_primary: values.is_primary ? 1 : 0,
        note: values.note || null,
      })
      message.success("Связь со стандартной деталью добавлена")
      setPickerOpen(false)
      await load()
    } catch (err) {
      if (err?.errorFields) return
      console.error("POST /oem-part-standard-parts error:", err)
      message.error(err?.response?.data?.message || "Не удалось добавить связь")
    } finally {
      setSaving(false)
    }
  }

  const makePrimary = async (record) => {
    try {
      await axios.put(`/oem-part-standard-parts/${partId}/${record.standard_part_id}`, {
        is_primary: 1,
        note: record.note || null,
      })
      message.success("Основная стандартная деталь обновлена")
      await load()
    } catch (err) {
      console.error("PUT /oem-part-standard-parts/:ids error:", err)
      message.error(err?.response?.data?.message || "Не удалось обновить связь")
    }
  }

  const removeLink = async (record) => {
    try {
      await axios.delete(`/oem-part-standard-parts/${partId}/${record.standard_part_id}`)
      message.success("Связь удалена")
      await load()
    } catch (err) {
      console.error("DELETE /oem-part-standard-parts/:ids error:", err)
      message.error(err?.response?.data?.message || "Не удалось удалить связь")
    }
  }

  const columns = [
    {
      title: "Тип",
      dataIndex: "part_type",
      render: textOrDash,
    },
    {
      title: "Обозначение",
      dataIndex: "designation",
      render: (value) => <span style={{ fontWeight: 600 }}>{textOrDash(value)}</span>,
    },
    {
      title: "Стандарт",
      dataIndex: "standard_system",
      render: textOrDash,
    },
    {
      title: "Описание",
      render: (_, row) => textOrDash(row.standard_description_ru || row.standard_description_en),
    },
    {
      title: "Основная",
      dataIndex: "is_primary",
      width: 120,
      render: (value) => (value ? <Tag color="green">Да</Tag> : <Tag>Нет</Tag>),
    },
    {
      title: "Комментарий",
      dataIndex: "note",
      render: textOrDash,
    },
    {
      title: "Действия",
      key: "actions",
      width: 220,
      render: (_, record) => (
        <Space>
          {!record.is_primary ? (
            <Button size="small" onClick={() => makePrimary(record)}>
              Сделать основной
            </Button>
          ) : null}
          <Popconfirm
            title="Удалить связь со стандартной деталью?"
            okText="Удалить"
            cancelText="Отмена"
            onConfirm={() => removeLink(record)}
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
    <>
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" onClick={openPicker}>
          Добавить стандартную деталь
        </Button>
      </Space>

      <Table
        size="small"
        rowKey={(row) => `${row.oem_part_id}-${row.standard_part_id}`}
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={false}
        locale={{ emptyText: "Стандартные детали ещё не привязаны" }}
      />

      <Modal
        open={pickerOpen}
        title="Привязать стандартную деталь"
        onCancel={() => setPickerOpen(false)}
        onOk={handleCreate}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            label="Стандартная деталь"
            name="standard_part_id"
            rules={[{ required: true, message: "Выберите стандартную деталь" }]}
          >
            <Select
              showSearch
              placeholder="Поиск по типу / обозначению / стандарту"
              filterOption={false}
              onSearch={fetchStandardParts}
              onFocus={() => fetchStandardParts("")}
              options={options.map((row) => ({
                value: row.id,
                label: `${row.part_type || "—"} · ${row.designation || "—"}${row.standard_system ? ` · ${row.standard_system}` : ""}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="is_primary" valuePropName="checked">
            <Checkbox>Основная стандартная деталь для этой OEM позиции</Checkbox>
          </Form.Item>
          <Form.Item label="Комментарий" name="note">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
