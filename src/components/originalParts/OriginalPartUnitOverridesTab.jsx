import React, { useCallback, useEffect, useMemo, useState } from "react"
import dayjs from "dayjs"
import {
  Button,
  Checkbox,
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
import { runTrashDeleteFlow } from "@/utils/trashUi"

const STATUS_OPTIONS = [
  { value: "applies", label: "Базово используется" },
  { value: "excluded", label: "Исключить для этой машины" },
  { value: "replaced", label: "Заменена другой OEM деталью" },
  { value: "variant", label: "Особое исполнение / вариант" },
]

const textOrDash = (value) => {
  const v = String(value || "").trim()
  return v || "—"
}

const fmtNumber = (value) => {
  if (value === undefined || value === null || value === "") return "—"
  const n = Number(value)
  return Number.isFinite(n) ? String(n) : "—"
}

function statusTag(value) {
  if (value === "excluded") return <Tag color="red">Исключена</Tag>
  if (value === "replaced") return <Tag color="orange">Замена</Tag>
  if (value === "variant") return <Tag color="purple">Вариант</Tag>
  if (value === "applies") return <Tag color="green">Переопределена: используется</Tag>
  return <Tag>Базовая модельная применяемость</Tag>
}

function statusHelp(value) {
  if (value === "excluded") return "Используйте, если именно на этой машине деталь не должна применяться."
  if (value === "replaced") return "Используйте, если на этой машине вместо текущей OEM детали применяется другая."
  if (value === "variant") return "Используйте для особого исполнения, дополнительных замечаний или уточняющих характеристик."
  if (value === "applies") return "Используйте, если хотите явно зафиксировать базовое применение именно для этой машины."
  return "Для этой машины действует обычная базовая применяемость по модели."
}

export default function OriginalPartUnitOverridesTab({ partId, part }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [materialsOpen, setMaterialsOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [replacementOptions, setReplacementOptions] = useState([])
  const [materialsRows, setMaterialsRows] = useState([])
  const [materialsLoading, setMaterialsLoading] = useState(false)
  const [materialOptions, setMaterialOptions] = useState([])
  const [materialPickerOpen, setMaterialPickerOpen] = useState(false)
  const [materialSaving, setMaterialSaving] = useState(false)
  const [specOpen, setSpecOpen] = useState(false)
  const [specRecord, setSpecRecord] = useState(null)
  const [specSaving, setSpecSaving] = useState(false)
  const [overrideForm] = Form.useForm()
  const [materialForm] = Form.useForm()
  const [specForm] = Form.useForm()

  const selectedStatus = Form.useWatch("status", overrideForm)

  const load = useCallback(async () => {
    if (!partId) {
      setRows([])
      return
    }
    setLoading(true)
    try {
      const { data } = await axios.get(`/original-parts/${partId}/unit-overrides`)
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /original-parts/:id/unit-overrides error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить привязки по машинам клиентов")
    } finally {
      setLoading(false)
    }
  }, [partId])

  useEffect(() => {
    load()
  }, [load])

  const loadMaterialOverrides = useCallback(async (unitId) => {
    if (!partId || !unitId) {
      setMaterialsRows([])
      return
    }
    setMaterialsLoading(true)
    try {
      const { data } = await axios.get(`/original-parts/${partId}/unit-material-overrides/${unitId}`)
      setMaterialsRows(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /original-parts/:id/unit-material-overrides/:unitId error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить материалы для машины клиента")
    } finally {
      setMaterialsLoading(false)
    }
  }, [partId])

  const fetchReplacementOptions = async (q = "") => {
    try {
      const { data } = await axios.get("/oem-parts", {
        params: {
          q,
          manufacturer_id: part?.manufacturer_id || undefined,
          limit: 50,
        },
      })
      setReplacementOptions(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /oem-parts error:", err)
    }
  }

  const fetchMaterialOptions = async (q = "") => {
    try {
      const { data } = await axios.get("/materials", {
        params: { q, limit: 50 },
      })
      setMaterialOptions(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /materials error:", err)
    }
  }

  const openOverrideModal = (row) => {
    setEditingRow(row)
    overrideForm.setFieldsValue({
      status: row?.override_status || "applies",
      replacement_oem_part_id: row?.replacement_oem_part_id || null,
      note: row?.note || "",
      effective_from: row?.effective_from ? dayjs(row.effective_from) : null,
      effective_to: row?.effective_to ? dayjs(row.effective_to) : null,
    })
    setOverrideOpen(true)
    fetchReplacementOptions("")
  }

  const saveOverride = async () => {
    if (!editingRow?.client_equipment_unit_id) return
    try {
      const values = await overrideForm.validateFields()
      setSaving(true)
      await axios.put(
        `/original-parts/${partId}/unit-overrides/${editingRow.client_equipment_unit_id}`,
        {
          status: values.status,
          replacement_oem_part_id: values.replacement_oem_part_id || null,
          note: values.note || null,
          effective_from: values.effective_from ? values.effective_from.format("YYYY-MM-DD") : null,
          effective_to: values.effective_to ? values.effective_to.format("YYYY-MM-DD") : null,
        },
      )
      message.success("Machine-specific override сохранён")
      setOverrideOpen(false)
      setEditingRow(null)
      await load()
    } catch (err) {
      if (err?.errorFields) return
      console.error("PUT /original-parts/:id/unit-overrides/:unitId error:", err)
      message.error(err?.response?.data?.message || "Не удалось сохранить override")
    } finally {
      setSaving(false)
    }
  }

  const removeOverride = async (row) => {
    try {
      const result = await runTrashDeleteFlow({
        entityType: "oem_part_unit_overrides",
        entityId: partId,
        deleteUrl: `/original-parts/${partId}/unit-overrides/${row.client_equipment_unit_id}`,
        previewParams: { unit_id: row.client_equipment_unit_id },
        successMessage: "Override удалён",
      })
      if (!result?.deleted) return
      await load()
    } catch (err) {
      console.error("DELETE /original-parts/:id/unit-overrides/:unitId error:", err)
      message.error(err?.response?.data?.message || "Не удалось удалить override")
    }
  }

  const openMaterialsModal = async (row) => {
    setEditingRow(row)
    setMaterialsOpen(true)
    setMaterialOptions([])
    materialForm.resetFields()
    await loadMaterialOverrides(row.client_equipment_unit_id)
  }

  const openAddMaterial = () => {
    materialForm.resetFields()
    setMaterialPickerOpen(true)
    fetchMaterialOptions("")
  }

  const saveMaterial = async () => {
    if (!editingRow?.client_equipment_unit_id) return
    try {
      const values = await materialForm.validateFields()
      setMaterialSaving(true)
      await axios.post(
        `/original-parts/${partId}/unit-material-overrides/${editingRow.client_equipment_unit_id}`,
        {
          material_id: values.material_id,
          is_default: values.is_default ? 1 : 0,
          note: values.note || null,
        },
      )
      message.success("Материал для этой машины сохранён")
      setMaterialPickerOpen(false)
      await loadMaterialOverrides(editingRow.client_equipment_unit_id)
      await load()
    } catch (err) {
      if (err?.errorFields) return
      console.error("POST /original-parts/:id/unit-material-overrides/:unitId error:", err)
      message.error(err?.response?.data?.message || "Не удалось сохранить материал")
    } finally {
      setMaterialSaving(false)
    }
  }

  const makeDefaultMaterial = async (record) => {
    if (!editingRow?.client_equipment_unit_id) return
    try {
      await axios.post(
        `/original-parts/${partId}/unit-material-overrides/${editingRow.client_equipment_unit_id}`,
        {
          material_id: record.material_id,
          is_default: 1,
          note: record.note || null,
        },
      )
      await loadMaterialOverrides(editingRow.client_equipment_unit_id)
      await load()
    } catch (err) {
      console.error("makeDefaultMaterial error:", err)
      message.error(err?.response?.data?.message || "Не удалось назначить материал по умолчанию")
    }
  }

  const removeMaterial = async (record) => {
    if (!editingRow?.client_equipment_unit_id) return
    try {
      const result = await runTrashDeleteFlow({
        entityType: "oem_part_unit_material_overrides",
        entityId: partId,
        deleteUrl: `/original-parts/${partId}/unit-material-overrides/${editingRow.client_equipment_unit_id}/${record.material_id}`,
        previewParams: {
          unit_id: editingRow.client_equipment_unit_id,
          material_id: record.material_id,
        },
        successMessage: "Материал удалён",
      })
      if (!result?.deleted) return
      await loadMaterialOverrides(editingRow.client_equipment_unit_id)
      await load()
    } catch (err) {
      console.error("DELETE unit material override error:", err)
      message.error(err?.response?.data?.message || "Не удалось удалить материал")
    }
  }

  const openSpecModal = (record) => {
    setSpecRecord(record)
    specForm.setFieldsValue({
      weight_kg: record?.spec_weight_kg ?? null,
      length_cm: record?.spec_length_cm ?? null,
      width_cm: record?.spec_width_cm ?? null,
      height_cm: record?.spec_height_cm ?? null,
    })
    setSpecOpen(true)
  }

  const saveSpec = async () => {
    if (!editingRow?.client_equipment_unit_id || !specRecord?.material_id) return
    try {
      const values = await specForm.validateFields()
      setSpecSaving(true)
      await axios.put(
        `/original-parts/${partId}/unit-material-specs/${editingRow.client_equipment_unit_id}`,
        {
          material_id: specRecord.material_id,
          weight_kg: values.weight_kg ?? null,
          length_cm: values.length_cm ?? null,
          width_cm: values.width_cm ?? null,
          height_cm: values.height_cm ?? null,
        },
      )
      message.success("Спецификация сохранена")
      setSpecOpen(false)
      setSpecRecord(null)
      await loadMaterialOverrides(editingRow.client_equipment_unit_id)
    } catch (err) {
      if (err?.errorFields) return
      console.error("PUT unit material specs error:", err)
      message.error(err?.response?.data?.message || "Не удалось сохранить спецификацию")
    } finally {
      setSpecSaving(false)
    }
  }

  const rowsWithComputedStatus = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        effective_status: row.override_status || "base",
      })),
    [rows],
  )

  const columns = [
    {
      title: "Клиент",
      dataIndex: "client_name",
      render: (value) => <Typography.Text strong>{textOrDash(value)}</Typography.Text>,
    },
    {
      title: "Машина",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <span>{textOrDash(row.manufacturer_name)} / {textOrDash(row.model_name)}</span>
          {row.model_code ? <Typography.Text type="secondary">{row.model_code}</Typography.Text> : null}
        </Space>
      ),
    },
    {
      title: "Серийный номер",
      dataIndex: "serial_number",
      render: textOrDash,
    },
    {
      title: "Год",
      dataIndex: "manufacture_year",
      width: 100,
      render: (value) => value || "—",
    },
    {
      title: "Статус детали",
      dataIndex: "effective_status",
      width: 220,
      render: (_, row) => statusTag(row.override_status),
    },
    {
      title: "Замена",
      render: (_, row) =>
        row.replacement_part_number ? (
          <Space direction="vertical" size={0}>
            <span style={{ fontWeight: 600 }}>{row.replacement_part_number}</span>
            <Typography.Text type="secondary">
              {textOrDash(row.replacement_description_ru || row.replacement_description_en)}
            </Typography.Text>
          </Space>
        ) : (
          <span style={{ color: "#9ca3af" }}>—</span>
        ),
    },
    {
      title: "Материалы машины",
      width: 220,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <span>
            {Number(row.unit_materials_count) > 0
              ? `Материалов: ${row.unit_materials_count}`
              : "Без отдельных материалов для машины"}
          </span>
          <Typography.Text type="secondary">
            По умолчанию: {textOrDash(row.unit_default_material_name)}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Комментарий",
      dataIndex: "note",
      render: textOrDash,
    },
    {
      title: "Действия",
      key: "actions",
      width: 200,
      render: (_, row) => (
        <Space wrap>
          <Button size="small" onClick={() => openOverrideModal(row)}>
            Настроить
          </Button>
          {row.override_status ? (
            <Popconfirm
              title="Сбросить отдельную настройку для этой машины?"
              okText="Удалить"
              cancelText="Отмена"
              onConfirm={() => removeOverride(row)}
            >
              <Button size="small" danger>
                Сбросить
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ]

  const materialColumns = [
    {
      title: "Материал",
      dataIndex: "material_name",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 600 }}>{textOrDash(row.material_name)}</span>
          <Typography.Text type="secondary">
            {textOrDash(row.material_standard)}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Спецификация",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <span>Вес: {fmtNumber(row.spec_weight_kg)}</span>
          <span>
            Габариты: {fmtNumber(row.spec_length_cm)}×{fmtNumber(row.spec_width_cm)}×{fmtNumber(row.spec_height_cm)}
          </span>
        </Space>
      ),
    },
    {
      title: "По умолчанию",
      dataIndex: "is_default",
      width: 120,
      render: (value) => (value ? <Tag color="blue">Да</Tag> : <Tag>Нет</Tag>),
    },
    {
      title: "Комментарий",
      dataIndex: "note",
      render: textOrDash,
    },
    {
      title: "Действия",
      key: "actions",
      width: 200,
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => openSpecModal(row)}>
            Характеристики
          </Button>
          {!row.is_default ? (
            <Button size="small" onClick={() => makeDefaultMaterial(row)}>
              По умолчанию
            </Button>
          ) : null}
          <Popconfirm
            title="Удалить материал для этой машины?"
            okText="Удалить"
            cancelText="Отмена"
            onConfirm={() => removeMaterial(row)}
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
      <Table
        size="small"
        rowKey={(row) => row.client_equipment_unit_id}
        columns={columns}
        dataSource={rowsWithComputedStatus}
        loading={loading}
        pagination={false}
        locale={{ emptyText: "Для этой OEM детали пока нет техники клиентов по базовой применяемости" }}
      />

      <Modal
        open={overrideOpen}
        title={
          editingRow
            ? `Настройка для машины: ${textOrDash(editingRow.client_name)} / ${textOrDash(editingRow.serial_number)}`
            : "Настройка для машины"
        }
        onCancel={() => {
          setOverrideOpen(false)
          setEditingRow(null)
        }}
        onOk={saveOverride}
        confirmLoading={saving}
        destroyOnHidden
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form layout="vertical" form={overrideForm}>
          <Form.Item
            label="Статус детали на этой машине"
            name="status"
            rules={[{ required: true, message: "Выберите статус" }]}
          >
            <Select options={STATUS_OPTIONS} />
          </Form.Item>

          <Form.Item
            label="Замещающая OEM деталь"
            name="replacement_oem_part_id"
            rules={
              selectedStatus === "replaced"
                ? [{ required: true, message: "Для статуса замены выберите OEM деталь" }]
                : []
            }
          >
            <Select
              allowClear
              showSearch
              placeholder="Поиск по OEM номеру / описанию"
              filterOption={false}
              disabled={selectedStatus !== "replaced"}
              onSearch={fetchReplacementOptions}
              onFocus={() => fetchReplacementOptions("")}
              options={replacementOptions.map((row) => ({
                value: row.id,
                label: `${row.part_number || "—"} · ${row.description_ru || row.description_en || "—"}`,
              }))}
            />
          </Form.Item>

          <Form.Item label="Комментарий" name="note">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Typography.Paragraph type="secondary" style={{ marginTop: -4 }}>
            {statusHelp(selectedStatus)}
          </Typography.Paragraph>

          <Space style={{ width: "100%" }} size={12}>
            <Form.Item label="Действует с" name="effective_from" style={{ flex: 1 }}>
              <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
            </Form.Item>
            <Form.Item label="Действует по" name="effective_to" style={{ flex: 1 }}>
              <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
            </Form.Item>
          </Space>
        </Form>

        {editingRow ? (
          <div style={{ marginTop: 12, borderTop: "1px solid #f0f0f0", paddingTop: 12 }}>
            <Typography.Text strong>Дополнительные уточнения по этой машине</Typography.Text>
            <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 12 }}>
              Если для этой же OEM детали на машине отличаются материалы или характеристики,
              настройте их отдельно здесь. Для обычного базового применения этот блок не нужен.
            </Typography.Paragraph>
            <Button onClick={() => openMaterialsModal(editingRow)}>Материалы и характеристики машины</Button>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={materialsOpen}
        title={
          editingRow
            ? `Материалы для машины: ${textOrDash(editingRow.client_name)} / ${textOrDash(editingRow.serial_number)}`
            : "Материалы для машины"
        }
        onCancel={() => {
          setMaterialsOpen(false)
          setEditingRow(null)
          setMaterialsRows([])
        }}
        footer={[
          <Button key="add" type="primary" onClick={openAddMaterial}>
            Добавить материал
          </Button>,
          <Button
            key="close"
            onClick={() => {
              setMaterialsOpen(false)
              setEditingRow(null)
              setMaterialsRows([])
            }}
          >
            Закрыть
          </Button>,
        ]}
        width={980}
        destroyOnHidden
      >
        <Table
          size="small"
          rowKey={(row) => `${row.client_equipment_unit_id}-${row.material_id}`}
          columns={materialColumns}
          dataSource={materialsRows}
          loading={materialsLoading}
          pagination={false}
          locale={{ emptyText: "Отдельные материалы для этой машины ещё не заданы" }}
        />
      </Modal>

      <Modal
        open={materialPickerOpen}
        title="Добавить материал для этой машины"
        onCancel={() => setMaterialPickerOpen(false)}
        onOk={saveMaterial}
        confirmLoading={materialSaving}
        destroyOnHidden
      >
        <Form layout="vertical" form={materialForm}>
          <Form.Item
            label="Материал"
            name="material_id"
            rules={[{ required: true, message: "Выберите материал" }]}
          >
            <Select
              showSearch
              placeholder="Поиск по материалам"
              filterOption={false}
              onSearch={fetchMaterialOptions}
              onFocus={() => fetchMaterialOptions("")}
              options={materialOptions.map((row) => ({
                value: row.id,
                label: `${row.name || "—"}${row.standard ? ` · ${row.standard}` : ""}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="is_default" valuePropName="checked">
            <Checkbox>Материал по умолчанию для этой машины</Checkbox>
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
        <Form layout="vertical" form={specForm}>
          <Space style={{ width: "100%" }} size={12}>
            <Form.Item label="Вес, кг" name="weight_kg" style={{ flex: 1 }}>
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="Длина, см" name="length_cm" style={{ flex: 1 }}>
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
          </Space>
          <Space style={{ width: "100%" }} size={12}>
            <Form.Item label="Ширина, см" name="width_cm" style={{ flex: 1 }}>
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="Высота, см" name="height_cm" style={{ flex: 1 }}>
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </>
  )
}
