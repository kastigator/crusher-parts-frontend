import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Tag,
  Table,
  Tree,
  Typography,
  message,
} from "antd"
import axios from "@/api/axiosInstance"
import useMeasurementUnits from "@/hooks/useMeasurementUnits"
import { runTrashDeleteFlow } from "@/utils/trashUi"

const CLIENT_PART_TYPE_LABELS = {
  client_drawing: "По чертежу клиента",
  oem_variant: "Отличается от OEM",
  oem_replacement: "Замена OEM",
  unknown_oem: "OEM неизвестен",
}

const CLIENT_PART_TYPE_COLORS = {
  client_drawing: "blue",
  oem_variant: "orange",
  oem_replacement: "purple",
  unknown_oem: "default",
}

const SEARCH_TYPE_LABELS = {
  classifier_node: "Раздел",
  equipment_model: "Модель",
  oem_part: "OEM",
  client_equipment_unit: "Машина клиента",
  client_part: "Деталь клиента",
}

const SEARCH_TYPE_COLORS = {
  classifier_node: "blue",
  equipment_model: "green",
  oem_part: "purple",
  client_equipment_unit: "orange",
  client_part: "cyan",
}

const SEARCH_TYPE_ORDER = [
  "classifier_node",
  "equipment_model",
  "oem_part",
  "client_equipment_unit",
  "client_part",
]

const ATTRIBUTE_TYPE_OPTIONS = [
  { value: "number", label: "Число" },
  { value: "text", label: "Текст" },
  { value: "textarea", label: "Многострочный текст" },
  { value: "boolean", label: "Да / нет" },
  { value: "select", label: "Список" },
  { value: "multiselect", label: "Несколько значений" },
  { value: "date", label: "Дата" },
]

const ATTRIBUTE_TYPE_LABELS = Object.fromEntries(ATTRIBUTE_TYPE_OPTIONS.map((item) => [item.value, item.label]))

const EMPTY_FORM = {
  name: "",
  notes: "",
}

const treeKey = {
  node: (id) => `node:${id}`,
  manufacturer: (nodeId, manufacturerId) => `manufacturer:${nodeId}:${manufacturerId}`,
  model: (id) => `model:${id}`,
  unit: (id) => `unit:${id}`,
}

const parseTreeKey = (value) => {
  const [type, first, second] = String(value || "").split(":")
  return {
    type,
    id: Number(first) || null,
    extraId: Number(second) || null,
  }
}

const flattenTree = (nodes, map = new Map()) => {
  ;(nodes || []).forEach((node) => {
    map.set(Number(node.id), node)
    flattenTree(node.children || [], map)
  })
  return map
}

export default function EquipmentClassifierMain() {
  const navigate = useNavigate()
  const { options: measurementUnitOptions, loading: measurementUnitsLoading } = useMeasurementUnits()
  const [treeRows, setTreeRows] = useState([])
  const [allModels, setAllModels] = useState([])
  const [allUnits, setAllUnits] = useState([])
  const [treeQuery, setTreeQuery] = useState("")
  const [workspaceQuery, setWorkspaceQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [workspace, setWorkspace] = useState(null)
  const [attributes, setAttributes] = useState([])
  const [attributeFilters, setAttributeFilters] = useState({})
  const [attributesLoading, setAttributesLoading] = useState(false)
  const [attributeModalOpen, setAttributeModalOpen] = useState(false)
  const [attributeSaving, setAttributeSaving] = useState(false)
  const [editingAttribute, setEditingAttribute] = useState(null)
  const [modelAttributesOpen, setModelAttributesOpen] = useState(false)
  const [modelDetailsOpen, setModelDetailsOpen] = useState(false)
  const [modelAttributesLoading, setModelAttributesLoading] = useState(false)
  const [modelAttributesSaving, setModelAttributesSaving] = useState(false)
  const [modelAttributeRows, setModelAttributeRows] = useState([])
  const [attributeModel, setAttributeModel] = useState(null)
  const [detailsModel, setDetailsModel] = useState(null)
  const [nsiSearchQuery, setNsiSearchQuery] = useState("")
  const [nsiSearchRows, setNsiSearchRows] = useState([])
  const [nsiSearchLoading, setNsiSearchLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modelModalOpen, setModelModalOpen] = useState(false)
  const [moveModelOpen, setMoveModelOpen] = useState(false)
  const [manufacturerModalOpen, setManufacturerModalOpen] = useState(false)
  const [manufacturers, setManufacturers] = useState([])
  const [modelSaving, setModelSaving] = useState(false)
  const [moveModelSaving, setMoveModelSaving] = useState(false)
  const [manufacturerSaving, setManufacturerSaving] = useState(false)
  const [movingModel, setMovingModel] = useState(null)
  const [moveTargetNodeId, setMoveTargetNodeId] = useState(null)
  const [editingNode, setEditingNode] = useState(null)
  const [parentForCreate, setParentForCreate] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [selectedTreeKey, setSelectedTreeKey] = useState(null)
  const [selectedTreeEntity, setSelectedTreeEntity] = useState({ type: "node", id: null })
  const [form] = Form.useForm()
  const [modelForm] = Form.useForm()
  const [manufacturerForm] = Form.useForm()
  const [attributeForm] = Form.useForm()
  const [modelAttributesForm] = Form.useForm()

  const loadTree = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/equipment-classifier-nodes", {
        params: { tree: 1, limit: 5000 },
      })
      setTreeRows(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /equipment-classifier-nodes error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить классификатор")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadTreeInventory = useCallback(async () => {
    try {
      const [modelsResult, unitsResult] = await Promise.all([
        axios.get("/equipment-models"),
        axios.get("/client-equipment-units", { params: { limit: 1000 } }),
      ])
      setAllModels(Array.isArray(modelsResult.data) ? modelsResult.data : [])
      setAllUnits(Array.isArray(unitsResult.data) ? unitsResult.data : [])
    } catch (err) {
      console.error("load classifier tree inventory error:", err)
      setAllModels([])
      setAllUnits([])
    }
  }, [])

  useEffect(() => {
    loadTree()
    loadTreeInventory()
  }, [loadTree, loadTreeInventory])

  const loadWorkspace = useCallback(async (nodeId) => {
    if (!nodeId) {
      setWorkspace(null)
      return
    }
    setWorkspaceLoading(true)
    try {
      const { data } = await axios.get(`/equipment-classifier-nodes/${nodeId}/workspace`)
      setWorkspace(data || null)
    } catch (err) {
      console.error("GET /equipment-classifier-nodes/:id/workspace error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить выбранный раздел")
      setWorkspace(null)
    } finally {
      setWorkspaceLoading(false)
    }
  }, [])

  const loadAttributes = useCallback(async (nodeId) => {
    if (!nodeId) {
      setAttributes([])
      return
    }
    setAttributesLoading(true)
    try {
      const { data } = await axios.get(`/equipment-classifier-nodes/${nodeId}/attributes`)
      setAttributes(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /equipment-classifier-nodes/:id/attributes error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить характеристики")
      setAttributes([])
    } finally {
      setAttributesLoading(false)
    }
  }, [])

  const loadManufacturers = useCallback(async () => {
    try {
      const { data } = await axios.get("/equipment-manufacturers")
      setManufacturers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /equipment-manufacturers error:", err)
      message.error("Не удалось загрузить производителей")
    }
  }, [])

  const handleNsiSearch = useCallback(async (value) => {
    const q = String(value || "").trim()
    setNsiSearchQuery(q)
    if (q.length < 2) {
      setNsiSearchRows([])
      return
    }
    setNsiSearchLoading(true)
    try {
      const { data } = await axios.get("/equipment-classifier-nodes/search", {
        params: { q, limit: 80 },
      })
      setNsiSearchRows(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /equipment-classifier-nodes/search error:", err)
      message.error(err?.response?.data?.message || "Не удалось выполнить поиск по классификатору")
    } finally {
      setNsiSearchLoading(false)
    }
  }, [])

  const openSearchResult = useCallback(async (row) => {
    if (!row) return
    if (row.entity_type === "oem_part" && row.oem_part_id) {
      navigate(`/original-parts/${row.oem_part_id}`)
      return
    }
    if (row.entity_type === "client_part" && row.client_id) {
      navigate(`/clients/${row.client_id}`)
      return
    }
    if (row.entity_type === "equipment_model" && row.classifier_node_id && row.entity_id) {
      const nodeId = String(row.classifier_node_id)
      setSelectedId(nodeId)
      setSelectedTreeKey(treeKey.model(row.entity_id))
      setSelectedTreeEntity({ type: "model", id: Number(row.entity_id) })
      await loadWorkspace(nodeId)
      return
    }
    if (row.entity_type === "client_equipment_unit" && row.classifier_node_id && row.entity_id) {
      const nodeId = String(row.classifier_node_id)
      setSelectedId(nodeId)
      setSelectedTreeKey(treeKey.unit(row.entity_id))
      setSelectedTreeEntity({ type: "unit", id: Number(row.entity_id) })
      await loadWorkspace(nodeId)
      return
    }
    if (row.entity_type === "client_equipment_unit" && row.client_id) {
      navigate(`/clients/${row.client_id}`)
      return
    }
    if (row.classifier_node_id) {
      const nodeId = String(row.classifier_node_id)
      setSelectedId(nodeId)
      setSelectedTreeKey(treeKey.node(nodeId))
      setSelectedTreeEntity({ type: "node", id: Number(nodeId) })
      await loadWorkspace(nodeId)
      return
    }
    if (row.entity_type === "classifier_node" && row.entity_id) {
      const nodeId = String(row.entity_id)
      setSelectedId(nodeId)
      setSelectedTreeKey(treeKey.node(nodeId))
      setSelectedTreeEntity({ type: "node", id: Number(nodeId) })
      await loadWorkspace(nodeId)
    }
  }, [loadWorkspace, navigate])

  useEffect(() => {
    if (selectedId) {
      loadWorkspace(selectedId)
      loadAttributes(selectedId)
    } else {
      setWorkspace(null)
      setAttributes([])
    }
  }, [selectedId, loadAttributes, loadWorkspace])

  useEffect(() => {
    setWorkspaceQuery("")
    setAttributeFilters({})
  }, [selectedId])

  const nodeMap = useMemo(() => flattenTree(treeRows), [treeRows])
  const selectedNode = selectedId ? nodeMap.get(Number(selectedId)) || null : null
  const selectedModelFromTree = useMemo(() => {
    if (selectedTreeEntity.type !== "model" || !selectedTreeEntity.id) return null
    return allModels.find((model) => Number(model.id) === Number(selectedTreeEntity.id)) || null
  }, [allModels, selectedTreeEntity])

  const selectedUnitFromTree = useMemo(() => {
    if (selectedTreeEntity.type !== "unit" || !selectedTreeEntity.id) return null
    return allUnits.find((unit) => Number(unit.id) === Number(selectedTreeEntity.id)) || null
  }, [allUnits, selectedTreeEntity])

  const selectedManufacturerFromTree = useMemo(() => {
    if (selectedTreeEntity.type !== "manufacturer" || !selectedTreeEntity.id) return null
    const manufacturerId = Number(selectedTreeEntity.id)
    return {
      id: manufacturerId,
      name:
        allModels.find((model) => Number(model.manufacturer_id) === manufacturerId)?.manufacturer_name ||
        "Производитель",
    }
  }, [allModels, selectedTreeEntity])

  const measurementUnitLabelByCode = useMemo(
    () => new Map(measurementUnitOptions.map((option) => [String(option.value), option.label])),
    [measurementUnitOptions]
  )

  const formatMeasurementUnit = useCallback(
    (unit) => {
      if (!unit) return ""
      return measurementUnitLabelByCode.get(String(unit)) || unit
    },
    [measurementUnitLabelByCode]
  )

  const attributeUnitOptions = useMemo(() => {
    const seen = new Set(measurementUnitOptions.map((option) => String(option.value)))
    const extra = attributes
      .map((attribute) => attribute.unit)
      .filter(Boolean)
      .filter((unit) => {
        const key = String(unit)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map((unit) => ({ value: unit, label: unit }))
    return [...measurementUnitOptions, ...extra]
  }, [attributes, measurementUnitOptions])
  const filteredTreeRows = useMemo(() => {
    const q = treeQuery.trim().toLowerCase()
    if (!q) return treeRows

    const filterNodes = (nodes) =>
      (nodes || [])
        .map((node) => {
          const children = filterNodes(node.children || [])
          const selfMatch =
            String(node.name || "").toLowerCase().includes(q) ||
            String(node.code || "").toLowerCase().includes(q)
          if (!selfMatch && !children.length) return null
          return { ...node, children }
        })
        .filter(Boolean)

    return filterNodes(treeRows)
  }, [treeRows, treeQuery])

  const unitsByModelId = useMemo(() => {
    const map = new Map()
    allUnits.forEach((unit) => {
      const modelId = Number(unit.equipment_model_id)
      if (!modelId) return
      if (!map.has(modelId)) map.set(modelId, [])
      map.get(modelId).push(unit)
    })
    return map
  }, [allUnits])

  const modelsByNodeId = useMemo(() => {
    const map = new Map()
    allModels.forEach((model) => {
      const nodeId = Number(model.classifier_node_id)
      if (!nodeId) return
      if (!map.has(nodeId)) map.set(nodeId, [])
      map.get(nodeId).push(model)
    })
    map.forEach((rows) => {
      rows.sort((a, b) => {
        const manufacturer = String(a.manufacturer_name || "").localeCompare(String(b.manufacturer_name || ""), "ru")
        if (manufacturer) return manufacturer
        return String(a.model_name || "").localeCompare(String(b.model_name || ""), "ru")
      })
    })
    return map
  }, [allModels])

  const treeData = useMemo(() => {
    const q = treeQuery.trim().toLowerCase()
    const build = (nodes) =>
      (nodes || []).map((node) => {
        const nodeModels = q ? [] : modelsByNodeId.get(Number(node.id)) || []
        const modelsByManufacturer = new Map()
        nodeModels.forEach((model) => {
          const manufacturerId = Number(model.manufacturer_id)
          if (!manufacturerId) return
          if (!modelsByManufacturer.has(manufacturerId)) {
            modelsByManufacturer.set(manufacturerId, {
              id: manufacturerId,
              name: model.manufacturer_name || "Производитель не указан",
              models: [],
            })
          }
          modelsByManufacturer.get(manufacturerId).models.push(model)
        })
        const manufacturerChildren = Array.from(modelsByManufacturer.values())
          .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ru"))
          .map((manufacturer) => ({
            key: treeKey.manufacturer(node.id, manufacturer.id),
            title: manufacturer.name,
            children: manufacturer.models.map((model) => {
              const modelUnits = unitsByModelId.get(Number(model.id)) || []
              return {
                key: treeKey.model(model.id),
                title: model.model_name || `Модель #${model.id}`,
                children: modelUnits.map((unit) => ({
                  key: treeKey.unit(unit.id),
                  title:
                    [
                      unit.client_name,
                      unit.serial_number ? `SN ${unit.serial_number}` : unit.internal_name,
                    ]
                      .filter(Boolean)
                      .join(" / ") || `Машина #${unit.id}`,
                  isLeaf: true,
                })),
              }
            }),
          }))

        return {
          key: treeKey.node(node.id),
          title: node.name,
          children: [...build(node.children || []), ...manufacturerChildren],
        }
      })

    return build(filteredTreeRows)
  }, [filteredTreeRows, modelsByNodeId, treeQuery, unitsByModelId])

  const getDefaultNodeType = (parent) => {
    if (!parent) return "ROOT"
    if (parent.node_type === "ROOT") return "CATEGORY"
    if (parent.node_type === "CATEGORY") return "SUBCATEGORY"
    return "EQUIPMENT_TYPE"
  }

  const openCreateRoot = () => {
    setEditingNode(null)
    setParentForCreate(null)
    form.setFieldsValue({ ...EMPTY_FORM })
    setModalOpen(true)
  }

  const openCreateChild = () => {
    if (!selectedNode) {
      message.warning("Сначала выберите родительский раздел")
      return
    }
    setEditingNode(null)
    setParentForCreate(selectedNode)
    form.setFieldsValue({ ...EMPTY_FORM })
    setModalOpen(true)
  }

  const openEdit = () => {
    if (!selectedNode) {
      message.warning("Сначала выберите раздел")
      return
    }
    setParentForCreate(null)
    setEditingNode(selectedNode)
    form.setFieldsValue({
      name: selectedNode.name || "",
      notes: selectedNode.notes || "",
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        parent_id: editingNode ? editingNode.parent_id : parentForCreate?.id || null,
        name: values.name,
        code: editingNode ? editingNode.code || null : null,
        node_type: editingNode?.node_type || getDefaultNodeType(parentForCreate),
        sort_order: editingNode ? editingNode.sort_order || 0 : 0,
        is_active: editingNode ? (editingNode.is_active ? 1 : 0) : 1,
        notes: values.notes || null,
      }

      setSaving(true)
      if (editingNode?.id) {
        await axios.put(`/equipment-classifier-nodes/${editingNode.id}`, payload)
        message.success("Раздел классификатора обновлён")
      } else {
        await axios.post("/equipment-classifier-nodes", payload)
        message.success("Раздел классификатора создан")
      }
      setModalOpen(false)
      await loadTree()
    } catch (err) {
      if (err?.errorFields) return
      console.error("save equipment classifier node error:", err)
      message.error(err?.response?.data?.message || "Не удалось сохранить раздел классификатора")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedNode?.id) return
    try {
      const result = await runTrashDeleteFlow({
        entityType: "equipment_classifier_nodes",
        entityId: selectedNode.id,
        deleteUrl: `/equipment-classifier-nodes/${selectedNode.id}`,
        successMessage: "Раздел классификатора перемещён в корзину",
      })
      if (!result?.deleted) return
      setSelectedId(null)
      await loadTree()
    } catch (err) {
      console.error("delete equipment classifier node error:", err)
      message.error(err?.response?.data?.message || "Не удалось удалить раздел классификатора")
    }
  }

  const openCreateModel = () => {
    if (!selectedNode) {
      message.warning("Сначала выберите раздел классификатора")
      return
    }
    modelForm.resetFields()
    if (selectedTreeEntity.type === "manufacturer" && selectedTreeEntity.id) {
      modelForm.setFieldsValue({ manufacturer_id: selectedTreeEntity.id })
    }
    loadManufacturers()
    setModelModalOpen(true)
  }

  const openCreateManufacturer = () => {
    manufacturerForm.resetFields()
    setManufacturerModalOpen(true)
  }

  const handleCreateModel = async () => {
    if (!selectedNode) return
    try {
      const values = await modelForm.validateFields()
      setModelSaving(true)
      await axios.post("/equipment-models", {
        manufacturer_id: values.manufacturer_id,
        model_name: values.model_name,
        classifier_node_id: selectedNode.id,
        notes: values.notes || null,
      })
      message.success("Модель создана в выбранном разделе")
      setModelModalOpen(false)
      await loadWorkspace(selectedNode.id)
    } catch (err) {
      if (err?.errorFields) return
      console.error("POST /equipment-models error:", err)
      message.error(err?.response?.data?.message || "Не удалось создать модель")
    } finally {
      setModelSaving(false)
    }
  }

  const openMoveModel = (row) => {
    setMovingModel(row || null)
    setMoveTargetNodeId(row?.classifier_node_id ? Number(row.classifier_node_id) : null)
    setMoveModelOpen(true)
  }

  const handleMoveModel = async () => {
    if (!movingModel?.id) return
    if (!moveTargetNodeId) {
      message.warning("Выберите целевой раздел классификатора")
      return
    }
    if (Number(moveTargetNodeId) === Number(movingModel.classifier_node_id)) {
      setMoveModelOpen(false)
      return
    }
    setMoveModelSaving(true)
    try {
      await axios.put(`/equipment-models/${movingModel.id}`, {
        classifier_node_id: moveTargetNodeId,
      })
      message.success("Модель перенесена")
      setMoveModelOpen(false)
      setMovingModel(null)
      setMoveTargetNodeId(null)
      await loadTree()
      await loadTreeInventory()
      if (selectedId) await loadWorkspace(selectedId)
    } catch (err) {
      console.error("PUT /equipment-models/:id classifier_node_id error:", err)
      message.error(err?.response?.data?.message || "Не удалось перенести модель")
    } finally {
      setMoveModelSaving(false)
    }
  }

  const handleCreateManufacturer = async () => {
    try {
      const values = await manufacturerForm.validateFields()
      setManufacturerSaving(true)
      const { data } = await axios.post("/equipment-manufacturers", {
        name: values.name,
        country: values.country || null,
        website: values.website || null,
        notes: values.notes || null,
      })
      message.success("Производитель создан")
      await loadManufacturers()
      if (data?.id) {
        modelForm.setFieldsValue({ manufacturer_id: data.id })
      }
      setManufacturerModalOpen(false)
    } catch (err) {
      if (err?.errorFields) return
      console.error("POST /equipment-manufacturers error:", err)
      message.error(err?.response?.data?.message || "Не удалось создать производителя")
    } finally {
      setManufacturerSaving(false)
    }
  }

  const parseAttributeOptions = (value) =>
    String(value || "")
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((label) => ({ value_label: label }))

  const openCreateAttribute = () => {
    if (!selectedNode) {
      message.warning("Сначала выберите раздел классификатора")
      return
    }
    setEditingAttribute(null)
    attributeForm.setFieldsValue({
      label: "",
      value_type: "number",
      unit: "",
      sort_order: (attributes || []).length * 10 + 10,
      is_required: false,
      is_filterable: true,
      help_text: "",
      options_text: "",
    })
    setAttributeModalOpen(true)
  }

  const openEditAttribute = (row) => {
    if (!row || Number(row.classifier_node_id) !== Number(selectedNode?.id)) {
      message.info("Унаследованную характеристику редактируют в том разделе, где она создана")
      return
    }
    setEditingAttribute(row)
    attributeForm.setFieldsValue({
      label: row.label || "",
      value_type: row.value_type || "number",
      unit: row.unit || "",
      sort_order: row.sort_order || 0,
      is_required: !!row.is_required,
      is_filterable: !!row.is_filterable,
      help_text: row.help_text || "",
      options_text: (row.options || []).map((option) => option.value_label).join("\n"),
    })
    setAttributeModalOpen(true)
  }

  const handleSaveAttribute = async () => {
    if (!selectedNode) return
    try {
      const values = await attributeForm.validateFields()
      const payload = {
        label: values.label,
        value_type: values.value_type || "number",
        unit: values.unit || null,
        sort_order: values.sort_order ?? 0,
        is_required: values.is_required ? 1 : 0,
        is_filterable: values.is_filterable ? 1 : 0,
        help_text: values.help_text || null,
      }
      if (["select", "multiselect"].includes(payload.value_type)) {
        payload.options = parseAttributeOptions(values.options_text)
      }

      setAttributeSaving(true)
      if (editingAttribute?.id) {
        await axios.put(`/equipment-classifier-nodes/attributes/${editingAttribute.id}`, payload)
        message.success("Характеристика обновлена")
      } else {
        await axios.post(`/equipment-classifier-nodes/${selectedNode.id}/attributes`, payload)
      message.success("Характеристика добавлена")
      }
      setAttributeModalOpen(false)
      await loadAttributes(selectedNode.id)
      await loadWorkspace(selectedNode.id)
    } catch (err) {
      if (err?.errorFields) return
      console.error("save equipment attribute error:", err)
      message.error(err?.response?.data?.message || "Не удалось сохранить характеристику")
    } finally {
      setAttributeSaving(false)
    }
  }

  const handleDeleteAttribute = async (row) => {
    if (!row?.id || !selectedNode?.id) return
    try {
      await axios.delete(`/equipment-classifier-nodes/attributes/${row.id}`)
      message.success("Характеристика отключена")
      await loadAttributes(selectedNode.id)
      await loadWorkspace(selectedNode.id)
    } catch (err) {
      console.error("DELETE /equipment-classifier-nodes/attributes/:id error:", err)
      message.error(err?.response?.data?.message || "Не удалось отключить характеристику")
    }
  }

  const normalizeValueForForm = (attribute, valueRow) => {
    if (!valueRow) return undefined
    if (attribute.value_type === "number") {
      return valueRow.value_number === null || valueRow.value_number === undefined ? undefined : Number(valueRow.value_number)
    }
    if (attribute.value_type === "boolean") {
      if (valueRow.value_boolean === null || valueRow.value_boolean === undefined) return undefined
      return Number(valueRow.value_boolean) === 1
    }
    if (attribute.value_type === "date") return valueRow.value_date || undefined
    if (attribute.value_type === "multiselect") {
      try {
        return Array.isArray(valueRow.value_json) ? valueRow.value_json : JSON.parse(valueRow.value_json || "[]")
      } catch {
        return []
      }
    }
    return valueRow.value_text || undefined
  }

  const openModelAttributes = async (row) => {
    if (!selectedNode?.id || !row?.id) return
    setAttributeModel(row)
    setModelAttributesOpen(true)
    setModelAttributesLoading(true)
    try {
      const { data } = await axios.get(`/equipment-classifier-nodes/${selectedNode.id}/attribute-values`, {
        params: { entity_type: "equipment_model", entity_id: row.id },
      })
      const attrRows = Array.isArray(data?.attributes) ? data.attributes : []
      const valuesByAttrId = new Map((data?.values || []).map((item) => [Number(item.attribute_id), item]))
      setModelAttributeRows(attrRows)
      const formValues = {}
      attrRows.forEach((attribute) => {
        formValues[`attr_${attribute.id}`] = normalizeValueForForm(attribute, valuesByAttrId.get(Number(attribute.id)))
      })
      modelAttributesForm.setFieldsValue(formValues)
    } catch (err) {
      console.error("GET /equipment-classifier-nodes/:id/attribute-values error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить значения характеристик")
      setModelAttributeRows([])
    } finally {
      setModelAttributesLoading(false)
    }
  }

  const handleSaveModelAttributes = async () => {
    if (!selectedNode?.id || !attributeModel?.id) return
    try {
      const values = await modelAttributesForm.validateFields()
      setModelAttributesSaving(true)
      await axios.put(`/equipment-classifier-nodes/${selectedNode.id}/attribute-values`, {
        entity_type: "equipment_model",
        entity_id: attributeModel.id,
        values: modelAttributeRows.map((attribute) => ({
          attribute_id: attribute.id,
          value: values[`attr_${attribute.id}`],
        })),
      })
      message.success("Характеристики модели сохранены")
      setModelAttributesOpen(false)
      await loadWorkspace(selectedNode.id)
    } catch (err) {
      if (err?.errorFields) return
      console.error("PUT /equipment-classifier-nodes/:id/attribute-values error:", err)
      message.error(err?.response?.data?.message || "Не удалось сохранить характеристики модели")
    } finally {
      setModelAttributesSaving(false)
    }
  }

  const workspaceStats = workspace?.stats || {}
  const rawWorkspaceModels = Array.isArray(workspace?.models) ? workspace.models : []
  const rawWorkspaceUnits = Array.isArray(workspace?.client_equipment_units) ? workspace.client_equipment_units : []
  const rawWorkspaceOemParts = Array.isArray(workspace?.oem_parts) ? workspace.oem_parts : []
  const rawWorkspaceClientParts = Array.isArray(workspace?.client_parts) ? workspace.client_parts : []
  const workspaceNeedle = workspaceQuery.trim().toLowerCase()
  const filterableAttributes = useMemo(
    () => attributes.filter((attribute) => Number(attribute.is_filterable || 0) === 1),
    [attributes],
  )
  const hasActiveAttributeFilters = useMemo(
    () =>
      Object.values(attributeFilters).some((filter) => {
        if (!filter) return false
        if (filter.min !== undefined && filter.min !== null && filter.min !== "") return true
        if (filter.max !== undefined && filter.max !== null && filter.max !== "") return true
        if (Array.isArray(filter.value)) return filter.value.length > 0
        return filter.value !== undefined && filter.value !== null && filter.value !== ""
      }),
    [attributeFilters],
  )

  const setAttributeFilterValue = (attributeId, patch) => {
    setAttributeFilters((prev) => {
      const next = {
        ...prev,
        [attributeId]: {
          ...(prev[attributeId] || {}),
          ...patch,
        },
      }
      const value = next[attributeId]
      const isEmpty =
        (!value ||
          ((value.min === undefined || value.min === null || value.min === "") &&
            (value.max === undefined || value.max === null || value.max === "") &&
            (Array.isArray(value.value)
              ? value.value.length === 0
              : value.value === undefined || value.value === null || value.value === "")))
      if (isEmpty) delete next[attributeId]
      return next
    })
  }

  const getModelAttributeValue = (model, attributeId) =>
    (Array.isArray(model?.attribute_values) ? model.attribute_values : []).find(
      (value) => Number(value.attribute_id) === Number(attributeId),
    ) || null

  const splitIds = (value) =>
    String(value || "")
      .split(",")
      .map((item) => Number(item.trim()))
      .filter(Boolean)

  const selectedModelOemParts = useMemo(() => {
    if (!detailsModel?.id) return []
    const modelId = Number(detailsModel.id)
    return rawWorkspaceOemParts.filter((row) => splitIds(row.model_ids).includes(modelId))
  }, [detailsModel, rawWorkspaceOemParts])

  const selectedModelUnits = useMemo(() => {
    if (!detailsModel?.id) return []
    const modelId = Number(detailsModel.id)
    return rawWorkspaceUnits.filter((row) => Number(row.equipment_model_id) === modelId)
  }, [detailsModel, rawWorkspaceUnits])

  const selectedModelClientParts = useMemo(() => {
    if (!detailsModel?.id) return []
    const modelId = Number(detailsModel.id)
    return rawWorkspaceClientParts.filter((row) => {
      const modelIds = splitIds(row.application_model_ids)
      const unitModelIds = splitIds(row.application_unit_model_ids)
      return modelIds.includes(modelId) || unitModelIds.includes(modelId)
    })
  }, [detailsModel, rawWorkspaceClientParts])

  const currentModel = useMemo(() => {
    if (selectedTreeEntity.type !== "model" || !selectedTreeEntity.id) return null
    return rawWorkspaceModels.find((model) => Number(model.id) === Number(selectedTreeEntity.id)) || selectedModelFromTree
  }, [rawWorkspaceModels, selectedModelFromTree, selectedTreeEntity])

  const currentModelOemParts = useMemo(() => {
    if (!currentModel?.id) return []
    const modelId = Number(currentModel.id)
    return rawWorkspaceOemParts.filter((row) => splitIds(row.model_ids).includes(modelId))
  }, [currentModel, rawWorkspaceOemParts])

  const currentModelUnits = useMemo(() => {
    if (!currentModel?.id) return []
    const modelId = Number(currentModel.id)
    return rawWorkspaceUnits.filter((row) => Number(row.equipment_model_id) === modelId)
  }, [currentModel, rawWorkspaceUnits])

  const currentModelClientParts = useMemo(() => {
    if (!currentModel?.id) return []
    const modelId = Number(currentModel.id)
    return rawWorkspaceClientParts.filter((row) => {
      const modelIds = splitIds(row.application_model_ids)
      const unitModelIds = splitIds(row.application_unit_model_ids)
      return modelIds.includes(modelId) || unitModelIds.includes(modelId)
    })
  }, [currentModel, rawWorkspaceClientParts])

  const currentUnitOemParts = useMemo(() => {
    if (!selectedUnitFromTree?.equipment_model_id) return []
    const modelId = Number(selectedUnitFromTree.equipment_model_id)
    return rawWorkspaceOemParts.filter((row) => splitIds(row.model_ids).includes(modelId))
  }, [rawWorkspaceOemParts, selectedUnitFromTree])

  const currentUnitClientParts = useMemo(() => {
    if (!selectedUnitFromTree?.id && !selectedUnitFromTree?.equipment_model_id) return []
    const unitId = Number(selectedUnitFromTree?.id)
    const modelId = Number(selectedUnitFromTree?.equipment_model_id)
    return rawWorkspaceClientParts.filter((row) => {
      const unitModelIds = splitIds(row.application_unit_model_ids)
      const modelIds = splitIds(row.application_model_ids)
      return unitModelIds.includes(modelId) || modelIds.includes(modelId) || Number(row.client_equipment_unit_id) === unitId
    })
  }, [rawWorkspaceClientParts, selectedUnitFromTree])

  const handleTreeSelect = (keys) => {
    const key = keys?.[0] || null
    setSelectedTreeKey(key)
    if (!key) {
      setSelectedTreeEntity({ type: "node", id: null })
      setSelectedId(null)
      return
    }

    const parsed = parseTreeKey(key)
    if (parsed.type === "node") {
      setSelectedTreeEntity({ type: "node", id: parsed.id })
      setSelectedId(parsed.id ? String(parsed.id) : null)
      return
    }
    if (parsed.type === "manufacturer") {
      setSelectedTreeEntity({ type: "manufacturer", id: parsed.extraId, nodeId: parsed.id })
      setSelectedId(parsed.id ? String(parsed.id) : null)
      return
    }
    if (parsed.type === "model") {
      const model = allModels.find((item) => Number(item.id) === Number(parsed.id))
      setSelectedTreeEntity({ type: "model", id: parsed.id })
      setSelectedId(model?.classifier_node_id ? String(model.classifier_node_id) : null)
      return
    }
    if (parsed.type === "unit") {
      const unit = allUnits.find((item) => Number(item.id) === Number(parsed.id))
      setSelectedTreeEntity({ type: "unit", id: parsed.id })
      setSelectedId(unit?.classifier_node_id ? String(unit.classifier_node_id) : null)
    }
  }

  const openModelDetails = (row) => {
    setDetailsModel(row || null)
    setModelDetailsOpen(true)
  }

  const modelMatchesAttributeFilters = (model) =>
    filterableAttributes.every((attribute) => {
      const filter = attributeFilters[attribute.id]
      if (!filter) return true
      const valueRow = getModelAttributeValue(model, attribute.id)

      if (attribute.value_type === "number") {
        const hasMin = filter.min !== undefined && filter.min !== null && filter.min !== ""
        const hasMax = filter.max !== undefined && filter.max !== null && filter.max !== ""
        if (!hasMin && !hasMax) return true
        const value = Number(valueRow?.value_number)
        if (!Number.isFinite(value)) return false
        if (hasMin && value < Number(filter.min)) return false
        if (hasMax && value > Number(filter.max)) return false
        return true
      }

      if (attribute.value_type === "boolean") {
        if (filter.value === undefined || filter.value === null || filter.value === "") return true
        if (!valueRow || valueRow.value_boolean === null || valueRow.value_boolean === undefined) return false
        return Number(valueRow.value_boolean) === (filter.value ? 1 : 0)
      }

      if (attribute.value_type === "multiselect") {
        const selected = Array.isArray(filter.value) ? filter.value : []
        if (!selected.length) return true
        let actual = []
        try {
          actual = Array.isArray(valueRow?.value_json) ? valueRow.value_json : JSON.parse(valueRow?.value_json || "[]")
        } catch {
          actual = []
        }
        return selected.every((item) => actual.includes(item))
      }

      const raw = String(valueRow?.value_text || valueRow?.value_date || "").trim()
      if (filter.value === undefined || filter.value === null || filter.value === "") return true
      if (!raw) return false
      if (attribute.value_type === "select") return raw === filter.value
      return raw.toLowerCase().includes(String(filter.value).trim().toLowerCase())
    })

  const workspaceModels = useMemo(() => {
    let rows = rawWorkspaceModels
    if (workspaceNeedle) {
      rows = rows.filter((row) =>
        [
          row.manufacturer_name,
          row.model_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(workspaceNeedle),
      )
    }
    if (hasActiveAttributeFilters) {
      rows = rows.filter((row) => modelMatchesAttributeFilters(row))
    }
    return rows
  }, [attributeFilters, filterableAttributes, hasActiveAttributeFilters, rawWorkspaceModels, workspaceNeedle])

  const currentManufacturerModels = useMemo(() => {
    if (selectedTreeEntity.type !== "manufacturer" || !selectedTreeEntity.id) return []
    return workspaceModels.filter((model) => Number(model.manufacturer_id) === Number(selectedTreeEntity.id))
  }, [selectedTreeEntity, workspaceModels])

  const modelsColumns = [
    {
      title: "Производитель",
      dataIndex: "manufacturer_name",
      width: 180,
    },
    {
      title: "Модель",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{row.model_name || "—"}</Typography.Text>
          <Typography.Text type="secondary">
            {row.classifier_node_name || "—"}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Машины клиентов",
      dataIndex: "units_count",
      width: 140,
      align: "center",
    },
    {
      title: "OEM детали",
      dataIndex: "oem_parts_count",
      width: 120,
      align: "center",
    },
    {
      title: "Действия",
      key: "actions",
      width: 240,
      render: (_, row) => (
        <Space wrap>
          <Button size="small" onClick={() => openModelDetails(row)}>
            Открыть
          </Button>
          <Button size="small" onClick={() => openModelAttributes(row)}>
            Характеристики
          </Button>
          <Button size="small" onClick={() => openMoveModel(row)}>
            Перенести
          </Button>
        </Space>
      ),
    },
  ]

  const searchColumns = [
    {
      title: "Найдено",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{row.title || "—"}</Typography.Text>
          <Typography.Text type="secondary">{row.subtitle || "—"}</Typography.Text>
        </Space>
      ),
    },
    {
      title: "Раздел классификатора",
      dataIndex: "classifier_node_name",
      width: 220,
      render: (value) => (value ? <Tag color="blue">{value}</Tag> : "—"),
    },
    {
      title: "Детали",
      dataIndex: "detail",
      render: (value) => value || "—",
    },
    {
      title: "Действие",
      key: "action",
      width: 120,
      render: (_, row) => (
        <Button size="small" onClick={() => openSearchResult(row)}>
          {row.entity_type === "oem_part" ? "OEM" : row.entity_type === "client_part" ? "Клиент" : "Показать"}
        </Button>
      ),
    },
  ]

  const searchGroups = useMemo(() => {
    const byType = new Map()
    nsiSearchRows.forEach((row) => {
      const type = row.entity_type || "unknown"
      if (!byType.has(type)) byType.set(type, [])
      byType.get(type).push(row)
    })
    return Array.from(byType.entries())
      .sort(([a], [b]) => {
        const ai = SEARCH_TYPE_ORDER.indexOf(a)
        const bi = SEARCH_TYPE_ORDER.indexOf(b)
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
      })
      .map(([type, rows]) => ({ type, rows }))
  }, [nsiSearchRows])

  const attributeColumns = [
    {
      title: "Характеристика",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{row.label || "—"}</Typography.Text>
          <Typography.Text type="secondary">{row.help_text || row.code || "—"}</Typography.Text>
        </Space>
      ),
    },
    {
      title: "Тип",
      width: 190,
      render: (_, row) => (
        <Space wrap size={4}>
          <Tag>{ATTRIBUTE_TYPE_LABELS[row.value_type] || row.value_type}</Tag>
          {row.unit ? <Tag color="blue">{formatMeasurementUnit(row.unit)}</Tag> : null}
        </Space>
      ),
    },
    {
      title: "Источник",
      width: 190,
      render: (_, row) =>
        row.inherited ? (
          <Tag color="purple">{row.source_node_name || "Родительский раздел"}</Tag>
        ) : (
          <Tag color="green">Этот раздел</Tag>
        ),
    },
    {
      title: "Режим",
      width: 160,
      render: (_, row) => (
        <Space wrap size={4}>
          {row.is_filterable ? <Tag color="cyan">Фильтр</Tag> : null}
          {row.is_required ? <Tag color="orange">Обязательная</Tag> : null}
          {!row.is_filterable && !row.is_required ? "—" : null}
        </Space>
      ),
    },
    {
      title: "Действия",
      key: "actions",
      width: 150,
      render: (_, row) =>
        Number(row.classifier_node_id) === Number(selectedNode?.id) ? (
          <Space wrap>
            <Button size="small" onClick={() => openEditAttribute(row)}>
              Изменить
            </Button>
            <Popconfirm
              title="Отключить характеристику?"
              description={row.label}
              okText="Отключить"
              cancelText="Отмена"
              onConfirm={() => handleDeleteAttribute(row)}
            >
              <Button size="small" danger>
                Убрать
              </Button>
            </Popconfirm>
          </Space>
        ) : (
          <Typography.Text type="secondary">Наследуется</Typography.Text>
        ),
    },
  ]

  const renderAttributeValueInput = (attribute) => {
    const name = `attr_${attribute.id}`
    const label = attribute.unit ? `${attribute.label}, ${formatMeasurementUnit(attribute.unit)}` : attribute.label
    const rules = attribute.is_required ? [{ required: true, message: "Заполните характеристику" }] : []
    const options = (attribute.options || []).map((option) => ({
      value: option.value_code,
      label: option.value_label,
    }))

    if (attribute.value_type === "number") {
      return (
        <Form.Item key={attribute.id} label={label} name={name} rules={rules}>
          <InputNumber style={{ width: "100%" }} decimalSeparator="," />
        </Form.Item>
      )
    }
    if (attribute.value_type === "boolean") {
      return (
        <Form.Item key={attribute.id} label={attribute.label} name={name}>
          <Select
            allowClear
            options={[
              { value: true, label: "Да" },
              { value: false, label: "Нет" },
            ]}
          />
        </Form.Item>
      )
    }
    if (attribute.value_type === "textarea") {
      return (
        <Form.Item key={attribute.id} label={attribute.label} name={name} rules={rules}>
          <Input.TextArea rows={3} />
        </Form.Item>
      )
    }
    if (attribute.value_type === "select") {
      return (
        <Form.Item key={attribute.id} label={attribute.label} name={name} rules={rules}>
          <Select allowClear options={options} />
        </Form.Item>
      )
    }
    if (attribute.value_type === "multiselect") {
      return (
        <Form.Item key={attribute.id} label={attribute.label} name={name} rules={rules}>
          <Select mode="multiple" allowClear options={options} />
        </Form.Item>
      )
    }
    return (
      <Form.Item key={attribute.id} label={attribute.label} name={name} rules={rules}>
        <Input />
      </Form.Item>
    )
  }

  const renderAttributeFilterControl = (attribute) => {
    const filter = attributeFilters[attribute.id] || {}
    const label = attribute.unit ? `${attribute.label}, ${attribute.unit}` : attribute.label
    const commonLabel = (
      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
        {label}
      </Typography.Text>
    )

    if (attribute.value_type === "number") {
      return (
        <div key={attribute.id} style={{ minWidth: 220 }}>
          {commonLabel}
          <Space.Compact>
            <InputNumber
              placeholder="от"
              value={filter.min}
              onChange={(value) => setAttributeFilterValue(attribute.id, { min: value })}
              style={{ width: 105 }}
            />
            <InputNumber
              placeholder="до"
              value={filter.max}
              onChange={(value) => setAttributeFilterValue(attribute.id, { max: value })}
              style={{ width: 105 }}
            />
          </Space.Compact>
        </div>
      )
    }

    if (attribute.value_type === "boolean") {
      return (
        <div key={attribute.id} style={{ minWidth: 180 }}>
          {commonLabel}
          <Select
            allowClear
            placeholder="Любое"
            value={filter.value}
            onChange={(value) => setAttributeFilterValue(attribute.id, { value })}
            options={[
              { value: true, label: "Да" },
              { value: false, label: "Нет" },
            ]}
            style={{ width: "100%" }}
          />
        </div>
      )
    }

    if (attribute.value_type === "select") {
      return (
        <div key={attribute.id} style={{ minWidth: 220 }}>
          {commonLabel}
          <Select
            allowClear
            placeholder="Любое"
            value={filter.value}
            onChange={(value) => setAttributeFilterValue(attribute.id, { value })}
            options={(attribute.options || []).map((option) => ({
              value: option.value_code,
              label: option.value_label,
            }))}
            style={{ width: "100%" }}
          />
        </div>
      )
    }

    if (attribute.value_type === "multiselect") {
      return (
        <div key={attribute.id} style={{ minWidth: 260 }}>
          {commonLabel}
          <Select
            mode="multiple"
            allowClear
            placeholder="Любое"
            value={filter.value || []}
            onChange={(value) => setAttributeFilterValue(attribute.id, { value })}
            options={(attribute.options || []).map((option) => ({
              value: option.value_code,
              label: option.value_label,
            }))}
            style={{ width: "100%" }}
          />
        </div>
      )
    }

    return (
      <div key={attribute.id} style={{ minWidth: 220 }}>
        {commonLabel}
        <Input
          allowClear
          placeholder="Содержит"
          value={filter.value}
          onChange={(event) => setAttributeFilterValue(attribute.id, { value: event.target.value })}
        />
      </div>
    )
  }

  const modelDetailsAttributeColumns = [
    {
      title: "Характеристика",
      dataIndex: "label",
      render: (value) => value || "—",
    },
    {
      title: "Значение",
      dataIndex: "display_value",
      width: 220,
      render: (value) => value || "—",
    },
  ]

  const compactOemColumns = [
    {
      title: "OEM",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{row.part_number || "—"}</Typography.Text>
          <Typography.Text type="secondary">{row.manufacturer_name || "—"}</Typography.Text>
        </Space>
      ),
    },
    {
      title: "Описание",
      render: (_, row) => row.description_ru || row.description_en || row.tech_description || "—",
    },
    {
      title: "Действие",
      width: 100,
      render: (_, row) => (
        <Button size="small" onClick={() => navigate(`/original-parts/${row.id}`)}>
          OEM
        </Button>
      ),
    },
  ]

  const compactUnitColumns = [
    {
      title: "Клиент",
      dataIndex: "client_name",
      render: (value) => value || "—",
    },
    {
      title: "Машина",
      render: (_, row) => [row.internal_name, row.serial_number, row.site_name].filter(Boolean).join(" / ") || "—",
    },
    {
      title: "Действие",
      width: 100,
      render: (_, row) => (
        <Button size="small" onClick={() => navigate(`/clients/${row.client_id}`)}>
          Клиент
        </Button>
      ),
    },
  ]

  const compactClientPartColumns = [
    {
      title: "Деталь клиента",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{row.display_name || "—"}</Typography.Text>
          <Typography.Text type="secondary">
            {[row.client_part_number, row.drawing_number, row.revision_code].filter(Boolean).join(" / ") || "без номера"}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Отличие",
      dataIndex: "difference_summary",
      render: (value) => value || "—",
    },
    {
      title: "Действие",
      width: 100,
      render: (_, row) => (
        <Button size="small" onClick={() => navigate(`/clients/${row.client_id}`)}>
          Клиент
        </Button>
      ),
    },
  ]

  const renderNodeContent = () => (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Space wrap size={24}>
        <Statistic title="Разделов ниже" value={Number(workspaceStats.subtree_nodes_count) || 0} loading={workspaceLoading} />
        <Statistic title="Моделей" value={Number(workspaceStats.models_count) || 0} loading={workspaceLoading} />
        <Statistic title="Машин клиентов" value={Number(workspaceStats.units_count) || 0} loading={workspaceLoading} />
        <Statistic title="OEM деталей" value={Number(workspaceStats.oem_parts_count) || 0} loading={workspaceLoading} />
        <Statistic title="Деталей клиентов" value={Number(workspaceStats.client_parts_count) || 0} loading={workspaceLoading} />
      </Space>

      <Space wrap>
        <Button type="primary" onClick={openCreateModel}>
          Добавить модель
        </Button>
        <Button onClick={openCreateAttribute}>
          Настроить характеристики
        </Button>
        {canEditSelectedNode ? (
          <>
            <Button onClick={openEdit}>
              Изменить раздел
            </Button>
            <Popconfirm
              title="Удалить раздел классификатора?"
              description={selectedNode?.name || ""}
              okText="Удалить"
              cancelText="Отмена"
              onConfirm={handleDelete}
            >
              <Button danger>
                Удалить раздел
              </Button>
            </Popconfirm>
          </>
        ) : null}
      </Space>

      <Input
        allowClear
        placeholder="Фильтр моделей: производитель или модель"
        value={workspaceQuery}
        onChange={(event) => setWorkspaceQuery(event.target.value)}
      />

      {filterableAttributes.length ? (
        <Card
          size="small"
          title="Фильтры моделей"
          extra={
            hasActiveAttributeFilters ? (
              <Button size="small" onClick={() => setAttributeFilters({})}>
                Сбросить
              </Button>
            ) : null
          }
        >
          <Space wrap align="start" size={[12, 12]}>
            {filterableAttributes.map((attribute) => renderAttributeFilterControl(attribute))}
          </Space>
        </Card>
      ) : null}

      <Table
        size="small"
        rowKey="id"
        columns={modelsColumns}
        dataSource={workspaceModels}
        loading={workspaceLoading}
        pagination={{ pageSize: 12, showSizeChanger: false }}
        locale={{ emptyText: "В этом разделе пока нет моделей" }}
        scroll={{ x: 860 }}
      />

      <Card
        size="small"
        title={`Характеристики раздела (${attributes.length})`}
        extra={
          <Button size="small" onClick={openCreateAttribute}>
            Настроить
          </Button>
        }
      >
        <Table
          size="small"
          rowKey="id"
          columns={attributeColumns}
          dataSource={attributes}
          loading={attributesLoading}
          pagination={false}
          locale={{ emptyText: "Для этого раздела пока не настроены характеристики" }}
          scroll={{ x: 860 }}
        />
      </Card>
    </Space>
  )

  const renderManufacturerContent = () => (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Space wrap>
        <Button type="primary" onClick={openCreateModel}>
          Добавить модель {selectedManufacturerFromTree?.name ? selectedManufacturerFromTree.name : ""}
        </Button>
      </Space>
      <Table
        size="small"
        rowKey="id"
        columns={modelsColumns}
        dataSource={currentManufacturerModels}
        loading={workspaceLoading}
        pagination={false}
        locale={{ emptyText: "У производителя пока нет моделей в этом разделе" }}
        scroll={{ x: 860 }}
      />
    </Space>
  )

  const renderModelContent = () => (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Descriptions bordered size="small" column={2}>
        <Descriptions.Item label="Производитель">
          {currentModel?.manufacturer_name || "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Модель">
          {currentModel?.model_name || "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Раздел классификатора">
          {currentModel?.classifier_node_name || selectedNode?.name || "—"}
        </Descriptions.Item>
        <Descriptions.Item label="OEM деталей">
          {Number(currentModel?.oem_parts_count) || currentModelOemParts.length}
        </Descriptions.Item>
        <Descriptions.Item label="Машин клиентов">
          {Number(currentModel?.units_count) || currentModelUnits.length}
        </Descriptions.Item>
        <Descriptions.Item label="Заметки" span={2}>
          {currentModel?.notes || "—"}
        </Descriptions.Item>
      </Descriptions>

      <Space wrap>
        <Button type="primary" onClick={() => currentModel && openModelAttributes(currentModel)} disabled={!currentModel}>
          Характеристики
        </Button>
        <Button onClick={() => currentModel && openMoveModel(currentModel)} disabled={!currentModel}>
          Перенести модель
        </Button>
      </Space>

      <Card size="small" title={`OEM детали (${currentModelOemParts.length})`}>
        <Table
          size="small"
          rowKey="id"
          columns={compactOemColumns}
          dataSource={currentModelOemParts}
          loading={workspaceLoading}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          locale={{ emptyText: "Для этой модели пока нет OEM-деталей" }}
        />
      </Card>

      <Card size="small" title={`Машины клиентов (${currentModelUnits.length})`}>
        <Table
          size="small"
          rowKey="id"
          columns={compactUnitColumns}
          dataSource={currentModelUnits}
          loading={workspaceLoading}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          locale={{ emptyText: "Для этой модели пока нет машин клиентов" }}
        />
      </Card>

      <Card size="small" title={`Детали клиентов (${currentModelClientParts.length})`}>
        <Table
          size="small"
          rowKey="id"
          columns={compactClientPartColumns}
          dataSource={currentModelClientParts}
          loading={workspaceLoading}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          locale={{ emptyText: "Для этой модели пока нет деталей клиентов" }}
        />
      </Card>
    </Space>
  )

  const renderUnitContent = () => (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Descriptions bordered size="small" column={2}>
        <Descriptions.Item label="Клиент">
          {selectedUnitFromTree?.client_name || "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Модель">
          {[selectedUnitFromTree?.manufacturer_name, selectedUnitFromTree?.model_name].filter(Boolean).join(" ") || "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Серийный номер">
          {selectedUnitFromTree?.serial_number || "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Год">
          {selectedUnitFromTree?.manufacture_year || "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Площадка" span={2}>
          {selectedUnitFromTree?.site_name || "—"}
        </Descriptions.Item>
      </Descriptions>
      <Space wrap>
        <Button type="primary" onClick={() => selectedUnitFromTree?.client_id && navigate(`/clients/${selectedUnitFromTree.client_id}`)}>
          Открыть клиента
        </Button>
      </Space>

      <Card size="small" title={`OEM каталог модели (${currentUnitOemParts.length})`}>
        <Table
          size="small"
          rowKey="id"
          columns={compactOemColumns}
          dataSource={currentUnitOemParts}
          loading={workspaceLoading}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          locale={{ emptyText: "Для модели этой машины пока нет OEM-деталей" }}
        />
      </Card>

      <Card size="small" title={`Особенности и детали клиента (${currentUnitClientParts.length})`}>
        <Table
          size="small"
          rowKey="id"
          columns={compactClientPartColumns}
          dataSource={currentUnitClientParts}
          loading={workspaceLoading}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          locale={{ emptyText: "Для этой машины пока нет клиентских отличий" }}
        />
      </Card>
    </Space>
  )

  const renderContextContent = () => {
    if (!selectedNode) return <Empty description="Выберите раздел, производителя, модель или машину слева" />
    if (selectedTreeEntity.type === "manufacturer") return renderManufacturerContent()
    if (selectedTreeEntity.type === "model") return renderModelContent()
    if (selectedTreeEntity.type === "unit") return renderUnitContent()
    return renderNodeContent()
  }

  const contextTitle =
    selectedTreeEntity.type === "manufacturer"
      ? selectedManufacturerFromTree?.name || "Производитель"
      : selectedTreeEntity.type === "model"
        ? [currentModel?.manufacturer_name, currentModel?.model_name].filter(Boolean).join(" ") || "Модель"
        : selectedTreeEntity.type === "unit"
          ? selectedUnitFromTree?.client_name || "Машина клиента"
          : selectedNode?.name || "Рабочая область"

  const canEditSelectedNode = selectedTreeEntity.type === "node" && selectedNode
  const addMenuItems = [
    {
      key: "root-section",
      label: "Раздел верхнего уровня",
    },
    {
      key: "child-section",
      label: "Подраздел в выбранном разделе",
      disabled: !canEditSelectedNode,
    },
    {
      key: "model",
      label: "Модель в выбранном разделе",
      disabled: !selectedNode,
    },
  ]

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Card
        size="small"
        title="Поиск"
        extra={
          <Dropdown
            menu={{
              items: addMenuItems,
              onClick: ({ key }) => {
                if (key === "root-section") openCreateRoot()
                if (key === "child-section") openCreateChild()
                if (key === "model") openCreateModel()
              },
            }}
            trigger={["click"]}
          >
            <Button type="primary">+ Добавить</Button>
          </Dropdown>
        }
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Input.Search
            allowClear
            enterButton="Найти"
            placeholder="OEM номер, модель, клиент, серийный номер, чертеж или название детали"
            value={nsiSearchQuery}
            onChange={(event) => {
              const value = event.target.value
              setNsiSearchQuery(value)
              if (!value) setNsiSearchRows([])
            }}
            onSearch={handleNsiSearch}
            loading={nsiSearchLoading}
          />
          {nsiSearchRows.length || nsiSearchLoading ? (
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              {searchGroups.map((group) => (
                <Card
                  key={group.type}
                  size="small"
                  title={
                    <Space>
                      <Tag color={SEARCH_TYPE_COLORS[group.type] || "default"}>
                        {SEARCH_TYPE_LABELS[group.type] || group.type}
                      </Tag>
                      <Typography.Text type="secondary">{group.rows.length}</Typography.Text>
                    </Space>
                  }
                >
                  <Table
                    size="small"
                    rowKey={(row) => `${row.entity_type}-${row.entity_id}`}
                    columns={searchColumns}
                    dataSource={group.rows}
                    loading={nsiSearchLoading}
                    pagination={group.rows.length > 5 ? { pageSize: 5, showSizeChanger: false } : false}
                    scroll={{ x: 840 }}
                  />
                </Card>
              ))}
            </Space>
          ) : null}
        </Space>
      </Card>

      <Row gutter={[12, 12]} align="top">
        <Col xs={24} xl={8}>
          <Card
            title="Дерево классификатора"
            size="small"
            bodyStyle={{ minHeight: 520 }}
          >
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Input
                allowClear
                placeholder="Поиск по разделам классификатора"
                value={treeQuery}
                onChange={(event) => setTreeQuery(event.target.value)}
              />
            {treeData.length ? (
              <Tree
                selectedKeys={selectedTreeKey ? [selectedTreeKey] : []}
                onSelect={handleTreeSelect}
                treeData={treeData}
                defaultExpandAll
              />
            ) : (
              <Empty description={treeQuery ? "Поиск не дал совпадений" : "Классификатор пока пуст"} />
            )}
            </Space>
          </Card>
        </Col>

        <Col xs={24} xl={16}>
          <Card
            title={contextTitle}
            size="small"
            bodyStyle={{ minHeight: 520 }}
          >
            {renderContextContent()}
          </Card>
        </Col>
      </Row>

      <Drawer
        open={modelDetailsOpen}
        title={
          detailsModel
            ? `${detailsModel.manufacturer_name || ""} ${detailsModel.model_name || ""}`.trim() || "Модель оборудования"
            : "Модель оборудования"
        }
        onClose={() => setModelDetailsOpen(false)}
        width={760}
      >
        {detailsModel ? (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Производитель">
                {detailsModel.manufacturer_name || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Модель">
                {detailsModel.model_name || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Раздел классификатора">
                {detailsModel.classifier_node_name || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="OEM деталей">
                {Number(detailsModel.oem_parts_count) || 0}
              </Descriptions.Item>
              <Descriptions.Item label="Машин клиентов">
                {Number(detailsModel.units_count) || 0}
              </Descriptions.Item>
              <Descriptions.Item label="Заметки" span={2}>
                {detailsModel.notes || "—"}
              </Descriptions.Item>
            </Descriptions>

            <Card
              size="small"
              title="Характеристики модели"
              extra={
                <Button size="small" onClick={() => openModelAttributes(detailsModel)}>
                  Изменить
                </Button>
              }
            >
              <Table
                size="small"
                rowKey={(row) => row.attribute_id}
                columns={modelDetailsAttributeColumns}
                dataSource={Array.isArray(detailsModel.attribute_values) ? detailsModel.attribute_values : []}
                pagination={false}
                locale={{ emptyText: "У модели пока не заполнены характеристики" }}
              />
            </Card>

            <Card size="small" title={`OEM детали (${selectedModelOemParts.length})`}>
              <Table
                size="small"
                rowKey="id"
                columns={compactOemColumns}
                dataSource={selectedModelOemParts}
                pagination={{ pageSize: 6, showSizeChanger: false }}
                locale={{ emptyText: "Для этой модели пока нет OEM-деталей" }}
              />
            </Card>

            <Card size="small" title={`Машины клиентов (${selectedModelUnits.length})`}>
              <Table
                size="small"
                rowKey="id"
                columns={compactUnitColumns}
                dataSource={selectedModelUnits}
                pagination={{ pageSize: 6, showSizeChanger: false }}
                locale={{ emptyText: "Для этой модели пока нет машин клиентов" }}
              />
            </Card>

            <Card size="small" title={`Детали клиентов (${selectedModelClientParts.length})`}>
              <Table
                size="small"
                rowKey="id"
                columns={compactClientPartColumns}
                dataSource={selectedModelClientParts}
                pagination={{ pageSize: 6, showSizeChanger: false }}
                locale={{ emptyText: "Для этой модели пока нет деталей клиентов" }}
              />
            </Card>
          </Space>
        ) : (
          <Empty description="Модель не выбрана" />
        )}
      </Drawer>

      <Modal
        open={modalOpen}
        title={
          editingNode
            ? "Редактирование раздела"
            : parentForCreate
              ? `Новый подраздел для "${parentForCreate.name}"`
              : "Новый раздел"
        }
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        okText={editingNode ? "Сохранить" : "Создать"}
        cancelText="Отмена"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={EMPTY_FORM}>
          <Form.Item
            label="Название"
            name="name"
            rules={[{ required: true, message: "Укажите название раздела" }]}
          >
            <Input placeholder="Например: Дробилки конусные" />
          </Form.Item>
          <Form.Item label="Заметки" name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={moveModelOpen}
        title={
          movingModel
            ? `Перенос модели: ${movingModel.manufacturer_name || ""} ${movingModel.model_name || ""}`
            : "Перенос модели"
        }
        onCancel={() => setMoveModelOpen(false)}
        onOk={handleMoveModel}
        confirmLoading={moveModelSaving}
        okText="Перенести"
        cancelText="Отмена"
        okButtonProps={{
          disabled:
            !moveTargetNodeId ||
            Number(moveTargetNodeId) === Number(movingModel?.classifier_node_id || 0),
        }}
        destroyOnHidden
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Typography.Text type="secondary">
            Выберите новый раздел классификатора. Все OEM-применения, BOM и машины клиентов останутся привязаны к этой модели.
          </Typography.Text>
          {treeData.length ? (
            <Tree
              treeData={treeData}
              defaultExpandAll
              selectedKeys={moveTargetNodeId ? [String(moveTargetNodeId)] : []}
              onSelect={(keys) => setMoveTargetNodeId(Number(keys?.[0] || 0) || null)}
              height={420}
            />
          ) : (
            <Empty description="Нет доступных разделов классификатора" />
          )}
        </Space>
      </Modal>

      <Modal
        open={attributeModalOpen}
        title={editingAttribute ? "Характеристика оборудования" : "Новая характеристика оборудования"}
        onCancel={() => setAttributeModalOpen(false)}
        onOk={handleSaveAttribute}
        confirmLoading={attributeSaving}
        okText="Сохранить"
        cancelText="Отмена"
        destroyOnHidden
      >
        <Form form={attributeForm} layout="vertical">
          <Form.Item
            label="Название"
            name="label"
            rules={[{ required: true, message: "Укажите название характеристики" }]}
          >
            <Input placeholder="Например: Диаметр конуса" />
          </Form.Item>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item label="Тип значения" name="value_type">
                <Select options={ATTRIBUTE_TYPE_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Единица" name="unit">
                <Select
                  allowClear
                  showSearch
                  loading={measurementUnitsLoading}
                  options={attributeUnitOptions}
                  optionFilterProp="label"
                  placeholder="Выберите единицу"
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item label="Порядок" name="sort_order">
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="В фильтрах" name="is_filterable" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="Обязательная" name="is_required" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) =>
              ["select", "multiselect"].includes(getFieldValue("value_type")) ? (
                <Form.Item label="Варианты списка" name="options_text">
                  <Input.TextArea rows={4} placeholder={"Мелкая\nСредняя\nКрупная"} />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item label="Подсказка" name="help_text">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={modelAttributesOpen}
        title={
          attributeModel
            ? `Характеристики модели: ${attributeModel.manufacturer_name || ""} ${attributeModel.model_name || ""}`
            : "Характеристики модели"
        }
        onCancel={() => setModelAttributesOpen(false)}
        onOk={handleSaveModelAttributes}
        confirmLoading={modelAttributesSaving}
        okText="Сохранить"
        cancelText="Отмена"
        destroyOnHidden
      >
        {modelAttributesLoading ? (
          <Typography.Text type="secondary">Загружаем характеристики...</Typography.Text>
        ) : modelAttributeRows.length ? (
          <Form form={modelAttributesForm} layout="vertical">
            {modelAttributeRows.map((attribute) => renderAttributeValueInput(attribute))}
          </Form>
        ) : (
          <Empty description="Для этого раздела пока нет характеристик" />
        )}
      </Modal>

      <Modal
        open={modelModalOpen}
        title={selectedNode ? `Новая модель для раздела "${selectedNode.name}"` : "Новая модель"}
        onCancel={() => setModelModalOpen(false)}
        onOk={handleCreateModel}
        confirmLoading={modelSaving}
        okText="Создать"
        cancelText="Отмена"
        destroyOnHidden
      >
        <Form form={modelForm} layout="vertical">
          <Form.Item
            label="Производитель"
            name="manufacturer_id"
            rules={[{ required: true, message: "Выберите производителя" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={manufacturers.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
          </Form.Item>
          <Button type="link" style={{ paddingLeft: 0, marginTop: -8 }} onClick={openCreateManufacturer}>
            + Новый производитель
          </Button>
          <Form.Item
            label="Модель"
            name="model_name"
            rules={[{ required: true, message: "Укажите модель" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Заметки" name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={manufacturerModalOpen}
        title="Новый производитель оборудования"
        onCancel={() => setManufacturerModalOpen(false)}
        onOk={handleCreateManufacturer}
        confirmLoading={manufacturerSaving}
        okText="Создать"
        cancelText="Отмена"
        destroyOnHidden
      >
        <Form form={manufacturerForm} layout="vertical">
          <Form.Item
            label="Название"
            name="name"
            rules={[{ required: true, message: "Укажите производителя" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Страна" name="country">
            <Input />
          </Form.Item>
          <Form.Item label="Сайт" name="website">
            <Input />
          </Form.Item>
          <Form.Item label="Заметки" name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}
