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
import { useNavigate, useSearchParams } from "react-router-dom"
import axios from "@/api/axiosInstance"
import { formatUomLabel } from "@/utils/uom"

const UOM_OPTIONS = [
  { value: "pcs", label: "шт" },
  { value: "kg", label: "кг" },
  { value: "set", label: "компл." },
]

const EMPTY_FORM = {
  manufacturer_id: undefined,
  equipment_model_ids: [],
  part_number: "",
  description_ru: "",
  description_en: "",
  tech_description: "",
  uom: "pcs",
  tnved_code_id: undefined,
  group_id: undefined,
  has_drawing: false,
  is_overweight: false,
  is_oversize: false,
}

const textOrDash = (value) => {
  const v = String(value || "").trim()
  return v || "—"
}

export default function OEMPartsMain() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState("")
  const [manufacturerId, setManufacturerId] = useState(undefined)
  const [equipmentModelId, setEquipmentModelId] = useState(undefined)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [manufacturers, setManufacturers] = useState([])
  const [models, setModels] = useState([])
  const [groups, setGroups] = useState([])
  const [tnvedCodes, setTnvedCodes] = useState([])
  const [modelOptionsLoading, setModelOptionsLoading] = useState(false)
  const [form] = Form.useForm()

  const selectedManufacturerId = Form.useWatch("manufacturer_id", form)

  const loadRows = async () => {
    setLoading(true)
    try {
      const params = {
        limit: 500,
        q: query || undefined,
        manufacturer_id: manufacturerId || undefined,
        equipment_model_id: equipmentModelId || undefined,
      }
      const { data } = await axios.get("/oem-parts", { params })
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /oem-parts error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить OEM детали")
    } finally {
      setLoading(false)
    }
  }

  const loadReferenceData = async () => {
    try {
      const [{ data: manufacturersData }, { data: groupsData }, { data: tnvedData }] = await Promise.all([
        axios.get("/equipment-manufacturers"),
        axios.get("/original-part-groups"),
        axios.get("/tnved-codes", { params: { limit: 500 } }),
      ])
      setManufacturers(Array.isArray(manufacturersData) ? manufacturersData : [])
      setGroups(Array.isArray(groupsData) ? groupsData : [])
      setTnvedCodes(Array.isArray(tnvedData) ? tnvedData : [])
    } catch (err) {
      console.error("OEM reference data error:", err)
      message.error("Не удалось загрузить справочники OEM каталога")
    }
  }

  const loadModels = async (nextManufacturerId) => {
    if (!nextManufacturerId) {
      setModels([])
      return
    }
    setModelOptionsLoading(true)
    try {
      const { data } = await axios.get("/equipment-models", {
        params: { manufacturer_id: nextManufacturerId },
      })
      setModels(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /equipment-models error:", err)
      message.error("Не удалось загрузить модели оборудования")
      setModels([])
    } finally {
      setModelOptionsLoading(false)
    }
  }

  useEffect(() => {
    loadReferenceData()
  }, [])

  useEffect(() => {
    const manufacturerParam = Number(searchParams.get("manufacturer_id") || 0) || undefined
    const equipmentModelParam = Number(searchParams.get("equipment_model_id") || 0) || undefined
    const qParam = searchParams.get("q") || ""
    setManufacturerId(manufacturerParam)
    setEquipmentModelId(equipmentModelParam)
    setQuery(qParam)
  }, [searchParams])

  useEffect(() => {
    loadRows()
  }, [query, manufacturerId, equipmentModelId])

  useEffect(() => {
    loadModels(manufacturerId)
  }, [manufacturerId])

  useEffect(() => {
    loadModels(selectedManufacturerId)
  }, [selectedManufacturerId])

  const manufacturerOptions = useMemo(
    () =>
      manufacturers.map((item) => ({
        value: item.id,
        label: item.name,
      })),
    [manufacturers]
  )

  const modelOptions = useMemo(
    () =>
      models.map((item) => ({
        value: item.id,
        label: item.model_name,
      })),
    [models]
  )

  const groupOptions = useMemo(
    () =>
      groups.map((item) => ({
        value: item.id,
        label: item.name,
      })),
    [groups]
  )

  const tnvedOptions = useMemo(
    () =>
      tnvedCodes.map((item) => ({
        value: item.id,
        label: `${item.code}${item.description_ru ? ` - ${item.description_ru}` : ""}`,
      })),
    [tnvedCodes]
  )

  const openCreate = () => {
    setEditingRow(null)
    form.setFieldsValue(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = async (row) => {
    setEditingRow(row)
    try {
      const { data } = await axios.get(`/oem-parts/${row.id}/full`)
      form.setFieldsValue({
        ...EMPTY_FORM,
        ...data,
        manufacturer_id: data?.manufacturer_id || undefined,
        equipment_model_ids: Array.isArray(data?.fitments)
          ? data.fitments
              .map((item) => Number(item.equipment_model_id) || null)
              .filter(Boolean)
          : [],
        tnved_code_id: data?.tnved_code_id || undefined,
        group_id: data?.group_id || undefined,
        has_drawing: !!data?.has_drawing,
        is_overweight: !!data?.is_overweight,
        is_oversize: !!data?.is_oversize,
      })
      setModalOpen(true)
    } catch (err) {
      console.error("GET /oem-parts/:id/full error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить OEM деталь")
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const payload = {
        ...values,
        tnved_code_id: values.tnved_code_id || null,
        group_id: values.group_id || null,
        equipment_model_ids: Array.isArray(values.equipment_model_ids) ? values.equipment_model_ids : [],
        has_drawing: values.has_drawing ? 1 : 0,
        is_overweight: values.is_overweight ? 1 : 0,
        is_oversize: values.is_oversize ? 1 : 0,
      }
      if (editingRow?.id) {
        await axios.put(`/oem-parts/${editingRow.id}`, payload)
        message.success("OEM деталь обновлена")
      } else {
        await axios.post("/oem-parts", payload)
        message.success("OEM деталь создана")
      }
      setModalOpen(false)
      await loadRows()
    } catch (err) {
      if (err?.errorFields) return
      console.error("save OEM part error:", err)
      message.error(err?.response?.data?.message || "Не удалось сохранить OEM деталь")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row) => {
    try {
      await axios.delete(`/oem-parts/${row.id}`)
      message.success("OEM деталь удалена")
      await loadRows()
    } catch (err) {
      console.error("delete OEM part error:", err)
      message.error(err?.response?.data?.message || "Не удалось удалить OEM деталь")
    }
  }

  const columns = [
    {
      title: "Производитель",
      dataIndex: "manufacturer_name",
      width: 180,
      render: (value) => <Tag color="geekblue">{textOrDash(value)}</Tag>,
    },
    {
      title: "OEM номер",
      dataIndex: "part_number",
      width: 180,
      render: (value) => <Typography.Text strong>{textOrDash(value)}</Typography.Text>,
    },
    {
      title: "Описание",
      dataIndex: "description_ru",
      width: 280,
      render: (_, row) => textOrDash(row.description_ru || row.description_en),
    },
    {
      title: "Группа",
      dataIndex: "group_name",
      width: 180,
      render: textOrDash,
    },
    {
      title: "Ед. изм.",
      dataIndex: "uom",
      width: 90,
      align: "center",
      render: (value) => formatUomLabel(value) || "—",
    },
    {
      title: "Применяемость",
      dataIndex: "fitments_count",
      width: 100,
      align: "center",
      render: (value) => value || 0,
    },
    {
      title: "Связи со стандартом",
      dataIndex: "standard_links_count",
      width: 150,
      align: "center",
      render: (value) => value || 0,
    },
    {
      title: "Использование у клиентов",
      dataIndex: "client_usage_count",
      width: 170,
      align: "center",
      render: (value) =>
        Number(value || 0) > 0 ? <Tag color="green">{value}</Tag> : <Tag>0</Tag>,
    },
    {
      title: "Черчёж",
      dataIndex: "has_drawing",
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
          <Button
            size="small"
            onClick={(event) => {
              event.stopPropagation()
              openEdit(row)
            }}
          >
            Изменить
          </Button>
          <Popconfirm
            title="Удалить OEM деталь?"
            description={row.part_number}
            okText="Удалить"
            cancelText="Отмена"
            onConfirm={() => handleDelete(row)}
          >
            <Button
              size="small"
              danger
              onClick={(event) => {
                event.stopPropagation()
              }}
            >
              Удалить
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
          <Space wrap>
            <Input.Search
              allowClear
              placeholder="Поиск по OEM номеру, описанию, производителю"
              style={{ width: 360 }}
              onSearch={setQuery}
              onChange={(event) => {
                if (!event.target.value) setQuery("")
              }}
            />
            <Select
              allowClear
              placeholder="Производитель"
              style={{ width: 220 }}
              value={manufacturerId}
              options={manufacturerOptions}
              onChange={(value) => {
                setManufacturerId(value)
                setEquipmentModelId(undefined)
              }}
            />
            <Select
              allowClear
              placeholder="Модель"
              style={{ width: 220 }}
              value={equipmentModelId}
              options={modelOptions}
              loading={modelOptionsLoading}
              disabled={!manufacturerId}
              onChange={setEquipmentModelId}
            />
          </Space>

          <Button type="primary" onClick={openCreate}>
            Создать OEM деталь
          </Button>
        </Space>

        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          columns={columns}
          scroll={{ x: 1500 }}
          pagination={{ pageSize: 50, showSizeChanger: false }}
          onRow={(row) => ({
            onClick: () => navigate(`/original-parts/${row.id}`),
            style: { cursor: "pointer" },
          })}
        />
      </Space>

      <Modal
        open={modalOpen}
        title={editingRow?.id ? "Редактирование OEM детали" : "Создание OEM детали"}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={editingRow?.id ? "Сохранить" : "Создать"}
        cancelText="Отмена"
        confirmLoading={saving}
        width={860}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={EMPTY_FORM}>
          <Space direction="vertical" size={4} style={{ width: "100%" }}>
            <Typography.Text type="secondary">
              Каталог уже работает на новой OEM/standard модели. Маршрут `/original-parts` временно сохранён только ради совместимости навигации.
            </Typography.Text>
          </Space>

          <Form.Item
            label="Производитель"
            name="manufacturer_id"
            rules={[{ required: true, message: "Выберите производителя" }]}
          >
            <Select
              showSearch
              options={manufacturerOptions}
              placeholder="Выберите производителя"
              optionFilterProp="label"
            />
          </Form.Item>

          <Form.Item label="Модели применения" name="equipment_model_ids">
            <Select
              mode="multiple"
              allowClear
              options={modelOptions}
              placeholder="Выберите модели оборудования"
              optionFilterProp="label"
              loading={modelOptionsLoading}
              disabled={!selectedManufacturerId}
            />
          </Form.Item>

          <Space wrap style={{ width: "100%" }} size={12}>
            <Form.Item
              label="OEM номер"
              name="part_number"
              rules={[{ required: true, message: "Укажите OEM номер" }]}
              style={{ minWidth: 260, flex: 1 }}
            >
              <Input placeholder="Например, 123-4567" />
            </Form.Item>
            <Form.Item label="Ед. изм." name="uom" style={{ width: 140 }}>
              <Select options={UOM_OPTIONS} />
            </Form.Item>
            <Form.Item label="Группа" name="group_id" style={{ minWidth: 220, flex: 1 }}>
              <Select allowClear options={groupOptions} placeholder="Группа каталога" />
            </Form.Item>
          </Space>

          <Form.Item label="Описание RU" name="description_ru">
            <Input />
          </Form.Item>

          <Form.Item label="Описание EN" name="description_en">
            <Input />
          </Form.Item>

          <Form.Item label="Техническое описание" name="tech_description">
            <Input.TextArea rows={4} />
          </Form.Item>

          <Form.Item label="Код ТН ВЭД" name="tnved_code_id">
            <Select
              allowClear
              showSearch
              options={tnvedOptions}
              placeholder="Выберите код ТН ВЭД"
              optionFilterProp="label"
            />
          </Form.Item>

          <Space wrap size={24}>
            <Form.Item label="Есть чертёж" name="has_drawing" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item label="Негабарит" name="is_oversize" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item label="Тяжёлый груз" name="is_overweight" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </Card>
  )
}
