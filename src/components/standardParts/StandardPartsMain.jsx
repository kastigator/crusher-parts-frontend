import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Divider,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
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
import dayjs from "dayjs"
import axios from "@/api/axiosInstance"

const textOrDash = (value) => {
  const v = String(value || "").trim()
  return v || "—"
}

const BOOL_OPTIONS = [
  { value: true, label: "Да" },
  { value: false, label: "Нет" },
]

const normalizeFieldValueForForm = (field, value) => {
  if (value === undefined || value === null) {
    if (field.field_type === "multiselect") return []
    return field.field_type === "boolean" ? null : undefined
  }
  if (field.field_type === "date") return dayjs(String(value))
  if (field.field_type === "multiselect") return Array.isArray(value) ? value : []
  return value
}

const serializeFieldValue = (field, value) => {
  if (field.field_type === "date") {
    return value ? dayjs(value).format("YYYY-MM-DD") : null
  }
  if (field.field_type === "multiselect") {
    return Array.isArray(value) ? value : []
  }
  return value ?? null
}

const formatAttributeValue = (attribute) => {
  const value = attribute?.value
  if (value === undefined || value === null || value === "") return "—"
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—"
  if (typeof value === "boolean") return value ? "Да" : "Нет"
  return String(value)
}

function DynamicFieldInput({ field }) {
  const commonProps = {
    placeholder: field.placeholder || undefined,
  }

  if (field.field_type === "textarea") {
    return <Input.TextArea rows={3} {...commonProps} />
  }

  if (field.field_type === "number") {
    return <InputNumber style={{ width: "100%" }} {...commonProps} />
  }

  if (field.field_type === "boolean") {
    return <Select allowClear options={BOOL_OPTIONS} placeholder="Выберите значение" />
  }

  if (field.field_type === "date") {
    return <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
  }

  if (field.field_type === "select") {
    return (
      <Select
        allowClear
        placeholder={field.placeholder || "Выберите значение"}
        options={(field.options || []).map((option) => ({
          value: option.value_code,
          label: option.value_label,
        }))}
      />
    )
  }

  if (field.field_type === "multiselect") {
    return (
      <Select
        mode="multiple"
        allowClear
        placeholder={field.placeholder || "Выберите значения"}
        options={(field.options || []).map((option) => ({
          value: option.value_code,
          label: option.value_label,
        }))}
      />
    )
  }

  return <Input {...commonProps} />
}

export default function StandardPartsMain({
  embeddedClassId = null,
  compact = false,
  onChanged = () => {},
}) {
  const [rows, setRows] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState("")
  const [classId, setClassId] = useState(embeddedClassId || undefined)
  const [activeOnly, setActiveOnly] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [classFields, setClassFields] = useState([])
  const [oemModalOpen, setOemModalOpen] = useState(false)
  const [oemSaving, setOemSaving] = useState(false)
  const [oemTargetRow, setOemTargetRow] = useState(null)
  const [manufacturers, setManufacturers] = useState([])
  const [models, setModels] = useState([])
  const [supplierModalOpen, setSupplierModalOpen] = useState(false)
  const [supplierSaving, setSupplierSaving] = useState(false)
  const [supplierTargetRow, setSupplierTargetRow] = useState(null)
  const [supplierOptions, setSupplierOptions] = useState([])
  const [supplierLinksModalOpen, setSupplierLinksModalOpen] = useState(false)
  const [supplierLinksLoading, setSupplierLinksLoading] = useState(false)
  const [supplierLinksTargetRow, setSupplierLinksTargetRow] = useState(null)
  const [supplierLinksRows, setSupplierLinksRows] = useState([])
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsRow, setDetailsRow] = useState(null)
  const [detailsData, setDetailsData] = useState(null)
  const [detailsOemRows, setDetailsOemRows] = useState([])
  const [detailsSupplierRows, setDetailsSupplierRows] = useState([])
  const [form] = Form.useForm()
  const [oemForm] = Form.useForm()
  const [supplierForm] = Form.useForm()

  useEffect(() => {
    if (embeddedClassId) setClassId(embeddedClassId)
  }, [embeddedClassId])

  const loadClasses = useCallback(async () => {
    try {
      const { data } = await axios.get("/standard-part-classes", { params: { tree: 1, limit: 5000 } })
      const flatten = (nodes, acc = [], parents = [], depth = 0) => {
        ;(nodes || []).forEach((node) => {
          const pathNames = [...parents, node.name].filter(Boolean)
          acc.push({
            ...node,
            path_label: pathNames.join(" / "),
            depth,
          })
          flatten(node.children || [], acc, pathNames, depth + 1)
        })
        return acc
      }
      setClasses(flatten(Array.isArray(data) ? data : []))
    } catch (err) {
      console.error("GET /standard-part-classes error:", err)
      message.error("Не удалось загрузить классы стандартных деталей")
    }
  }, [])

  const loadRows = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        limit: embeddedClassId ? 200 : 500,
        q: query || undefined,
        class_id: embeddedClassId || classId || undefined,
        include_descendants: embeddedClassId || classId ? 1 : undefined,
        is_active: activeOnly ? 1 : undefined,
      }
      const { data } = await axios.get("/standard-parts", { params })
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /standard-parts error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить стандартные детали")
    } finally {
      setLoading(false)
    }
  }, [activeOnly, classId, embeddedClassId, query])

  useEffect(() => {
    loadClasses()
  }, [loadClasses])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  const classOptions = useMemo(
    () =>
      classes.map((item) => ({
        value: item.id,
        label: (
          <Space size={8} style={{ paddingLeft: item.depth ? item.depth * 14 : 0 }}>
            <Typography.Text>{item.name}</Typography.Text>
            {item.depth > 0 ? (
              <Typography.Text type="secondary">
                {item.path_label}
              </Typography.Text>
            ) : null}
          </Space>
        ),
        title: item.path_label || item.name,
        search_label: item.path_label || item.name,
      })),
    [classes]
  )

  const loadFields = async (nextClassId) => {
    if (!nextClassId) {
      setClassFields([])
      return []
    }
    try {
      const { data } = await axios.get(`/standard-part-classes/${nextClassId}/fields`)
      const fields = Array.isArray(data) ? data : []
      setClassFields(fields)
      return fields
    } catch (err) {
      console.error("GET /standard-part-classes/:id/fields error:", err)
      message.error("Не удалось загрузить поля класса")
      setClassFields([])
      return []
    }
  }

  const openCreate = async () => {
    setEditingRow(null)
    form.resetFields()
    const nextClassId = embeddedClassId || classId
    form.setFieldsValue({
      class_id: nextClassId || undefined,
      uom: "pcs",
      is_active: true,
    })
    await loadFields(nextClassId)
    setModalOpen(true)
  }

  const openEdit = async (row) => {
    setEditingRow(row)
    const { data } = await axios.get(`/standard-parts/${row.id}`)
    const nextClassId = data?.class_id || row.class_id
    const fields = await loadFields(nextClassId)
    const attributeValues = {}
    ;(Array.isArray(data?.attributes) ? data.attributes : []).forEach((attribute) => {
      const field = fields.find((item) => item.id === attribute.field_id)
      if (!field) return
      attributeValues[`field_${field.id}`] = normalizeFieldValueForForm(field, attribute.value)
    })
    form.setFieldsValue({
      class_id: nextClassId,
      designation: data?.designation || "",
      uom: data?.uom || "pcs",
      description_ru: data?.description_ru || "",
      description_en: data?.description_en || "",
      notes: data?.notes || "",
      is_active: !!data?.is_active,
      ...attributeValues,
    })
    setModalOpen(true)
  }

  const handleClassChange = async (nextClassId) => {
    form.setFieldsValue({ class_id: nextClassId })
    const fields = await loadFields(nextClassId)
    const clearPayload = {}
    fields.forEach((field) => {
      clearPayload[`field_${field.id}`] = field.field_type === "multiselect" ? [] : undefined
    })
    form.setFieldsValue(clearPayload)
  }

  const buildAttributesPayload = (values) =>
    classFields.map((field) => ({
      field_id: field.id,
      value: serializeFieldValue(field, values[`field_${field.id}`]),
    }))

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (!values.class_id) {
        message.error("Выберите класс стандартной детали")
        return
      }

      setSaving(true)
      const payload = {
        class_id: values.class_id,
        designation: values.designation || null,
        uom: values.uom || "pcs",
        description_ru: values.description_ru || null,
        description_en: values.description_en || null,
        notes: values.notes || null,
        is_active: values.is_active ? 1 : 0,
        attributes: buildAttributesPayload(values),
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
      onChanged()
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
      onChanged()
    } catch (err) {
      console.error("delete standard part error:", err)
      message.error(err?.response?.data?.message || "Не удалось удалить стандартную деталь")
    }
  }

  const openCreateOem = async (row) => {
    setOemTargetRow(row)
    setModels([])
    oemForm.resetFields()
    oemForm.setFieldsValue({ uom: row.uom || "pcs" })
    setOemModalOpen(true)
    try {
      const [{ data: manufacturersData }] = await Promise.all([
        axios.get("/equipment-manufacturers"),
      ])
      setManufacturers(Array.isArray(manufacturersData) ? manufacturersData : [])
    } catch (err) {
      console.error(err)
      message.error("Не удалось загрузить справочник производителей")
    }
  }

  const loadModels = async (manufacturerId) => {
    if (!manufacturerId) {
      setModels([])
      return
    }
    try {
      const { data } = await axios.get("/equipment-models", { params: { manufacturer_id: manufacturerId } })
      setModels(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /equipment-models error:", err)
      message.error("Не удалось загрузить модели оборудования")
    }
  }

  const handleCreateOem = async () => {
    if (!oemTargetRow?.id) return
    try {
      const values = await oemForm.validateFields()
      setOemSaving(true)
      await axios.post(`/standard-parts/${oemTargetRow.id}/create-oem-representation`, {
        manufacturer_id: values.manufacturer_id,
        equipment_model_ids: values.equipment_model_ids,
        part_number: values.part_number,
        description_ru: values.description_ru || null,
        description_en: values.description_en || null,
        tech_description: values.tech_description || null,
        uom: values.uom || "pcs",
      })
      message.success("OEM-представление создано")
      setOemModalOpen(false)
      onChanged()
    } catch (err) {
      if (err?.errorFields) return
      console.error("create oem representation error:", err)
      message.error(err?.response?.data?.message || "Не удалось создать OEM-представление")
    } finally {
      setOemSaving(false)
    }
  }

  const openCreateSupplier = async (row) => {
    setSupplierTargetRow(row)
    supplierForm.resetFields()
    supplierForm.setFieldsValue({
      uom: row.uom || "pcs",
      part_type: "ANALOG",
      is_preferred: true,
    })
    setSupplierModalOpen(true)
    try {
      const { data } = await axios.get("/suppliers")
      setSupplierOptions(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      message.error("Не удалось загрузить справочник поставщиков")
    }
  }

  const handleCreateSupplier = async () => {
    if (!supplierTargetRow?.id) return
    try {
      const values = await supplierForm.validateFields()
      setSupplierSaving(true)
      await axios.post(`/standard-parts/${supplierTargetRow.id}/create-supplier-representation`, {
        supplier_id: values.supplier_id,
        supplier_part_number: values.supplier_part_number,
        description_ru: values.description_ru || null,
        description_en: values.description_en || null,
        comment: values.comment || null,
        uom: values.uom || "pcs",
        lead_time_days: values.lead_time_days ?? null,
        min_order_qty: values.min_order_qty ?? null,
        packaging: values.packaging || null,
        weight_kg: values.weight_kg ?? null,
        length_cm: values.length_cm ?? null,
        width_cm: values.width_cm ?? null,
        height_cm: values.height_cm ?? null,
        is_overweight: values.is_overweight ? 1 : 0,
        is_oversize: values.is_oversize ? 1 : 0,
        part_type: values.part_type || "ANALOG",
        is_preferred: values.is_preferred ? 1 : 0,
        note: values.note || null,
        initial_price: values.initial_price ?? null,
        initial_currency: values.initial_currency || null,
        initial_price_date: values.initial_price_date
          ? dayjs(values.initial_price_date).format("YYYY-MM-DD")
          : null,
      })
      message.success("Представление поставщика создано")
      setSupplierModalOpen(false)
      await loadRows()
      onChanged()
    } catch (err) {
      if (err?.errorFields) return
      console.error("create supplier representation error:", err)
      message.error(err?.response?.data?.message || "Не удалось создать представление поставщика")
    } finally {
      setSupplierSaving(false)
    }
  }

  const openSupplierLinks = async (row) => {
    setSupplierLinksTargetRow(row)
    setSupplierLinksRows([])
    setSupplierLinksModalOpen(true)
    setSupplierLinksLoading(true)
    try {
      const { data } = await axios.get(`/standard-parts/${row.id}/supplier-parts`)
      setSupplierLinksRows(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /standard-parts/:id/supplier-parts error:", err)
      message.error("Не удалось загрузить связанные представления поставщиков")
    } finally {
      setSupplierLinksLoading(false)
    }
  }

  const openDetails = async (row) => {
    setDetailsRow(row)
    setDetailsData(null)
    setDetailsOemRows([])
    setDetailsSupplierRows([])
    setDetailsModalOpen(true)
    setDetailsLoading(true)
    try {
      const [{ data: partData }, { data: oemData }, { data: supplierData }] = await Promise.all([
        axios.get(`/standard-parts/${row.id}`),
        axios.get(`/standard-parts/${row.id}/oem-representations`),
        axios.get(`/standard-parts/${row.id}/supplier-parts`),
      ])
      setDetailsData(partData || null)
      setDetailsOemRows(Array.isArray(oemData) ? oemData : [])
      setDetailsSupplierRows(Array.isArray(supplierData) ? supplierData : [])
    } catch (err) {
      console.error("load standard part details error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить карточку стандартной детали")
    } finally {
      setDetailsLoading(false)
    }
  }

  const columns = [
    {
      title: "Класс",
      dataIndex: "class_name",
      width: 220,
      render: (value) => <Tag color="blue">{textOrDash(value)}</Tag>,
    },
    {
      title: "Название",
      dataIndex: "display_name",
      width: 320,
      ellipsis: true,
      render: (value) => <Typography.Text strong ellipsis={{ tooltip: textOrDash(value) }}>{textOrDash(value)}</Typography.Text>,
    },
    {
      title: "Обозначение",
      dataIndex: "designation",
      width: 180,
      ellipsis: true,
      render: (value) => <Typography.Text ellipsis={{ tooltip: textOrDash(value) }}>{textOrDash(value)}</Typography.Text>,
    },
    {
      title: "Описание",
      key: "description",
      width: 260,
      ellipsis: true,
      render: (_, row) => {
        const value = textOrDash(row.description_ru || row.description_en)
        return <Typography.Text ellipsis={{ tooltip: value }}>{value}</Typography.Text>
      },
    },
    {
      title: "OEM",
      dataIndex: "oem_links_count",
      width: 90,
      align: "center",
      render: (value) => value || 0,
    },
    {
      title: "Поставщики",
      dataIndex: "supplier_links_count",
      width: 110,
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
      width: compact ? 250 : 290,
      fixed: "right",
      render: (_, row) => {
        const moreMenuItems = [
          {
            key: "edit",
            label: "Изменить",
            onClick: () => openEdit(row),
          },
          {
            key: "suppliers",
            label: "Связанные поставщики",
            onClick: () => openSupplierLinks(row),
          },
          {
            key: "create_oem",
            label: "Создать OEM-представление",
            onClick: () => openCreateOem(row),
          },
          {
            key: "create_supplier",
            label: "Создать представление поставщика",
            onClick: () => openCreateSupplier(row),
          },
          {
            type: "divider",
          },
          {
            key: "delete",
            danger: true,
            label: "Удалить",
            onClick: () => {
              Modal.confirm({
                title: "Удалить стандартную деталь?",
                content: row.display_name,
                okText: "Удалить",
                cancelText: "Отмена",
                okButtonProps: { danger: true },
                onOk: () => handleDelete(row),
              })
            },
          },
        ]

        return (
          <Space size="small" wrap>
            <Button size="small" type="primary" ghost onClick={() => openDetails(row)}>
              Открыть
            </Button>
            <Dropdown menu={{ items: moreMenuItems }} trigger={["click"]}>
              <Button size="small">Еще</Button>
            </Dropdown>
          </Space>
        )
      },
    },
  ]

  return (
    <Card>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
          <Space wrap>
            <Input.Search
              allowClear
              placeholder="Поиск по классу, названию, обозначению, описанию и атрибутам"
              style={{ width: compact ? 360 : 460 }}
              onSearch={setQuery}
              onChange={(e) => {
                if (!e.target.value) setQuery("")
              }}
            />
            {!embeddedClassId ? (
              <Select
                allowClear
                placeholder="Класс стандартной детали"
                style={{ width: 260 }}
                value={classId}
                options={classOptions}
                onChange={setClassId}
              />
            ) : null}
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
          scroll={{ x: 1640 }}
          pagination={{ pageSize: compact ? 20 : 50, showSizeChanger: false }}
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
        width={900}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={{ uom: "pcs", is_active: true }}>
          <Space wrap style={{ width: "100%" }} size={16}>
              <Form.Item
                label="Класс"
              name="class_id"
              rules={[{ required: true, message: "Выберите класс" }]}
              style={{ width: 280 }}
            >
              <Select
                disabled={!!embeddedClassId}
                options={classOptions}
                onChange={handleClassChange}
                placeholder="Выберите класс"
              />
            </Form.Item>
            <Form.Item label="Обозначение" name="designation" style={{ width: 240 }}>
              <Input placeholder="Опционально" />
            </Form.Item>
            <Form.Item label="Ед. изм." name="uom" style={{ width: 120 }}>
              <Input placeholder="шт" />
            </Form.Item>
          </Space>

          <Space wrap style={{ width: "100%" }} size={16}>
            {classFields.map((field) => (
              <Form.Item
                key={field.id}
                label={field.unit ? `${field.label} (${field.unit})` : field.label}
                name={`field_${field.id}`}
                rules={field.is_required ? [{ required: true, message: `Заполните поле "${field.label}"` }] : undefined}
                style={{ width: field.field_type === "textarea" ? "100%" : 260 }}
              >
                <DynamicFieldInput field={field} />
              </Form.Item>
            ))}
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

      <Modal
        open={oemModalOpen}
        title={oemTargetRow ? `Создать OEM-представление: ${oemTargetRow.display_name}` : "Создать OEM-представление"}
        onCancel={() => setOemModalOpen(false)}
        onOk={handleCreateOem}
        confirmLoading={oemSaving}
        okText="Создать"
        cancelText="Отмена"
        width={760}
        destroyOnHidden
      >
        <Form form={oemForm} layout="vertical" initialValues={{ uom: oemTargetRow?.uom || "pcs" }}>
          <Form.Item
            label="Производитель оборудования"
            name="manufacturer_id"
            rules={[{ required: true, message: "Выберите производителя" }]}
          >
            <Select
              showSearch
              options={manufacturers.map((item) => ({ value: item.id, label: item.name }))}
              onChange={loadModels}
            />
          </Form.Item>

          <Form.Item
            label="Модели оборудования"
            name="equipment_model_ids"
            rules={[{ required: true, message: "Выберите хотя бы одну модель" }]}
          >
            <Select
              mode="multiple"
              options={models.map((item) => ({
                value: item.id,
                label: item.model_code ? `${item.model_name} (${item.model_code})` : item.model_name,
              }))}
            />
          </Form.Item>

          <Space wrap style={{ width: "100%" }} size={16}>
            <Form.Item
              label="OEM номер"
              name="part_number"
              rules={[{ required: true, message: "Введите OEM номер" }]}
              style={{ width: 260 }}
            >
              <Input />
            </Form.Item>
            <Form.Item label="Ед. изм." name="uom" style={{ width: 120 }}>
              <Input />
            </Form.Item>
          </Space>

          <Form.Item label="Описание RU" name="description_ru">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Описание EN" name="description_en">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Тех. описание" name="tech_description">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={supplierModalOpen}
        title={
          supplierTargetRow
            ? `Создать представление поставщика: ${supplierTargetRow.display_name}`
            : "Создать представление поставщика"
        }
        onCancel={() => setSupplierModalOpen(false)}
        onOk={handleCreateSupplier}
        confirmLoading={supplierSaving}
        okText="Создать"
        cancelText="Отмена"
        width={840}
        destroyOnHidden
      >
        <Form form={supplierForm} layout="vertical" initialValues={{ uom: supplierTargetRow?.uom || "pcs", part_type: "ANALOG", is_preferred: true }}>
          <Form.Item
            label="Поставщик"
            name="supplier_id"
            rules={[{ required: true, message: "Выберите поставщика" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={supplierOptions.map((item) => ({ value: item.id, label: item.name }))}
              placeholder="Выберите поставщика"
            />
          </Form.Item>

          <Space wrap style={{ width: "100%" }} size={16}>
            <Form.Item
              label="Номер поставщика"
              name="supplier_part_number"
              rules={[{ required: true, message: "Введите номер поставщика" }]}
              style={{ width: 260 }}
            >
              <Input />
            </Form.Item>
            <Form.Item label="Тип предложения" name="part_type" style={{ width: 180 }}>
              <Select
                options={[
                  { value: "OEM", label: "OEM" },
                  { value: "ANALOG", label: "Аналог" },
                  { value: "UNKNOWN", label: "Не указано" },
                ]}
              />
            </Form.Item>
            <Form.Item label="Ед. изм." name="uom" style={{ width: 120 }}>
              <Input />
            </Form.Item>
          </Space>

          <Form.Item label="Описание RU" name="description_ru">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Описание EN" name="description_en">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Комментарий" name="comment">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Space wrap style={{ width: "100%" }} size={16}>
            <Form.Item label="Срок поставки, дней" name="lead_time_days" style={{ width: 180 }}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="MOQ" name="min_order_qty" style={{ width: 160 }}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="Упаковка" name="packaging" style={{ width: 260 }}>
              <Input />
            </Form.Item>
          </Space>

          <Space wrap style={{ width: "100%" }} size={16}>
            <Form.Item label="Вес, кг" name="weight_kg" style={{ width: 140 }}>
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="Длина, см" name="length_cm" style={{ width: 140 }}>
              <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="Ширина, см" name="width_cm" style={{ width: 140 }}>
              <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="Высота, см" name="height_cm" style={{ width: 140 }}>
              <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
            </Form.Item>
          </Space>

          <Space wrap style={{ width: "100%" }} size={16}>
            <Form.Item label="Стартовая цена" name="initial_price" style={{ width: 180 }}>
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="Валюта" name="initial_currency" style={{ width: 120 }}>
              <Input placeholder="USD" />
            </Form.Item>
            <Form.Item label="Дата цены" name="initial_price_date" style={{ width: 180 }}>
              <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
            </Form.Item>
          </Space>

          <Space wrap size={16}>
            <Form.Item label="Приоритетный поставщик" name="is_preferred" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item label="Тяжелая" name="is_overweight" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item label="Негабарит" name="is_oversize" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>

          <Form.Item label="Комментарий к связи" name="note">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={supplierLinksModalOpen}
        title={
          supplierLinksTargetRow
            ? `Связанные поставщики: ${supplierLinksTargetRow.display_name}`
            : "Связанные поставщики"
        }
        onCancel={() => setSupplierLinksModalOpen(false)}
        footer={null}
        width={980}
        destroyOnHidden
      >
        <Table
          rowKey="supplier_part_id"
          loading={supplierLinksLoading}
          dataSource={supplierLinksRows}
          pagination={false}
          locale={{ emptyText: "У этой стандартной детали пока нет представлений поставщиков" }}
          columns={[
            {
              title: "Поставщик",
              dataIndex: "supplier_name",
              render: (value) => <Typography.Text strong>{textOrDash(value)}</Typography.Text>,
            },
            {
              title: "Номер поставщика",
              dataIndex: "supplier_part_number",
              render: textOrDash,
            },
            {
              title: "Тип",
              dataIndex: "part_type",
              render: (value) =>
                value === "OEM" ? <Tag color="blue">OEM</Tag> : value === "ANALOG" ? <Tag color="green">Аналог</Tag> : <Tag>Не указано</Tag>,
            },
            {
              title: "Коммерция",
              render: (_, row) => (
                <Space direction="vertical" size={0}>
                  <span>{`Lead time: ${textOrDash(row.lead_time_days)}`}</span>
                  <span>{`MOQ: ${textOrDash(row.min_order_qty)}`}</span>
                  <span>{`Упаковка: ${textOrDash(row.packaging)}`}</span>
                </Space>
              ),
            },
            {
              title: "Цена",
              render: (_, row) =>
                row.latest_price != null && row.latest_currency
                  ? `${row.latest_price} ${row.latest_currency}`
                  : "—",
            },
            {
              title: "Статус",
              render: (_, row) => (
                <Space size={4} wrap>
                  {Number(row.is_preferred || 0) > 0 ? <Tag color="gold">Приоритетный</Tag> : null}
                  {Number(row.is_overweight || 0) > 0 ? <Tag color="red">Тяжелая</Tag> : null}
                  {Number(row.is_oversize || 0) > 0 ? <Tag color="orange">Негабарит</Tag> : null}
                </Space>
              ),
            },
            {
              title: "Действия",
              width: 140,
              render: (_, row) => (
                <Button
                  size="small"
                  onClick={() => window.open(`/supplier-parts/${encodeURIComponent(row.supplier_part_id)}`, "_blank")}
                >
                  Открыть
                </Button>
              ),
            },
          ]}
        />
      </Modal>

      <Modal
        open={detailsModalOpen}
        title={detailsData?.display_name || detailsRow?.display_name || "Карточка стандартной детали"}
        onCancel={() => setDetailsModalOpen(false)}
        footer={null}
        width={1080}
        destroyOnHidden
      >
        {detailsLoading ? (
          <Card loading />
        ) : !detailsData ? (
          <Empty description="Карточка стандартной детали не загружена" />
        ) : (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Descriptions
              bordered
              size="small"
              column={2}
              items={[
                {
                  key: "class",
                  label: "Класс",
                  children: detailsData.class_name || "—",
                },
                {
                  key: "uom",
                  label: "Ед. изм.",
                  children: detailsData.uom || "—",
                },
                {
                  key: "designation",
                  label: "Обозначение",
                  children: detailsData.designation || "—",
                },
                {
                  key: "status",
                  label: "Статус",
                  children: detailsData.is_active ? <Tag color="green">Активна</Tag> : <Tag>Неактивна</Tag>,
                },
                {
                  key: "oem",
                  label: "OEM-представления",
                  children: detailsOemRows.length,
                },
                {
                  key: "supplier",
                  label: "Представления поставщиков",
                  children: detailsSupplierRows.length,
                },
                {
                  key: "description_ru",
                  label: "Описание RU",
                  span: 2,
                  children: textOrDash(detailsData.description_ru),
                },
                {
                  key: "description_en",
                  label: "Описание EN",
                  span: 2,
                  children: textOrDash(detailsData.description_en),
                },
                {
                  key: "notes",
                  label: "Заметки",
                  span: 2,
                  children: textOrDash(detailsData.notes),
                },
              ]}
            />

            <Card
              size="small"
              title="Технические параметры"
              extra={
                <Button size="small" onClick={() => openEdit(detailsData)}>
                  Изменить карточку
                </Button>
              }
            >
              {Array.isArray(detailsData.attributes) && detailsData.attributes.length ? (
                <Table
                  rowKey="field_id"
                  size="small"
                  pagination={false}
                  dataSource={detailsData.attributes}
                  columns={[
                    {
                      title: "Параметр",
                      dataIndex: "label",
                      width: 280,
                      render: (value, row) => (
                        <Space direction="vertical" size={0}>
                          <Typography.Text strong>{value}</Typography.Text>
                          {row.help_text ? <Typography.Text type="secondary">{row.help_text}</Typography.Text> : null}
                        </Space>
                      ),
                    },
                    {
                      title: "Значение",
                      render: (_, row) => {
                        const base = formatAttributeValue(row)
                        return row.unit && base !== "—" ? `${base} ${row.unit}` : base
                      },
                    },
                    {
                      title: "Роль в карточке",
                      width: 260,
                      render: (_, row) => (
                        <Space size={4} wrap>
                          {row.is_required ? <Tag color="red">Обязательное</Tag> : null}
                          {row.is_in_title ? <Tag color="blue">В названии</Tag> : null}
                          {row.is_in_list ? <Tag color="cyan">В списке</Tag> : null}
                          {row.is_in_filters ? <Tag color="purple">В фильтрах</Tag> : null}
                        </Space>
                      ),
                    },
                  ]}
                />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Для этой standard part параметры еще не заданы" />
              )}
            </Card>

            <Card size="small" title={`OEM-представления (${detailsOemRows.length})`}>
              <Table
                rowKey="oem_part_id"
                size="small"
                pagination={false}
                locale={{ emptyText: "OEM-представления пока не созданы" }}
                dataSource={detailsOemRows}
                columns={[
                  {
                    title: "Производитель",
                    dataIndex: "manufacturer_name",
                    render: textOrDash,
                  },
                  {
                    title: "OEM-номер",
                    dataIndex: "part_number",
                    render: (value) => <Typography.Text strong>{textOrDash(value)}</Typography.Text>,
                  },
                  {
                    title: "Описание",
                    render: (_, row) => textOrDash(row.description_ru || row.description_en),
                  },
                  {
                    title: "Статус",
                    width: 140,
                    render: (_, row) =>
                      Number(row.is_primary || 0) > 0 ? <Tag color="gold">Основное</Tag> : "—",
                  },
                ]}
              />
            </Card>

            <Card size="small" title={`Представления поставщиков (${detailsSupplierRows.length})`}>
              <Table
                rowKey="supplier_part_id"
                size="small"
                pagination={false}
                locale={{ emptyText: "Представления поставщиков пока не созданы" }}
                dataSource={detailsSupplierRows}
                columns={[
                  {
                    title: "Поставщик",
                    dataIndex: "supplier_name",
                    render: (value) => <Typography.Text strong>{textOrDash(value)}</Typography.Text>,
                  },
                  {
                    title: "Номер поставщика",
                    dataIndex: "supplier_part_number",
                    render: textOrDash,
                  },
                  {
                    title: "Тип",
                    dataIndex: "part_type",
                    render: (value) =>
                      value === "OEM" ? <Tag color="blue">OEM</Tag> : value === "ANALOG" ? <Tag color="green">Аналог</Tag> : <Tag>Не указано</Tag>,
                  },
                  {
                    title: "Цена",
                    render: (_, row) =>
                      row.latest_price != null && row.latest_currency
                        ? `${row.latest_price} ${row.latest_currency}`
                        : "—",
                  },
                  {
                    title: "Срок / MOQ",
                    render: (_, row) => (
                      <Space split={<Divider type="vertical" />} size={4}>
                        <span>{`Lead time: ${textOrDash(row.lead_time_days)}`}</span>
                        <span>{`MOQ: ${textOrDash(row.min_order_qty)}`}</span>
                      </Space>
                    ),
                  },
                  {
                    title: "Статус",
                    render: (_, row) => (
                      <Space size={4} wrap>
                        {Number(row.is_preferred || 0) > 0 ? <Tag color="gold">Приоритетный</Tag> : null}
                        {Number(row.is_overweight || 0) > 0 ? <Tag color="red">Тяжелая</Tag> : null}
                        {Number(row.is_oversize || 0) > 0 ? <Tag color="orange">Негабарит</Tag> : null}
                      </Space>
                    ),
                  },
                ]}
              />
            </Card>
          </Space>
        )}
      </Modal>
    </Card>
  )
}
