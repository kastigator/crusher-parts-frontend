import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Drawer,
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
  Tabs,
  Tag,
  Tree,
  Typography,
  message,
} from "antd"
import axios from "@/api/axiosInstance"
import { runTrashDeleteFlow } from "@/utils/trashUi"
import StandardPartsMain from "./StandardPartsMain"

const FIELD_TYPE_OPTIONS = [
  { value: "text", label: "Текст" },
  { value: "textarea", label: "Текст многострочный" },
  { value: "number", label: "Число" },
  { value: "boolean", label: "Да / Нет" },
  { value: "select", label: "Список" },
  { value: "multiselect", label: "Множественный список" },
  { value: "date", label: "Дата" },
]

const EMPTY_CLASS_FORM = {
  name: "",
  code: "",
  description: "",
  sort_order: 0,
  is_active: true,
}

const EMPTY_FIELD_FORM = {
  code: "",
  label: "",
  field_type: "text",
  sort_order: 0,
  is_required: false,
  is_active: true,
  is_in_title: false,
  is_in_list: false,
  is_in_filters: false,
  is_searchable: false,
  unit: "",
  placeholder: "",
  help_text: "",
}

const CLASSIFIER_HELP_SECTIONS = [
  {
    title: "Зачем нужен классификатор",
    body:
      "Классификатор задает типы стандартных изделий и набор их полей. Сначала вы создаете класс, затем настраиваете его поля, и только после этого заполняете каталог стандартных деталей.",
  },
  {
    title: "Как создавать структуру",
    body:
      "Используйте дерево слева для иерархии. Например: «Крепеж → Болты → Высокопрочные болты» или «Электрооборудование → Электродвигатели». Корневой класс — верхний уровень, подкласс — уточняющая категория внутри выбранного класса.",
  },
  {
    title: "Что такое поля класса",
    body:
      "Поле класса описывает одно свойство изделия. Например, для электродвигателя это могут быть «Мощность», «Напряжение», «Обороты», «Степень защиты». Именно эти поля потом появляются в форме создания standard part.",
  },
  {
    title: "Что значит «Порядок сортировки»",
    body:
      "Это служебное число, которое определяет, в каком порядке классы, поля и варианты списка показываются в интерфейсе. Меньшее число показывается выше. Если порядок не важен, можно оставить 0.",
  },
  {
    title: "Как понимать флаги поля",
    body:
      "«В заголовке» включает поле в автосборку названия standard part. «В списке» показывает его в каталогах и таблицах. «В фильтрах» делает поле доступным для отбора. «В поиске» добавляет значение поля в общий поиск.",
  },
  {
    title: "Рекомендуемый сценарий",
    body:
      "1. Создайте класс. 2. Добавьте 3-5 ключевых полей. 3. Проверьте, как выглядит форма standard part. 4. Только потом заводите OEM- и supplier-представления.",
  },
]

const CYRILLIC_MAP = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
}

const slugifyCode = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .split("")
    .map((char) => CYRILLIC_MAP[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_")

const buildTreeData = (nodes) =>
  (nodes || []).map((node) => ({
    key: String(node.id),
    title: (
      <Space size={6}>
        <span>{node.name}</span>
        <Tag bordered={false} color={node.is_active ? "blue" : "default"}>
          {node.parts_count || 0}
        </Tag>
      </Space>
    ),
    children: buildTreeData(node.children || []),
  }))

const flattenTree = (nodes, map = new Map()) => {
  ;(nodes || []).forEach((node) => {
    map.set(Number(node.id), node)
    flattenTree(node.children || [], map)
  })
  return map
}

export default function StandardPartsClassifierMain() {
  const [treeRows, setTreeRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [workspace, setWorkspace] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [classModalOpen, setClassModalOpen] = useState(false)
  const [classSaving, setClassSaving] = useState(false)
  const [editingClass, setEditingClass] = useState(null)
  const [parentForCreate, setParentForCreate] = useState(null)
  const [fieldModalOpen, setFieldModalOpen] = useState(false)
  const [fieldSaving, setFieldSaving] = useState(false)
  const [editingField, setEditingField] = useState(null)
  const [optionsModalOpen, setOptionsModalOpen] = useState(false)
  const [optionSaving, setOptionSaving] = useState(false)
  const [optionField, setOptionField] = useState(null)
  const [optionForm] = Form.useForm()
  const [classForm] = Form.useForm()
  const [fieldForm] = Form.useForm()
  const [activeTab, setActiveTab] = useState("fields")
  const [classCodeDirty, setClassCodeDirty] = useState(false)
  const [fieldCodeDirty, setFieldCodeDirty] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const loadTree = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/standard-part-classes", {
        params: { tree: 1, limit: 5000 },
      })
      const rows = Array.isArray(data) ? data : []
      setTreeRows(rows)
      if (!selectedId && rows[0]?.id) setSelectedId(rows[0].id)
    } catch (err) {
      console.error("GET /standard-part-classes error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить классификатор стандартных деталей")
    } finally {
      setLoading(false)
    }
  }, [selectedId])

  const loadWorkspace = useCallback(async (classId) => {
    if (!classId) {
      setWorkspace(null)
      return
    }
    setWorkspaceLoading(true)
    try {
      const { data } = await axios.get(`/standard-part-classes/${classId}/workspace`)
      setWorkspace(data || null)
    } catch (err) {
      console.error("GET /standard-part-classes/:id/workspace error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить workspace класса")
      setWorkspace(null)
    } finally {
      setWorkspaceLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTree()
  }, [loadTree])

  useEffect(() => {
    if (selectedId) loadWorkspace(selectedId)
    else setWorkspace(null)
  }, [selectedId, loadWorkspace])

  const nodeMap = useMemo(() => flattenTree(treeRows), [treeRows])
  const selectedNode = selectedId ? nodeMap.get(Number(selectedId)) || null : null
  const treeData = useMemo(() => buildTreeData(treeRows), [treeRows])
  const fields = Array.isArray(workspace?.fields) ? workspace.fields : []
  const oemRepresentations = Array.isArray(workspace?.oem_representations) ? workspace.oem_representations : []
  const supplierRepresentations = Array.isArray(workspace?.supplier_representations)
    ? workspace.supplier_representations
    : []

  const openCreateRoot = () => {
    setClassCodeDirty(false)
    setEditingClass(null)
    setParentForCreate(null)
    classForm.setFieldsValue(EMPTY_CLASS_FORM)
    setClassModalOpen(true)
  }

  const openCreateChild = () => {
    if (!selectedNode) {
      message.warning("Сначала выберите родительский класс")
      return
    }
    setClassCodeDirty(false)
    setEditingClass(null)
    setParentForCreate(selectedNode)
    classForm.setFieldsValue(EMPTY_CLASS_FORM)
    setClassModalOpen(true)
  }

  const openEditClass = () => {
    if (!selectedNode) {
      message.warning("Сначала выберите класс")
      return
    }
    setClassCodeDirty(true)
    setEditingClass(selectedNode)
    setParentForCreate(null)
    classForm.setFieldsValue({
      name: selectedNode.name || "",
      code: selectedNode.code || "",
      description: selectedNode.description || "",
      sort_order: selectedNode.sort_order || 0,
      is_active: !!selectedNode.is_active,
    })
    setClassModalOpen(true)
  }

  const saveClass = async () => {
    try {
      const values = await classForm.validateFields()
      setClassSaving(true)
      const payload = {
        parent_id: editingClass ? editingClass.parent_id : parentForCreate?.id || null,
        name: values.name,
        code: values.code,
        description: values.description || null,
        sort_order: values.sort_order ?? 0,
        is_active: values.is_active ? 1 : 0,
      }
      if (editingClass?.id) {
        await axios.put(`/standard-part-classes/${editingClass.id}`, payload)
        message.success("Класс обновлён")
      } else {
        const { data } = await axios.post("/standard-part-classes", payload)
        message.success("Класс создан")
        if (data?.id) setSelectedId(data.id)
      }
      setClassModalOpen(false)
      await loadTree()
      if (selectedId || editingClass?.id) await loadWorkspace(editingClass?.id || selectedId)
    } catch (err) {
      if (err?.errorFields) return
      console.error("save class error:", err)
      message.error(err?.response?.data?.message || "Не удалось сохранить класс")
    } finally {
      setClassSaving(false)
    }
  }

  const deleteClass = async () => {
    if (!selectedNode?.id) return
    try {
      const result = await runTrashDeleteFlow({
        entityType: "standard_part_classes",
        entityId: selectedNode.id,
        deleteUrl: `/standard-part-classes/${selectedNode.id}`,
        successMessage: "Класс перемещён в корзину",
      })
      if (!result?.deleted) return
      setSelectedId(null)
      await loadTree()
    } catch (err) {
      console.error("delete class error:", err)
      message.error(err?.response?.data?.message || "Не удалось удалить класс")
    }
  }

  const openCreateField = () => {
    if (!selectedNode?.id) {
      message.warning("Сначала выберите класс")
      return
    }
    setFieldCodeDirty(false)
    setEditingField(null)
    fieldForm.setFieldsValue(EMPTY_FIELD_FORM)
    setFieldModalOpen(true)
  }

  const openEditField = (field) => {
    setFieldCodeDirty(true)
    setEditingField(field)
    fieldForm.setFieldsValue({
      code: field.code || "",
      label: field.label || "",
      field_type: field.field_type || "text",
      sort_order: field.sort_order || 0,
      is_required: !!field.is_required,
      is_active: !!field.is_active,
      is_in_title: !!field.is_in_title,
      is_in_list: !!field.is_in_list,
      is_in_filters: !!field.is_in_filters,
      is_searchable: !!field.is_searchable,
      unit: field.unit || "",
      placeholder: field.placeholder || "",
      help_text: field.help_text || "",
    })
    setFieldModalOpen(true)
  }

  const saveField = async () => {
    if (!selectedNode?.id) return
    try {
      const values = await fieldForm.validateFields()
      setFieldSaving(true)
      const payload = {
        code: values.code,
        label: values.label,
        field_type: values.field_type,
        sort_order: values.sort_order ?? 0,
        is_required: values.is_required ? 1 : 0,
        is_active: values.is_active ? 1 : 0,
        is_in_title: values.is_in_title ? 1 : 0,
        is_in_list: values.is_in_list ? 1 : 0,
        is_in_filters: values.is_in_filters ? 1 : 0,
        is_searchable: values.is_searchable ? 1 : 0,
        unit: values.unit || null,
        placeholder: values.placeholder || null,
        help_text: values.help_text || null,
      }
      if (editingField?.id) {
        await axios.put(`/standard-part-classes/fields/${editingField.id}`, payload)
        message.success("Поле обновлено")
      } else {
        await axios.post(`/standard-part-classes/${selectedNode.id}/fields`, payload)
        message.success("Поле создано")
      }
      setFieldModalOpen(false)
      await loadWorkspace(selectedNode.id)
    } catch (err) {
      if (err?.errorFields) return
      console.error("save field error:", err)
      message.error(err?.response?.data?.message || "Не удалось сохранить поле")
    } finally {
      setFieldSaving(false)
    }
  }

  const deleteField = async (field) => {
    try {
      const result = await runTrashDeleteFlow({
        entityType: "standard_part_class_fields",
        entityId: field.id,
        deleteUrl: `/standard-part-classes/fields/${field.id}`,
        successMessage: "Поле перемещено в корзину",
      })
      if (!result?.deleted) return
      await loadWorkspace(selectedNode.id)
    } catch (err) {
      console.error("delete field error:", err)
      message.error(err?.response?.data?.message || "Не удалось удалить поле")
    }
  }

  const openOptions = (field) => {
    setOptionField(field)
    optionForm.resetFields()
    setOptionsModalOpen(true)
  }

  const saveOption = async () => {
    if (!optionField?.id) return
    try {
      const values = await optionForm.validateFields()
      setOptionSaving(true)
      await axios.post(`/standard-part-classes/fields/${optionField.id}/options`, {
        value_code: values.value_code,
        value_label: values.value_label,
        sort_order: values.sort_order ?? 0,
        is_active: values.is_active ? 1 : 0,
      })
      message.success("Опция создана")
      optionForm.resetFields()
      await loadWorkspace(selectedNode.id)
    } catch (err) {
      if (err?.errorFields) return
      console.error("save option error:", err)
      message.error(err?.response?.data?.message || "Не удалось сохранить опцию")
    } finally {
      setOptionSaving(false)
    }
  }

  const deleteOption = async (option) => {
    try {
      const result = await runTrashDeleteFlow({
        entityType: "standard_part_field_options",
        entityId: option.id,
        deleteUrl: `/standard-part-classes/field-options/${option.id}`,
        successMessage: "Опция перемещена в корзину",
      })
      if (!result?.deleted) return
      await loadWorkspace(selectedNode.id)
    } catch (err) {
      console.error("delete option error:", err)
      message.error(err?.response?.data?.message || "Не удалось удалить опцию")
    }
  }

  const workspaceTitle = selectedNode ? (
    <Space wrap>
      <Typography.Title level={4} style={{ margin: 0 }}>
        {selectedNode.name}
      </Typography.Title>
      <Tag>{`Код: ${selectedNode.code}`}</Tag>
      <Tag color={selectedNode.is_active ? "green" : "default"}>
        {selectedNode.is_active ? "Активен" : "Неактивен"}
      </Tag>
    </Space>
  ) : null

  const fieldExamplesByClass = {
    default: ["Обозначение", "Стандарт", "Материал"],
    electric_motors: ["Мощность", "Напряжение", "Обороты", "Степень защиты"],
    bolts: ["Размер резьбы", "Длина", "Класс прочности", "Покрытие"],
    nuts: ["Размер резьбы", "Класс прочности", "Стандарт", "Покрытие"],
    washers: ["Внутренний диаметр", "Наружный диаметр", "Толщина", "Стандарт"],
  }
  const fieldExamples =
    fieldExamplesByClass[selectedNode?.code] || fieldExamplesByClass.default
  const nextStepAlert = selectedNode
    ? fields.length === 0
      ? {
          type: "info",
          message: "Сначала настройте поля класса",
          description: `Добавьте поля, из которых будет состоять карточка класса «${selectedNode.name}». Например: ${fieldExamples.join(", ")}.`,
          action: null,
        }
      : (workspace?.stats?.parts_count || 0) === 0
        ? {
            type: "success",
            message: "Структура класса готова",
            description:
              "Теперь можно создавать стандартные детали этого класса. Форма заполнения будет построена по настроенным полям.",
            action: null,
          }
        : {
            type: "success",
            message: "Класс используется в каталоге",
            description:
              "При необходимости добавьте новые поля, OEM-представления или представления поставщиков.",
            action: null,
          }
    : null

  return (
    <>
      <Card>
        <Space align="start" style={{ width: "100%" }} size={16}>
          <Card title="Классы стандартных деталей" style={{ width: 360, flex: "0 0 360px" }}>
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Space wrap>
                <Button size="small" onClick={openCreateRoot}>
                  Новый корневой класс
                </Button>
                <Button size="small" type="primary" onClick={openCreateChild}>
                  Новый подкласс
                </Button>
              </Space>
              {treeRows.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Классы еще не созданы"
                >
                  <Button type="primary" onClick={openCreateRoot}>
                    Создать первый класс
                  </Button>
                </Empty>
              ) : (
                <Tree
                  selectedKeys={selectedId ? [String(selectedId)] : []}
                  onSelect={(keys) => setSelectedId(keys[0] ? Number(keys[0]) : null)}
                  treeData={treeData}
                  loading={loading}
                />
              )}
            </Space>
          </Card>

          <Card
            title={workspaceTitle || "Рабочая область класса"}
            style={{ width: "100%" }}
            loading={workspaceLoading}
            extra={
              <Space size="small">
                <Button size="small" onClick={() => setHelpOpen(true)}>
                  Справка
                </Button>
                {selectedNode ? (
                  <>
                    <Button size="small" onClick={openEditClass}>
                      Изменить класс
                    </Button>
                    <Popconfirm
                      title="Удалить класс?"
                      description={selectedNode.name}
                      okText="Удалить"
                      cancelText="Отмена"
                      onConfirm={deleteClass}
                    >
                      <Button size="small" danger>
                        Удалить класс
                      </Button>
                    </Popconfirm>
                  </>
                ) : null}
              </Space>
            }
          >
            {!selectedNode ? (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <Typography.Text type="secondary">
                  Создайте класс и затем настройте его поля. Полная логика работы описана в справке.
                </Typography.Text>
                <Space>
                  <Button type="primary" onClick={openCreateRoot}>
                    Создать первый класс
                  </Button>
                  <Button onClick={() => setHelpOpen(true)}>
                    Открыть справку
                  </Button>
                </Space>
              </Space>
            ) : (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <Space wrap size={[8, 8]}>
                  <Tag color="blue">{`Путь: ${workspace?.class?.path_display || selectedNode.name || "—"}`}</Tag>
                  <Tag>{`Полей: ${fields.length}`}</Tag>
                  <Tag>{`Стандартных деталей: ${workspace?.stats?.parts_count || 0}`}</Tag>
                  <Tag color={fields.length === 0 ? "gold" : workspace?.stats?.parts_count ? "green" : "cyan"}>
                    {fields.length === 0
                      ? "Нужно настроить поля"
                      : workspace?.stats?.parts_count
                        ? "Класс используется"
                        : "Готов к наполнению"}
                  </Tag>
                </Space>
                {nextStepAlert ? (
                  <Alert
                    showIcon
                    type={nextStepAlert.type}
                    message={nextStepAlert.message}
                    description={nextStepAlert.description}
                    action={nextStepAlert.action}
                  />
                ) : null}
                <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                  {
                    key: "fields",
                    label: `Структура класса (${fields.length})`,
                    children: (
                      <Space direction="vertical" size={12} style={{ width: "100%" }}>
                        <Space style={{ justifyContent: "space-between", width: "100%" }}>
                          <Typography.Text type="secondary">
                            Поля определяют структуру карточки standard part этого класса.
                          </Typography.Text>
                          <Button type="primary" onClick={openCreateField}>
                            Добавить поле
                          </Button>
                        </Space>
                        <Table
                          rowKey="id"
                          size="small"
                          pagination={false}
                          dataSource={fields}
                          locale={{
                            emptyText: (
                              <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={`У класса «${selectedNode.name}» пока нет полей`}
                              >
                                <Typography.Text type="secondary">
                                  Начните с 3-5 основных полей: {fieldExamples.join(", ")}.
                                </Typography.Text>
                              </Empty>
                            ),
                          }}
                          columns={[
                            { title: "Название поля", dataIndex: "label", render: (value) => <Typography.Text strong>{value}</Typography.Text> },
                            { title: "Внутренний код", dataIndex: "code" },
                            { title: "Тип поля", dataIndex: "field_type", render: (value) => FIELD_TYPE_OPTIONS.find((item) => item.value === value)?.label || value },
                            { title: "В заголовке", dataIndex: "is_in_title", align: "center", render: (value) => (value ? "Да" : "Нет") },
                            { title: "В списке", dataIndex: "is_in_list", align: "center", render: (value) => (value ? "Да" : "Нет") },
                            { title: "В фильтрах", dataIndex: "is_in_filters", align: "center", render: (value) => (value ? "Да" : "Нет") },
                            { title: "Обяз.", dataIndex: "is_required", align: "center", render: (value) => (value ? "Да" : "Нет") },
                            {
                              title: "Опции",
                              key: "options",
                              render: (_, field) =>
                                field.field_type === "select" || field.field_type === "multiselect" ? (
                                  <Button size="small" onClick={() => openOptions(field)}>
                                    Опции ({Array.isArray(field.options) ? field.options.length : 0})
                                  </Button>
                                ) : (
                                  "—"
                                ),
                            },
                            {
                              title: "Действия",
                              key: "actions",
                              render: (_, field) => (
                                <Space size="small">
                                  <Button size="small" onClick={() => openEditField(field)}>
                                    Изменить
                                  </Button>
                                  <Popconfirm
                                    title="Удалить поле?"
                                    description={field.label}
                                    okText="Удалить"
                                    cancelText="Отмена"
                                    onConfirm={() => deleteField(field)}
                                  >
                                    <Button size="small" danger>
                                      Удалить
                                    </Button>
                                  </Popconfirm>
                                </Space>
                              ),
                            },
                          ]}
                        />
                      </Space>
                    ),
                  },
                  {
                    key: "parts",
                    label: `Стандартные детали (${workspace?.stats?.parts_count || 0})`,
                    children: (
                      <StandardPartsMain
                        embeddedClassId={selectedNode.id}
                        compact
                        onChanged={() => loadWorkspace(selectedNode.id)}
                      />
                    ),
                  },
                  {
                    key: "oem",
                    label: `OEM-представления (${workspace?.stats?.oem_representations_count || 0})`,
                    children: (
                      <Table
                        rowKey={(row) => `${row.standard_part_id}:${row.oem_part_id}`}
                        size="small"
                        pagination={false}
                        dataSource={oemRepresentations}
                        columns={[
                          { title: "Стандартная деталь", dataIndex: "standard_part_display_name", render: (value) => <Typography.Text strong>{value}</Typography.Text> },
                          { title: "Производитель", dataIndex: "manufacturer_name" },
                          { title: "OEM-номер", dataIndex: "part_number" },
                          {
                            title: "Описание",
                            render: (_, row) => row.description_ru || row.description_en || "—",
                          },
                        ]}
                      />
                    ),
                  },
                  {
                    key: "suppliers",
                    label: `Поставщики (${workspace?.stats?.supplier_representations_count || 0})`,
                    children: (
                      <Table
                        rowKey={(row) => `${row.standard_part_id}:${row.supplier_part_id}`}
                        size="small"
                        pagination={false}
                        dataSource={supplierRepresentations}
                        columns={[
                          {
                            title: "Стандартная деталь",
                            dataIndex: "standard_part_display_name",
                            render: (value) => <Typography.Text strong>{value}</Typography.Text>,
                          },
                          { title: "Поставщик", dataIndex: "supplier_name" },
                          { title: "Номер поставщика", dataIndex: "supplier_part_number" },
                          {
                            title: "Тип",
                            dataIndex: "part_type",
                            render: (value) =>
                              value === "OEM" ? "OEM" : value === "ANALOG" ? "Аналог" : "Не указано",
                          },
                          {
                            title: "Цена",
                            render: (_, row) =>
                              row.latest_price != null && row.latest_currency
                                ? `${row.latest_price} ${row.latest_currency}`
                                : "—",
                          },
                          {
                            title: "Приоритетный",
                            dataIndex: "is_preferred",
                            render: (value) => (value ? "Да" : "Нет"),
                          },
                        ]}
                      />
                    ),
                  },
                ]}
                />
              </Space>
            )}
          </Card>
        </Space>
      </Card>

      <Modal
        open={classModalOpen}
        title={editingClass ? "Редактирование класса" : "Новый класс стандартных деталей"}
        onCancel={() => setClassModalOpen(false)}
        onOk={saveClass}
        confirmLoading={classSaving}
        okText={editingClass ? "Сохранить" : "Создать"}
        cancelText="Отмена"
        destroyOnHidden
      >
        <Form
          form={classForm}
          layout="vertical"
          initialValues={EMPTY_CLASS_FORM}
          onValuesChange={(changedValues, allValues) => {
            if (Object.prototype.hasOwnProperty.call(changedValues, "code")) {
              setClassCodeDirty(true)
              return
            }
            if (Object.prototype.hasOwnProperty.call(changedValues, "name") && !classCodeDirty) {
              classForm.setFieldValue("code", slugifyCode(allValues.name))
            }
          }}
        >
          <Form.Item label="Название" name="name" rules={[{ required: true, message: "Введите название" }]}>
            <Input placeholder="Например: Электродвигатели" />
          </Form.Item>
          <Form.Item
            label="Внутренний код"
            name="code"
            rules={[{ required: true, message: "Введите внутренний код" }]}
            extra="Короткий код на латинице без пробелов. Можно не заполнять вручную: он собирается из названия."
          >
            <Input placeholder="Например: electric_motor" />
          </Form.Item>
          <Form.Item label="Описание" name="description">
            <Input.TextArea rows={3} placeholder="Коротко опишите, какие изделия относятся к этому классу" />
          </Form.Item>
          <Form.Item
            label="Порядок сортировки"
            name="sort_order"
            extra="Меньшее число показывается выше в дереве. Если порядок не важен, оставьте 0."
          >
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Активен" name="is_active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={fieldModalOpen}
        title={editingField ? "Редактирование поля" : "Новое поле класса"}
        onCancel={() => setFieldModalOpen(false)}
        onOk={saveField}
        confirmLoading={fieldSaving}
        okText={editingField ? "Сохранить" : "Создать"}
        cancelText="Отмена"
        width={760}
        destroyOnHidden
      >
        <Form
          form={fieldForm}
          layout="vertical"
          initialValues={EMPTY_FIELD_FORM}
          onValuesChange={(changedValues, allValues) => {
            if (Object.prototype.hasOwnProperty.call(changedValues, "code")) {
              setFieldCodeDirty(true)
              return
            }
            if (Object.prototype.hasOwnProperty.call(changedValues, "label") && !fieldCodeDirty) {
              fieldForm.setFieldValue("code", slugifyCode(allValues.label))
            }
          }}
        >
          <Space wrap style={{ width: "100%" }} size={16}>
            <Form.Item label="Название поля" name="label" rules={[{ required: true, message: "Введите название поля" }]} style={{ width: 240 }}>
              <Input placeholder="Например: Мощность, кВт" />
            </Form.Item>
            <Form.Item
              label="Внутренний код"
              name="code"
              rules={[{ required: true, message: "Введите внутренний код" }]}
              style={{ width: 220 }}
              extra="Латиница без пробелов. Например: power_kw."
            >
              <Input placeholder="Например: power_kw" />
            </Form.Item>
            <Form.Item label="Тип поля" name="field_type" rules={[{ required: true, message: "Выберите тип" }]} style={{ width: 220 }}>
              <Select options={FIELD_TYPE_OPTIONS} />
            </Form.Item>
            <Form.Item
              label="Порядок сортировки"
              name="sort_order"
              style={{ width: 180 }}
              extra="Меньшее число выше."
            >
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="Единица" name="unit" style={{ width: 160 }}>
              <Input />
            </Form.Item>
            <Form.Item label="Подсказка в поле" name="placeholder" style={{ width: 260 }}>
              <Input />
            </Form.Item>
          </Space>

          <Form.Item label="Подсказка под полем" name="help_text">
            <Input.TextArea rows={2} placeholder="Например: Указывайте номинальную мощность по шильдику" />
          </Form.Item>

          <Space wrap size={16}>
            <Form.Item name="is_required" valuePropName="checked">
              <Checkbox>Обязательное</Checkbox>
            </Form.Item>
            <Form.Item name="is_active" valuePropName="checked">
              <Checkbox>Активное</Checkbox>
            </Form.Item>
            <Form.Item name="is_in_title" valuePropName="checked">
              <Checkbox>В заголовке</Checkbox>
            </Form.Item>
            <Form.Item name="is_in_list" valuePropName="checked">
              <Checkbox>В списке</Checkbox>
            </Form.Item>
            <Form.Item name="is_in_filters" valuePropName="checked">
              <Checkbox>В фильтрах</Checkbox>
            </Form.Item>
            <Form.Item name="is_searchable" valuePropName="checked">
              <Checkbox>В поиске</Checkbox>
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      <Modal
        open={optionsModalOpen}
        title={optionField ? `Опции поля: ${optionField.label}` : "Опции поля"}
        onCancel={() => setOptionsModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Form form={optionForm} layout="vertical">
            <Space wrap style={{ width: "100%" }} size={12}>
              <Form.Item label="Внутренний код" name="value_code" rules={[{ required: true, message: "Введите внутренний код" }]} style={{ width: 180 }}>
                <Input placeholder="Например: ip55" />
              </Form.Item>
              <Form.Item label="Название варианта" name="value_label" rules={[{ required: true, message: "Введите название варианта" }]} style={{ width: 220 }}>
                <Input />
              </Form.Item>
              <Form.Item label="Порядок сортировки" name="sort_order" initialValue={0} style={{ width: 180 }}>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item label="Активна" name="is_active" valuePropName="checked" initialValue={true}>
                <Switch />
              </Form.Item>
              <Form.Item label=" ">
                <Button type="primary" onClick={saveOption} loading={optionSaving}>
                  Добавить
                </Button>
              </Form.Item>
            </Space>
          </Form>

          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={Array.isArray(optionField?.options) ? optionField.options : []}
            columns={[
              { title: "Внутренний код", dataIndex: "value_code" },
              { title: "Название варианта", dataIndex: "value_label" },
              { title: "Порядок сорт.", dataIndex: "sort_order", width: 120 },
              { title: "Активна", dataIndex: "is_active", width: 90, render: (value) => (value ? "Да" : "Нет") },
              {
                title: "Действия",
                key: "actions",
                width: 110,
                render: (_, option) => (
                  <Popconfirm
                    title="Удалить опцию?"
                    description={option.value_label}
                    okText="Удалить"
                    cancelText="Отмена"
                    onConfirm={() => deleteOption(option)}
                  >
                    <Button size="small" danger>
                      Удалить
                    </Button>
                  </Popconfirm>
                ),
              },
            ]}
          />
        </Space>
      </Modal>

      <Drawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        width={520}
        title="Справка по классификатору стандартных изделий"
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {CLASSIFIER_HELP_SECTIONS.map((section) => (
            <Card key={section.title} size="small" title={section.title}>
              <Typography.Paragraph style={{ marginBottom: 0 }}>
                {section.body}
              </Typography.Paragraph>
            </Card>
          ))}
        </Space>
      </Drawer>
    </>
  )
}
