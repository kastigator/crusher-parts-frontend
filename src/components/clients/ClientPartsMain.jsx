import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Button,
  Card,
  Form,
  Input,
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

const RELATIONSHIP_OPTIONS = [
  { value: "client_drawing", label: "По чертежу клиента" },
  { value: "oem_variant", label: "Отличается от OEM" },
  { value: "oem_replacement", label: "Замена OEM" },
  { value: "unknown_oem", label: "OEM неизвестен" },
]

const RELATIONSHIP_LABELS = Object.fromEntries(RELATIONSHIP_OPTIONS.map((item) => [item.value, item.label]))

const RELATIONSHIP_COLORS = {
  client_drawing: "blue",
  oem_variant: "orange",
  oem_replacement: "purple",
  unknown_oem: "default",
}

const STATUS_OPTIONS = [
  { value: "active", label: "Активна" },
  { value: "inactive", label: "Неактивна" },
  { value: "archived", label: "Архив" },
]

const EMPTY_FORM = {
  client_part_number: "",
  drawing_number: "",
  revision_code: "",
  display_name: "",
  classifier_node_id: null,
  relationship_type: "client_drawing",
  base_oem_part_id: null,
  description_ru: "",
  difference_summary: "",
  uom: "шт",
  material_note: "",
  status: "active",
  notes: "",
}

const textOrDash = (value) => {
  const v = String(value || "").trim()
  return v || "—"
}

const buildTreeOptions = (nodes, level = 0) =>
  (nodes || []).flatMap((node) => [
    {
      value: node.id,
      label: `${"\u00a0".repeat(level * 2)}${node.name}`,
    },
    ...buildTreeOptions(node.children || [], level + 1),
  ])

export default function ClientPartsMain({ clientId, onChanged }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [applicationRow, setApplicationRow] = useState(null)
  const [applicationOpen, setApplicationOpen] = useState(false)
  const [applications, setApplications] = useState([])
  const [applicationLoading, setApplicationLoading] = useState(false)
  const [classifierTree, setClassifierTree] = useState([])
  const [oemOptions, setOemOptions] = useState([])
  const [oemLoading, setOemLoading] = useState(false)
  const [equipmentModels, setEquipmentModels] = useState([])
  const [equipmentUnits, setEquipmentUnits] = useState([])
  const [form] = Form.useForm()
  const [applicationForm] = Form.useForm()

  const classifierOptions = useMemo(() => buildTreeOptions(classifierTree), [classifierTree])

  const loadRows = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const { data } = await axios.get("/client-parts", {
        params: { client_id: clientId, limit: 500 },
      })
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /client-parts error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить детали клиента")
    } finally {
      setLoading(false)
    }
  }, [clientId])

  const loadClassifier = useCallback(async () => {
    try {
      const { data } = await axios.get("/equipment-classifier-nodes", {
        params: { tree: 1, limit: 5000 },
      })
      setClassifierTree(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /equipment-classifier-nodes error:", err)
      message.error("Не удалось загрузить НСИ")
    }
  }, [])

  const loadEquipmentContext = useCallback(async () => {
    try {
      const [{ data: modelsData }, { data: unitsData }] = await Promise.all([
        axios.get("/equipment-models"),
        axios.get("/client-equipment-units", {
          params: { client_id: clientId, limit: 1000 },
        }),
      ])
      setEquipmentModels(Array.isArray(modelsData) ? modelsData : [])
      setEquipmentUnits(Array.isArray(unitsData) ? unitsData : [])
    } catch (err) {
      console.error("load equipment context error:", err)
      message.error("Не удалось загрузить модели и машины клиента")
    }
  }, [clientId])

  const searchOemParts = useCallback(async () => {
    setOemOptions([])
    setOemLoading(false)
  }, [])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  useEffect(() => {
    loadClassifier()
  }, [loadClassifier])

  useEffect(() => {
    if (clientId) loadEquipmentContext()
  }, [clientId, loadEquipmentContext])

  const openCreate = () => {
    setEditingRow(null)
    setOemOptions([])
    form.setFieldsValue(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditingRow(row)
    form.setFieldsValue({
      client_part_number: row.client_part_number || "",
      drawing_number: row.drawing_number || "",
      revision_code: row.revision_code || "",
      display_name: row.display_name || "",
      classifier_node_id: row.classifier_node_id || null,
      relationship_type: row.relationship_type || "client_drawing",
      base_oem_part_id: row.base_oem_part_id || null,
      description_ru: row.description_ru || "",
      difference_summary: row.difference_summary || "",
      uom: row.uom || "шт",
      material_note: row.material_note || "",
      status: row.status || "active",
      notes: row.notes || "",
    })
    setOemOptions(
      row.base_oem_part_id
        ? [
            {
              value: row.base_oem_part_id,
              label: [
                row.base_oem_part_number,
                row.base_oem_manufacturer_name,
                row.base_oem_description_ru || row.base_oem_description_en,
              ]
                .filter(Boolean)
                .join(" / "),
            },
          ]
        : [],
    )
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        client_id: clientId,
        client_part_number: values.client_part_number || null,
        drawing_number: values.drawing_number || null,
        revision_code: values.revision_code || null,
        display_name: values.display_name,
        classifier_node_id: values.classifier_node_id || null,
        relationship_type: values.relationship_type || "client_drawing",
        base_oem_part_id: values.base_oem_part_id || null,
        description_ru: values.description_ru || null,
        difference_summary: values.difference_summary || null,
        uom: values.uom || "шт",
        material_note: values.material_note || null,
        status: values.status || "active",
        notes: values.notes || null,
      }

      setSaving(true)
      if (editingRow?.id) {
        await axios.put(`/client-parts/${editingRow.id}`, payload)
        message.success("Деталь клиента обновлена")
      } else {
        await axios.post("/client-parts", payload)
        message.success("Деталь клиента добавлена")
      }
      setModalOpen(false)
      await loadRows()
      onChanged?.()
    } catch (err) {
      if (err?.errorFields) return
      console.error("save client part error:", err)
      message.error(err?.response?.data?.message || "Не удалось сохранить деталь клиента")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row) => {
    try {
      await axios.delete(`/client-parts/${row.id}`)
      message.success("Деталь клиента перемещена в корзину")
      await loadRows()
      onChanged?.()
    } catch (err) {
      console.error("DELETE /client-parts/:id error:", err)
      message.error(err?.response?.data?.message || "Не удалось удалить деталь клиента")
    }
  }

  const loadApplications = useCallback(async (row) => {
    if (!row?.id) return
    setApplicationLoading(true)
    try {
      const { data } = await axios.get(`/client-parts/${row.id}`)
      setApplications(Array.isArray(data?.applications) ? data.applications : [])
      setApplicationRow(data || row)
    } catch (err) {
      console.error("GET /client-parts/:id error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить применяемость")
    } finally {
      setApplicationLoading(false)
    }
  }, [])

  const openApplications = async (row) => {
    setApplicationRow(row)
    setApplications([])
    applicationForm.resetFields()
    setApplicationOpen(true)
    await loadApplications(row)
  }

  const handleAddApplication = async () => {
    if (!applicationRow?.id) return
    try {
      const values = await applicationForm.validateFields()
      if (!values.equipment_model_id && !values.client_equipment_unit_id) {
        message.warning("Выберите модель или конкретную машину клиента")
        return
      }
      setApplicationLoading(true)
      await axios.post(`/client-parts/${applicationRow.id}/applications`, {
        equipment_model_id: values.equipment_model_id || null,
        client_equipment_unit_id: values.client_equipment_unit_id || null,
        note: values.note || null,
      })
      message.success("Применяемость добавлена")
      applicationForm.resetFields()
      await loadApplications(applicationRow)
      await loadRows()
      onChanged?.()
    } catch (err) {
      if (err?.errorFields) return
      console.error("POST /client-parts/:id/applications error:", err)
      message.error(err?.response?.data?.message || "Не удалось добавить применяемость")
    } finally {
      setApplicationLoading(false)
    }
  }

  const handleDeleteApplication = async (row) => {
    if (!applicationRow?.id || !row?.id) return
    try {
      setApplicationLoading(true)
      await axios.delete(`/client-parts/${applicationRow.id}/applications/${row.id}`)
      message.success("Применяемость удалена")
      await loadApplications(applicationRow)
      await loadRows()
      onChanged?.()
    } catch (err) {
      console.error("DELETE /client-parts/:id/applications/:applicationId error:", err)
      message.error(err?.response?.data?.message || "Не удалось удалить применяемость")
    } finally {
      setApplicationLoading(false)
    }
  }

  const modelOptions = useMemo(
    () =>
      equipmentModels.map((row) => ({
        value: row.id,
        label: [row.manufacturer_name, row.model_name, row.model_code].filter(Boolean).join(" / "),
      })),
    [equipmentModels],
  )

  const unitOptions = useMemo(
    () =>
      equipmentUnits.map((row) => ({
        value: row.id,
        label: [
          row.internal_name,
          row.manufacturer_name,
          row.model_name,
          row.serial_number ? `SN ${row.serial_number}` : null,
          row.site_name,
        ]
          .filter(Boolean)
          .join(" / "),
        equipment_model_id: row.equipment_model_id,
      })),
    [equipmentUnits],
  )

  const applicationColumns = [
    {
      title: "Применяется",
      render: (_, row) => {
        const modelLabel = [row.manufacturer_name, row.model_name, row.model_code].filter(Boolean).join(" / ")
        const unitLabel = [row.internal_name, row.serial_number ? `SN ${row.serial_number}` : null, row.site_name]
          .filter(Boolean)
          .join(" / ")
        return (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>
              {row.client_equipment_unit_id ? unitLabel || `Машина #${row.client_equipment_unit_id}` : modelLabel || "—"}
            </Typography.Text>
            <Typography.Text type="secondary">
              {row.client_equipment_unit_id ? modelLabel || "—" : "На уровне модели"}
            </Typography.Text>
          </Space>
        )
      },
    },
    {
      title: "Комментарий",
      dataIndex: "note",
      render: textOrDash,
    },
    {
      title: "",
      width: 100,
      render: (_, row) => (
        <Popconfirm
          title="Удалить применяемость?"
          okText="Удалить"
          cancelText="Отмена"
          onConfirm={() => handleDeleteApplication(row)}
        >
          <Button size="small" danger>
            Удалить
          </Button>
        </Popconfirm>
      ),
    },
  ]

  const columns = [
    {
      title: "Деталь клиента",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{textOrDash(row.display_name)}</Typography.Text>
          <Typography.Text type="secondary">
            {[row.client_part_number, row.drawing_number, row.revision_code].filter(Boolean).join(" / ") || "без номера"}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "НСИ",
      dataIndex: "classifier_node_name",
      width: 220,
      render: (value) => (value ? <Tag color="blue">{value}</Tag> : <Tag>Без узла</Tag>),
    },
    {
      title: "Тип",
      dataIndex: "relationship_type",
      width: 170,
      render: (value) => (
        <Tag color={RELATIONSHIP_COLORS[value] || "default"}>
          {RELATIONSHIP_LABELS[value] || value || "—"}
        </Tag>
      ),
    },
    {
      title: "Отличие",
      dataIndex: "difference_summary",
      width: 220,
      render: textOrDash,
    },
    {
      title: "Материал",
      dataIndex: "material_note",
      width: 180,
      render: textOrDash,
    },
    {
      title: "Применяемость",
      dataIndex: "applications_count",
      width: 130,
      align: "center",
      render: (value) => Number(value) || 0,
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
      width: 180,
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => openEdit(row)}>
            Изменить
          </Button>
          <Button size="small" onClick={() => openApplications(row)}>
            Применяемость
          </Button>
          <Popconfirm
            title="Удалить деталь клиента?"
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
            Детали клиента по чертежам живут отдельно от каталога модели. Модель или конкретная машина указываются только если это нужно.
          </Typography.Text>
          <Button type="primary" onClick={openCreate}>
            Добавить деталь
          </Button>
        </Space>

        <Table
          rowKey="id"
          dataSource={rows}
          loading={loading}
          columns={columns}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          scroll={{ x: 1320 }}
          locale={{ emptyText: "Нет деталей клиента по чертежам" }}
        />
      </Space>

      <Modal
        open={modalOpen}
        title={editingRow ? "Редактирование детали клиента" : "Новая деталь клиента по чертежу"}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        okText={editingRow ? "Сохранить" : "Создать"}
        cancelText="Отмена"
        width={760}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={EMPTY_FORM}>
          <Space wrap size={16} style={{ width: "100%" }}>
            <Form.Item
              label="Название"
              name="display_name"
              rules={[{ required: true, message: "Укажите название детали" }]}
              style={{ width: 340 }}
            >
              <Input placeholder="Например: Футеровка 5" />
            </Form.Item>
            <Form.Item label="Узел НСИ" name="classifier_node_id" style={{ width: 340 }}>
              <Select
                allowClear
                showSearch
                placeholder="Выберите раздел НСИ"
                optionFilterProp="label"
                options={classifierOptions}
              />
            </Form.Item>
            <Form.Item label="Тип детали клиента" name="relationship_type" style={{ width: 220 }}>
              <Select options={RELATIONSHIP_OPTIONS} />
            </Form.Item>
            <Form.Item label="Номер клиента" name="client_part_number" style={{ width: 220 }}>
              <Input />
            </Form.Item>
            <Form.Item label="Номер чертежа" name="drawing_number" style={{ width: 220 }}>
              <Input />
            </Form.Item>
            <Form.Item label="Ревизия" name="revision_code" style={{ width: 140 }}>
              <Input />
            </Form.Item>
            <Form.Item label="Ед. изм." name="uom" style={{ width: 120 }}>
              <Input />
            </Form.Item>
            <Form.Item label="Статус" name="status" style={{ width: 160 }}>
              <Select options={STATUS_OPTIONS} />
            </Form.Item>
            <Form.Item label="Материал / исполнение" name="material_note" style={{ width: 340 }}>
              <Input placeholder="Например: 110Г13Л, по чертежу клиента" />
            </Form.Item>
          </Space>
          <Form.Item label="Описание" name="description_ru">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Чем отличается / почему отдельная карточка" name="difference_summary">
            <Input.TextArea rows={2} placeholder="Например: старая ревизия узла, другой материал, измененная посадка, замена оригинала" />
          </Form.Item>
          <Form.Item label="Заметки" name="notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={applicationOpen}
        title={`Применяемость: ${applicationRow?.display_name || ""}`}
        onCancel={() => setApplicationOpen(false)}
        footer={null}
        width={860}
        destroyOnHidden
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Typography.Text type="secondary">
            Если деталь подходит всем машинам одной модели, выберите модель. Если отличие относится только к конкретной машине клиента, выберите машину.
          </Typography.Text>
          <Form form={applicationForm} layout="vertical">
            <Space wrap align="end">
              <Form.Item label="Модель оборудования" name="equipment_model_id" style={{ width: 280 }}>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={modelOptions}
                  placeholder="Любая модель из НСИ"
                />
              </Form.Item>
              <Form.Item label="Машина клиента" name="client_equipment_unit_id" style={{ width: 320 }}>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={unitOptions}
                  placeholder="Конкретная машина клиента"
                  onChange={(value, option) => {
                    if (option?.equipment_model_id) {
                      applicationForm.setFieldsValue({ equipment_model_id: option.equipment_model_id })
                    }
                  }}
                />
              </Form.Item>
              <Form.Item label="Комментарий" name="note" style={{ width: 420 }}>
                <Input placeholder="Например: старая ревизия, другой материал, только SN..." />
              </Form.Item>
              <Form.Item>
                <Button type="primary" onClick={handleAddApplication} loading={applicationLoading}>
                  Добавить
                </Button>
              </Form.Item>
            </Space>
          </Form>
          <Table
            size="small"
            rowKey="id"
            columns={applicationColumns}
            dataSource={applications}
            loading={applicationLoading}
            pagination={false}
            locale={{ emptyText: "Применяемость еще не указана" }}
            scroll={{ x: 760 }}
          />
        </Space>
      </Modal>
    </Card>
  )
}
