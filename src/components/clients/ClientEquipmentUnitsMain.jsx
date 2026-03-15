import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import dayjs from "dayjs"
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd"
import axios from "@/api/axiosInstance"

const STATUS_OPTIONS = [
  { value: "active", label: "Активна" },
  { value: "inactive", label: "Неактивна" },
  { value: "archived", label: "Архив" },
]

const EMPTY_FORM = {
  manufacturer_id: null,
  equipment_model_id: null,
  serial_number: "",
  manufacture_year: null,
  site_name: "",
  internal_name: "",
  commissioning_date: null,
  decommissioned_date: null,
  status: "active",
  notes: "",
}

const textOrDash = (value) => {
  const v = String(value || "").trim()
  return v || "—"
}

export default function ClientEquipmentUnitsMain({ clientId, onChanged }) {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [manufacturers, setManufacturers] = useState([])
  const [models, setModels] = useState([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [form] = Form.useForm()

  const selectedManufacturerId = Form.useWatch("manufacturer_id", form)

  const loadRows = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const { data } = await axios.get("/client-equipment-units", {
        params: { client_id: clientId, limit: 500 },
      })
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /client-equipment-units error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить оборудование клиента")
    } finally {
      setLoading(false)
    }
  }, [clientId])

  const loadManufacturers = useCallback(async () => {
    try {
      const { data } = await axios.get("/equipment-manufacturers")
      setManufacturers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /equipment-manufacturers error:", err)
      message.error("Не удалось загрузить производителей оборудования")
    }
  }, [])

  const loadModels = useCallback(async (manufacturerId) => {
    if (!manufacturerId) {
      setModels([])
      return
    }
    setModelsLoading(true)
    try {
      const { data } = await axios.get("/equipment-models", {
        params: { manufacturer_id: manufacturerId },
      })
      setModels(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /equipment-models error:", err)
      message.error("Не удалось загрузить модели оборудования")
      setModels([])
    } finally {
      setModelsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  useEffect(() => {
    loadManufacturers()
  }, [loadManufacturers])

  useEffect(() => {
    loadModels(selectedManufacturerId)
  }, [selectedManufacturerId, loadModels])

  const manufacturersById = useMemo(() => {
    const map = new Map()
    manufacturers.forEach((row) => map.set(Number(row.id), row))
    return map
  }, [manufacturers])

  const openCreate = () => {
    setEditingRow(null)
    setModels([])
    form.setFieldsValue(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = async (row) => {
    setEditingRow(row)
    const manufacturerId =
      Number(
        row?.manufacturer_id ||
          [...manufacturersById.values()].find((item) => item.name === row?.manufacturer_name)?.id ||
          0
      ) || null

    if (manufacturerId) {
      await loadModels(manufacturerId)
    } else {
      setModels([])
    }

    form.setFieldsValue({
      manufacturer_id: manufacturerId,
      equipment_model_id: row.equipment_model_id || null,
      serial_number: row.serial_number || "",
      manufacture_year: row.manufacture_year || null,
      site_name: row.site_name || "",
      internal_name: row.internal_name || "",
      commissioning_date: row.commissioning_date ? dayjs(row.commissioning_date) : null,
      decommissioned_date: row.decommissioned_date ? dayjs(row.decommissioned_date) : null,
      status: row.status || "active",
      notes: row.notes || "",
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        client_id: clientId,
        equipment_model_id: values.equipment_model_id,
        serial_number: values.serial_number || null,
        manufacture_year: values.manufacture_year ?? null,
        site_name: values.site_name || null,
        internal_name: values.internal_name || null,
        commissioning_date: values.commissioning_date
          ? values.commissioning_date.format("YYYY-MM-DD")
          : null,
        decommissioned_date: values.decommissioned_date
          ? values.decommissioned_date.format("YYYY-MM-DD")
          : null,
        status: values.status,
        notes: values.notes || null,
      }

      setSaving(true)
      if (editingRow?.id) {
        await axios.put(`/client-equipment-units/${editingRow.id}`, payload)
        message.success("Единица оборудования обновлена")
      } else {
        await axios.post("/client-equipment-units", payload)
        message.success("Единица оборудования добавлена")
      }
      setModalOpen(false)
      await loadRows()
      onChanged?.()
    } catch (err) {
      if (err?.errorFields) return
      console.error("save client equipment unit error:", err)
      message.error(err?.response?.data?.message || "Не удалось сохранить единицу оборудования")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row) => {
    try {
      await axios.delete(`/client-equipment-units/${row.id}`)
      message.success("Единица оборудования удалена")
      await loadRows()
      onChanged?.()
    } catch (err) {
      console.error("delete client equipment unit error:", err)
      message.error(err?.response?.data?.message || "Не удалось удалить единицу оборудования")
    }
  }

  const columns = [
    {
      title: "Производитель",
      dataIndex: "manufacturer_name",
      width: 180,
      render: textOrDash,
    },
    {
      title: "Модель",
      dataIndex: "model_name",
      width: 180,
      render: (value, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{textOrDash(value)}</Typography.Text>
          {row.model_code ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {row.model_code}
            </Typography.Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: "Серийный номер",
      dataIndex: "serial_number",
      width: 180,
      render: textOrDash,
    },
    {
      title: "Внутреннее имя",
      dataIndex: "internal_name",
      width: 180,
      render: textOrDash,
    },
    {
      title: "Площадка",
      dataIndex: "site_name",
      width: 160,
      render: textOrDash,
    },
    {
      title: "Год",
      dataIndex: "manufacture_year",
      width: 100,
      align: "center",
      render: (value) => value || "—",
    },
    {
      title: "Статус",
      dataIndex: "status",
      width: 120,
      render: (value) => {
        if (value === "active") return <Tag color="green">Активна</Tag>
        if (value === "inactive") return <Tag color="orange">Неактивна</Tag>
        return <Tag>Архив</Tag>
      },
    },
    {
      title: "Действия",
      key: "actions",
      width: 340,
      fixed: "right",
      render: (_, row) => (
        <Space size="small">
          <Button
            size="small"
            type="primary"
            ghost
            onClick={() =>
              navigate(
                `/client-requests?client_id=${encodeURIComponent(clientId)}&equipment_unit_id=${encodeURIComponent(
                  row.id,
                )}`,
              )
            }
          >
            Создать заявку
          </Button>
          <Button
            size="small"
            onClick={() =>
              navigate(
                `/original-parts?manufacturer_id=${encodeURIComponent(
                  row.manufacturer_id || "",
                )}&equipment_model_id=${encodeURIComponent(row.equipment_model_id || "")}`,
              )
            }
          >
            OEM детали
          </Button>
          <Button size="small" onClick={() => openEdit(row)}>
            Изменить
          </Button>
          <Popconfirm
            title="Удалить единицу оборудования?"
            description={`${row.manufacturer_name || ""} ${row.model_name || ""}`.trim()}
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
    <Card size="small">
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Space style={{ justifyContent: "space-between", width: "100%" }} wrap>
          <Typography.Text type="secondary">
            Конкретные единицы техники клиента: модель, серийный номер, площадка, статус эксплуатации.
          </Typography.Text>
          <Button type="primary" onClick={openCreate}>
            Добавить оборудование
          </Button>
        </Space>

        <Table
          rowKey="id"
          dataSource={rows}
          loading={loading}
          columns={columns}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          scroll={{ x: 1300 }}
          locale={{ emptyText: "Нет оборудования клиента" }}
        />
      </Space>

      <Modal
        open={modalOpen}
        title={editingRow ? "Редактирование оборудования клиента" : "Новое оборудование клиента"}
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
          <Space wrap size={16} style={{ width: "100%" }}>
            <Form.Item
              label="Производитель"
              name="manufacturer_id"
              rules={[{ required: true, message: "Выберите производителя" }]}
              style={{ width: 240 }}
            >
              <Select
                showSearch
                placeholder="Выберите производителя"
                optionFilterProp="label"
                options={manufacturers.map((row) => ({
                  value: row.id,
                  label: row.name,
                }))}
                onChange={() => form.setFieldValue("equipment_model_id", null)}
              />
            </Form.Item>

            <Form.Item
              label="Модель"
              name="equipment_model_id"
              rules={[{ required: true, message: "Выберите модель" }]}
              style={{ width: 280 }}
            >
              <Select
                showSearch
                placeholder="Выберите модель"
                optionFilterProp="label"
                loading={modelsLoading}
                disabled={!selectedManufacturerId}
                options={models.map((row) => ({
                  value: row.id,
                  label: row.model_code
                    ? `${row.model_name} (${row.model_code})`
                    : row.model_name,
                }))}
              />
            </Form.Item>

            <Form.Item label="Статус" name="status" style={{ width: 160 }}>
              <Select options={STATUS_OPTIONS} />
            </Form.Item>

            <Form.Item label="Серийный номер" name="serial_number" style={{ width: 220 }}>
              <Input />
            </Form.Item>

            <Form.Item label="Год выпуска" name="manufacture_year" style={{ width: 160 }}>
              <InputNumber min={1900} max={2100} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item label="Площадка" name="site_name" style={{ width: 220 }}>
              <Input />
            </Form.Item>

            <Form.Item label="Внутреннее имя" name="internal_name" style={{ width: 220 }}>
              <Input />
            </Form.Item>

            <Form.Item label="Дата ввода" name="commissioning_date" style={{ width: 180 }}>
              <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
            </Form.Item>

            <Form.Item label="Дата вывода" name="decommissioned_date" style={{ width: 180 }}>
              <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
            </Form.Item>
          </Space>

          <Form.Item label="Заметки" name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
