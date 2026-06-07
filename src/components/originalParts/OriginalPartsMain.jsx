import React, { useEffect, useState, useRef, useCallback } from "react"
import {
  Card,
  Space,
  Row,
  Col,
  Checkbox,
  Badge,
  Tooltip,
  message,
  Button,
  Form,
  Input,
  InputNumber,
  Tag,
  Empty,
  Select,
  Segmented,
  Popover,
  Modal,
  Drawer,
  Typography,
  Alert,
  Divider,
} from "antd"
import {
  ApartmentOutlined,
  FilterOutlined,
  ReloadOutlined,
  SettingOutlined,
  PlusOutlined,
} from "@ant-design/icons"
import { useLocation, useNavigate } from "react-router-dom"
import axios from "@/api/axiosInstance"
import TableToolbar from "@/components/common/TableToolbar"
import ImportModal from "@/components/common/ImportModal"
import OriginalPartsTable from "./OriginalPartsTable"
import OriginalPartsRootsTree from "./OriginalPartsRootsTree"
import OriginalPartsFiltersDrawer from "./OriginalPartsFiltersDrawer"
import { countActiveFilters } from "./originalPartsFiltersUtils"
import ManufacturerModelPicker from "@/components/originalParts/ManufacturerModelPicker"
import OriginalPartGroupsManager from "@/components/originalParts/OriginalPartGroupsManager"
import TnvedPicker from "@/components/fields/TnvedPicker"
import useMeasurementUnits from "@/hooks/useMeasurementUnits"
import { compactInputNumberProps } from "@/utils/numberFormat"
const { Text } = Typography

const normalizePartNumber = (v) =>
  String(v || "")
    .trim()
    .toUpperCase()
    .replace(/[\s\-.]/g, "")

export default function OriginalPartsMain() {
  const location = useLocation()
  const [manufacturer, setManufacturer] = useState(null)
  const [model, setModel] = useState(null)
  const [catalogContext, setCatalogContext] = useState(null)

  const [search, setSearch] = useState("")
  // viewMode:
  // - roots: корневые узлы как дерево
  // - assemblies: таблица только сборок
  // - parts: таблица только деталей
  // - all: таблица всех
  // - orphans: таблица "вне структуры" (детали без родителей)
  const [viewMode, setViewMode] = useState("all")

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [highlightRowId, setHighlightRowId] = useState(null)
  const highlightTimerRef = useRef(null)
  const [treeFocusId, setTreeFocusId] = useState(null)

  const [importOpen, setImportOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [addForm] = Form.useForm()
  const [manufacturerModels, setManufacturerModels] = useState([])
  const [manufacturerModelsLoading, setManufacturerModelsLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm] = Form.useForm()
  const [editingRow, setEditingRow] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editApplicationModels, setEditApplicationModels] = useState([])
  const [editApplicationModelsLoading, setEditApplicationModelsLoading] = useState(false)
  const createCatInputRef = useRef(null)
  const createSubmitModeRef = useRef("create_close")
  const createCatNumber = Form.useWatch("cat_number", addForm)
  const [reusePreview, setReusePreview] = useState({
    loading: false,
    existsInCurrentModel: false,
    modelNames: [],
  })

  const navigate = useNavigate()
  const { options: uomOptions, loading: uomLoading } = useMeasurementUnits()

  const partsAbortRef = useRef(null)

  // 🔹 режим "Показать все детали"
  const [showAll, setShowAll] = useState(true)

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState({})

  const [columnsMeta, setColumnsMeta] = useState({ options: [], defaultVisible: [], lockedKeys: [] })
  const [columnsPopoverOpen, setColumnsPopoverOpen] = useState(false)

  const [materialOptions, setMaterialOptions] = useState([])
  const [materialsLoading, setMaterialsLoading] = useState(false)

  // per-view column visibility (synced via backend to support multiple devices)
  const [columnsByView, setColumnsByView] = useState({})
  const [columnOrderByView, setColumnOrderByView] = useState({})
  const columnsLoadStartedRef = useRef(false)
  const columnsHydratedRef = useRef(false)
  const columnsSaveTimerRef = useRef(null)

  // группы — для формы добавления и менеджера групп
  const [groups, setGroups] = useState([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [groupManagerOpen, setGroupManagerOpen] = useState(false)
  const restoreAppliedRef = useRef(false)
  const contentAnimRef = useRef(null)

  useEffect(() => {
    if (restoreAppliedRef.current) return
    const restore = location.state?.restore
    if (!restore) return
    restoreAppliedRef.current = true

    if (restore.manufacturer) {
      setManufacturer(restore.manufacturer)
    }
    if (restore.model) {
      setModel(restore.model)
    }
    if (restore.catalogContext !== undefined) {
      setCatalogContext(restore.catalogContext || null)
    }
    if (restore.search !== undefined) setSearch(restore.search || "")
    if (restore.showAll !== undefined) setShowAll(!!restore.showAll)
    if (restore.filters !== undefined) setFilters(restore.filters || {})
    if (restore.columnsByView !== undefined) setColumnsByView(restore.columnsByView || {})
    if (restore.columnOrderByView !== undefined) {
      setColumnOrderByView(restore.columnOrderByView || {})
    }
    if (restore.viewMode) {
      setViewMode(String(restore.viewMode))
    } else if (restore.onlyAssemblies) {
      setViewMode("assemblies")
    } else if (restore.onlyParts) {
      setViewMode("parts")
    }

    if (restore.treeFocusId !== undefined) {
      const n = restore.treeFocusId == null ? null : Number(restore.treeFocusId)
      setTreeFocusId(Number.isFinite(n) && n > 0 ? n : null)
    }
  }, [location.state])

  // subtle content transition when switching modes/scope/model
  useEffect(() => {
    const el = contentAnimRef.current
    if (!el) return
    try {
      el.animate(
        [
          { opacity: 0, transform: "translateY(4px)" },
          { opacity: 1, transform: "translateY(0px)" },
        ],
        { duration: 170, easing: "ease-out" }
      )
    } catch {
      // no-op (older browsers)
    }
  }, [viewMode, showAll, model?.id])

  const flashRow = useCallback((id) => {
    const n = Number(id)
    if (!Number.isFinite(n) || n <= 0) return
    setHighlightRowId(n)
    clearTimeout(highlightTimerRef.current)
    highlightTimerRef.current = setTimeout(() => {
      setHighlightRowId(null)
    }, 1600)
  }, [])

  useEffect(() => {
    return () => clearTimeout(highlightTimerRef.current)
  }, [])


  /* ---------------------- загрузка групп ---------------------- */
  const loadGroups = useCallback(async () => {
    setGroupsLoading(true)
    try {
      const { data } = await axios.get("/original-part-groups")
      setGroups(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error("Не удалось загрузить группы оригинальных деталей", e)
      message.error("Не удалось загрузить группы деталей")
    } finally {
      setGroupsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGroups()
  }, [loadGroups])

  const fetchMaterials = useCallback(async (q = "") => {
    setMaterialsLoading(true)
    try {
      const { data } = await axios.get("/materials", {
        params: { q, limit: 50 },
      })
      setMaterialOptions(
        (data || []).map((m) => ({
          value: m.id,
          label: m.name,
          standard: m.standard,
        }))
      )
    } catch (e) {
      console.error("Не удалось загрузить справочник материалов", e)
    } finally {
      setMaterialsLoading(false)
    }
  }, [])

  const fetchManufacturerModels = useCallback(async () => {
    if (!manufacturer?.id) {
      setManufacturerModels([])
      return
    }
    setManufacturerModelsLoading(true)
    try {
      const { data } = await axios.get("/equipment-models", {
        params: { manufacturer_id: manufacturer.id },
      })
      setManufacturerModels(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error("Не удалось загрузить модели производителя", e)
      message.error("Не удалось загрузить модели производителя")
      setManufacturerModels([])
    } finally {
      setManufacturerModelsLoading(false)
    }
  }, [manufacturer?.id])

  useEffect(() => {
    const params = new URLSearchParams(location.search || "")
    const manufacturerId = Number(params.get("manufacturer_id") || 0) || null
    const equipmentModelId = Number(params.get("equipment_model_id") || 0) || null
    const classifierNodeId = Number(params.get("classifier_node_id") || 0) || null

    if (!manufacturerId && !equipmentModelId && !classifierNodeId) return

    let cancelled = false
    ;(async () => {
      try {
        if (equipmentModelId) {
          const { data } = await axios.get(`/equipment-models/${equipmentModelId}`)
          if (cancelled || !data) return
          const nextManufacturer = data.manufacturer_id
            ? { id: data.manufacturer_id, name: data.manufacturer_name }
            : null
          setManufacturer(nextManufacturer)
          setModel({
            id: data.id,
            model_name: data.model_name,
            manufacturer_id: data.manufacturer_id,
          })
          if (classifierNodeId) {
            const { data: node } = await axios.get(`/equipment-classifier-nodes/${classifierNodeId}`)
            if (cancelled) return
            setCatalogContext({
              mode: "classifier",
              classifierNode: node || null,
            })
          }
          return
        }

        if (manufacturerId) {
          const { data } = await axios.get("/equipment-manufacturers")
          if (cancelled) return
          const row = (Array.isArray(data) ? data : []).find((item) => Number(item.id) === manufacturerId) || null
          if (row) setManufacturer({ id: row.id, name: row.name })
        }

        if (classifierNodeId) {
          const { data: node } = await axios.get(`/equipment-classifier-nodes/${classifierNodeId}`)
          if (cancelled) return
          setCatalogContext({
            mode: "classifier",
            classifierNode: node || null,
          })
        }
      } catch (e) {
        console.error("Не удалось восстановить контекст каталога из URL", e)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [location.search])

  /* ---------------------- загрузка деталей --------------------- */
  const fetchParts = useCallback(async () => {
    const modelId = model?.id

    // если ни модель не выбрана, ни режим "показать все" не включен —
    // просто очищаем таблицу
    if (!modelId && !showAll) {
      setRows([])
      return
    }

    try {
      partsAbortRef.current?.abort()
    } catch {
      // ignore abort errors
    }
    const controller = new AbortController()
    partsAbortRef.current = controller

    setLoading(true)
    try {
      const params = {}

      // в обычном режиме фильтруем по модели
      if (!showAll && modelId) {
        params.equipment_model_id = modelId
      }
      if (showAll && catalogContext?.mode === "classifier" && catalogContext?.classifierNode?.id) {
        params.classifier_node_id = catalogContext.classifierNode.id
      }

      if (search?.trim()) params.q = search.trim()
      if (viewMode === "assemblies" || viewMode === "roots") params.only_assemblies = 1
      if (viewMode === "parts" || viewMode === "orphans") params.only_parts = 1

      // можно передавать флажок для ясности (backend он не нужен, но не мешает)
      if (showAll) params.all = 1

      // advanced filters
      if (filters?.weight_min != null) params.weight_min = filters.weight_min
      if (filters?.weight_max != null) params.weight_max = filters.weight_max
      if (filters?.length_min != null) params.length_min = filters.length_min
      if (filters?.length_max != null) params.length_max = filters.length_max
      if (filters?.width_min != null) params.width_min = filters.width_min
      if (filters?.width_max != null) params.width_max = filters.width_max
      if (filters?.height_min != null) params.height_min = filters.height_min
      if (filters?.height_max != null) params.height_max = filters.height_max

      if (filters?.has_drawing) params.has_drawing = 1
      if (filters?.is_overweight) params.is_overweight = 1
      if (filters?.is_oversize) params.is_oversize = 1

      if (filters?.material_id) params.material_id = filters.material_id
      if (filters?.material_mode) params.material_mode = filters.material_mode

      if (filters?.bom_material_id) params.bom_material_id = filters.bom_material_id
      if (filters?.bom_material_mode) params.bom_material_mode = filters.bom_material_mode
      if (filters?.bom_material_depth) params.bom_material_depth = filters.bom_material_depth

      const { data } = await axios.get("/original-parts", {
        params,
        signal: controller.signal,
      })
      let next = Array.isArray(data) ? data : []
      if (viewMode === "orphans") {
        next = next.filter(
          (r) => Number(r.parent_count || 0) === 0 && Number(r.children_count || 0) === 0
        )
      }
      setRows(next)
    } catch (e) {
      if (
        e?.name === "AbortError" ||
        e?.name === "CanceledError" ||
        e?.code === "ERR_CANCELED"
      ) {
        return
      }
      console.error(e)
      message.error("Не удалось загрузить детали")
    } finally {
      setLoading(false)
    }
  }, [model?.id, search, showAll, viewMode, filters])

  const columnsViewKey = `${showAll ? "showAll" : "model"}:${viewMode}`
  const currentVisibleKeys = columnsByView?.[columnsViewKey] || null
  const currentOrderKeys = columnOrderByView?.[columnsViewKey] || null

  const ensureDefaultColumnsForView = useCallback(
    (viewKey, meta) => {
      if (!meta?.options?.length) return
      if (columnsByView && Object.prototype.hasOwnProperty.call(columnsByView, viewKey)) {
        if (viewKey.startsWith("showAll:")) {
          const nextKeys = ["manufacturer", "model", "client_names", "client_machine_refs"]
          const current = Array.isArray(columnsByView[viewKey]) ? columnsByView[viewKey] : []
          const allToggleKeys = meta.options.map((o) => o.key)
          const missing = nextKeys.filter((key) => allToggleKeys.includes(key) && !current.includes(key))
          if (missing.length) {
            setColumnsByView((prev) => ({
              ...(prev || {}),
              [viewKey]: [...current, ...missing],
            }))
          }
        }
        return
      }

      const allToggleKeys = meta.options.map((o) => o.key)
      const pick = (keys) => keys.filter((k) => allToggleKeys.includes(k))

      let recommended = null
      if (viewKey.endsWith(":parts")) {
        recommended = pick([
          "description_ru",
          "description_en",
          "group_name",
          "tnved_code",
          "weight_kg",
          "dims",
          "has_drawing",
          "is_overweight",
          "is_oversize",
        ])
      } else if (viewKey.endsWith(":assemblies")) {
        recommended = pick([
          "description_ru",
          "description_en",
          "group_name",
          "has_drawing",
          "is_assembly",
        ])
      } else if (viewKey.endsWith(":all")) {
        recommended = pick([
          "description_ru",
          "description_en",
          "group_name",
          "tnved_code",
          "weight_kg",
          "dims",
          "has_drawing",
          "is_assembly",
        ])
      } else if (viewKey.endsWith(":orphans")) {
        recommended = pick([
          "description_ru",
          "description_en",
          "group_name",
          "tnved_code",
          "weight_kg",
          "dims",
          "has_drawing",
        ])
      }

      // showAll: prefer manufacturer/model
      if (viewKey.startsWith("showAll:")) {
        const base = recommended || pick(["description_ru", "description_en", "group_name", "tnved_code", "weight_kg", "dims"])
        recommended = pick([
          "manufacturer",
          "model",
          "client_names",
          "client_machine_refs",
          ...base,
        ])
      }

      if (!recommended) return
      setColumnsByView((prev) => ({ ...(prev || {}), [viewKey]: recommended }))
    },
    [columnsByView]
  )

  useEffect(() => {
    if (!columnsHydratedRef.current) return
    if (viewMode === "roots") return
    ensureDefaultColumnsForView(columnsViewKey, columnsMeta)
  }, [columnsMeta, columnsViewKey, ensureDefaultColumnsForView, viewMode])

  // Load column prefs from backend once
  useEffect(() => {
    if (columnsLoadStartedRef.current) return
    columnsLoadStartedRef.current = true
    const run = async () => {
      try {
        const [columnsRes, orderRes] = await Promise.all([
          axios.get("/user-ui-settings", {
            params: { scope: "original_parts", key: "columns_v1" },
          }),
          axios.get("/user-ui-settings", {
            params: { scope: "original_parts", key: "column_order_v1" },
          }),
        ])

        const columnsValue = columnsRes?.data?.value_json
        const columnsCfg =
          columnsValue?.configs && typeof columnsValue.configs === "object"
            ? columnsValue.configs
            : columnsValue
        if (columnsCfg && typeof columnsCfg === "object") setColumnsByView(columnsCfg)

        const orderValue = orderRes?.data?.value_json
        const orderCfg =
          orderValue?.configs && typeof orderValue.configs === "object"
            ? orderValue.configs
            : orderValue
        if (orderCfg && typeof orderCfg === "object") setColumnOrderByView(orderCfg)
      } catch (e) {
        console.warn("Failed to load UI settings (columns)", e?.message || e)
      } finally {
        columnsHydratedRef.current = true
      }
    }
    run()
  }, [])

  // Save column prefs (debounced) to backend
  useEffect(() => {
    if (!columnsHydratedRef.current) return
    clearTimeout(columnsSaveTimerRef.current)
    columnsSaveTimerRef.current = setTimeout(async () => {
      try {
        await Promise.all([
          axios.put("/user-ui-settings", {
            scope: "original_parts",
            key: "columns_v1",
            value_json: { version: 1, configs: columnsByView },
          }),
          axios.put("/user-ui-settings", {
            scope: "original_parts",
            key: "column_order_v1",
            value_json: { version: 1, configs: columnOrderByView },
          }),
        ])
      } catch (e) {
        console.warn("Failed to save UI settings (columns)", e?.message || e)
      }
    }, 500)
    return () => clearTimeout(columnsSaveTimerRef.current)
  }, [columnsByView, columnOrderByView])

  useEffect(() => {
    const t = setTimeout(fetchParts, 300)
    return () => {
      clearTimeout(t)
      try {
        partsAbortRef.current?.abort()
      } catch {
        // ignore abort errors
      }
    }
  }, [fetchParts])

  /* ----------------------- создание детали -------------------- */
  const submitAddPart = async (values) => {
    if (!model?.id) {
      message.warning("Сначала выберите производителя и модель")
      return
    }
    try {
      const catNumberRaw = String(values.cat_number || "").trim()
      if (!catNumberRaw) {
        message.warning("Укажите каталожный номер")
        return
      }
      const selectedModelIdsRaw = Array.isArray(values.application_model_ids)
        ? values.application_model_ids
        : []
      const selectedModelIds = Array.from(
        new Set(
          selectedModelIdsRaw
            .map((v) => Number(v))
            .filter((v) => Number.isFinite(v) && v > 0)
        )
      )
      if (!selectedModelIds.length) {
        message.warning("Выберите хотя бы одну модель применения")
        return
      }

      let reuseSourceRow = null
      let targetModelIds = selectedModelIds

      // Reuse guard: if same part number already exists for this manufacturer
      // in another model, ask explicit confirmation before creating application.
      if (manufacturer?.id) {
        const { data: existingRows } = await axios.get("/original-parts", {
          params: {
            manufacturer_id: manufacturer.id,
            q: catNumberRaw,
          },
        })
        const sameNumberRows = (Array.isArray(existingRows) ? existingRows : []).filter(
          (r) => normalizePartNumber(r?.cat_number) === normalizePartNumber(catNumberRaw)
        )

        const sameModelRows = sameNumberRows.filter((r) =>
          selectedModelIds.includes(Number(r?.equipment_model_id))
        )
        const existingModelIdsSet = new Set(
          sameModelRows.map((r) => Number(r?.equipment_model_id)).filter(Boolean)
        )
        const missingModelIds = selectedModelIds.filter((id) => !existingModelIdsSet.has(id))
        targetModelIds = missingModelIds

        if (!targetModelIds.length) {
          message.error("Такой Part number уже есть во всех выбранных моделях")
          return
        }

        if (sameNumberRows.length > 0) {
          const modelNames = Array.from(
            new Set(
              sameNumberRows
                .map((r) => String(r?.model_name || "").trim())
                .filter(Boolean)
            )
          )
          const sample = sameNumberRows[0] || {}

          const enteredRu = String(values.description_ru || "").trim()
          const enteredEn = String(values.description_en || "").trim()
          const existingRu = String(sample.description_ru || "").trim()
          const existingEn = String(sample.description_en || "").trim()
          const hasDescriptionMismatch =
            (!!enteredRu && !!existingRu && enteredRu !== existingRu) ||
            (!!enteredEn && !!existingEn && enteredEn !== existingEn)

          const confirmed = await new Promise((resolve) => {
            Modal.confirm({
              title: `Номер ${catNumberRaw} уже существует`,
              content: (
                <Space direction="vertical" size={6}>
                  <div>
                    Деталь уже есть у производителя <b>{manufacturer.name}</b> в моделях:
                  </div>
                  <div>{modelNames.join(", ") || "—"}</div>
                  <div>
                    Добавить применение для выбранных моделей?
                  </div>
                  {sameModelRows.length ? (
                    <div>
                      Уже есть в выбранных моделях:{" "}
                      {Array.from(
                        new Set(
                          sameModelRows
                            .map((r) => String(r?.model_name || "").trim())
                            .filter(Boolean)
                        )
                      ).join(", ")}
                    </div>
                  ) : null}
                  {hasDescriptionMismatch ? (
                    <div style={{ color: "#b54708" }}>
                      Внимание: введенное описание отличается от существующего.
                      Будет использовано существующее описание.
                    </div>
                  ) : null}
                </Space>
              ),
              okText: "Переиспользовать",
              cancelText: "Отмена",
              onOk: () => resolve(true),
              onCancel: () => resolve(false),
            })
          })

          if (!confirmed) return
          reuseSourceRow = sample
        }
      }

      const isReuse = !!reuseSourceRow
      const defaultMaterialId =
        isReuse || !values.default_material_id ? null : Number(values.default_material_id)
      const buildPayload = (targetModelId) => {
        const techDescription = String(values.tech_description ?? "").trim()
        return {
          equipment_model_id: targetModelId,
          cat_number: catNumberRaw,
          description_ru: isReuse
            ? reuseSourceRow.description_ru || null
            : values.description_ru || null,
          description_en: isReuse
            ? reuseSourceRow.description_en || null
            : values.description_en || null,
          tech_description:
            isReuse
              ? reuseSourceRow.tech_description || null
              : techDescription || null,
          // If a default material is selected, treat logistics values as a per-material spec.
          // Base columns are left empty to avoid conflicting sources of truth.
          weight_kg: isReuse
            ? reuseSourceRow.weight_kg ?? null
            : defaultMaterialId
            ? null
            : values.weight_kg ?? null,
          uom: isReuse ? reuseSourceRow.uom || "шт" : values.uom || "шт",
          tnved_code_id: isReuse ? reuseSourceRow.tnved_code_id ?? null : values.tnved?.id ?? null,
          group_id: isReuse ? reuseSourceRow.group_id ?? null : values.group_id ?? null,
          length_cm: isReuse
            ? reuseSourceRow.length_cm ?? null
            : defaultMaterialId
            ? null
            : values.length_cm ?? null,
          width_cm: isReuse
            ? reuseSourceRow.width_cm ?? null
            : defaultMaterialId
            ? null
            : values.width_cm ?? null,
          height_cm: isReuse
            ? reuseSourceRow.height_cm ?? null
            : defaultMaterialId
            ? null
            : values.height_cm ?? null,
          is_overweight: isReuse
            ? reuseSourceRow.is_overweight ? 1 : 0
            : values.is_overweight
            ? 1
            : 0,
          is_oversize: isReuse
            ? reuseSourceRow.is_oversize ? 1 : 0
            : values.is_oversize
            ? 1
            : 0,
          has_drawing: isReuse
            ? reuseSourceRow.has_drawing ? 1 : 0
            : values.has_drawing
            ? 1
            : 0,
        }
      }

      let firstCreated = null
      for (const targetModelId of targetModelIds) {
        const { data } = await axios.post("/original-parts", buildPayload(targetModelId))
        if (!firstCreated) firstCreated = data
      }
      const createdPart = firstCreated

      // Optional: set default material right after creating the part (and save spec values to that material).
      if (defaultMaterialId && createdPart?.id) {
        try {
          await axios.post("/original-part-materials", {
            original_part_id: createdPart.id,
            material_id: defaultMaterialId,
            is_default: 1,
            note: values.default_material_note?.trim()
              ? values.default_material_note.trim()
              : null,
          })

          const anySpec =
            values.weight_kg != null ||
            values.length_cm != null ||
            values.width_cm != null ||
            values.height_cm != null

          if (anySpec) {
            await axios.put("/original-part-material-specs", {
              original_part_id: createdPart.id,
              material_id: defaultMaterialId,
              weight_kg: values.weight_kg ?? null,
              length_cm: values.length_cm ?? null,
              width_cm: values.width_cm ?? null,
              height_cm: values.height_cm ?? null,
            })
          }
        } catch (e) {
          console.warn("Failed to add default material during create", e?.message || e)
          message.warning(
            "Деталь создана, но материал не добавился (можно добавить в карточке → Материалы)."
          )
        }
      }

      message.success(
        `Деталь ${createdPart?.cat_number || catNumberRaw} сохранена, моделей применения: ${
          targetModelIds.length
        }`
      )
      flashRow(createdPart?.id)
      setTreeFocusId(createdPart?.id || null)
      // Потоковый ввод: очищаем только основные поля,
      // оставляя группу/ед.изм. как "следующее по умолчанию".
      addForm.setFieldsValue({
        cat_number: "",
        description_ru: "",
        description_en: "",
        tech_description: "",
        tnved: null,
        default_material_id: null,
        default_material_note: "",
        weight_kg: null,
        length_cm: null,
        width_cm: null,
        height_cm: null,
        has_drawing: false,
        is_overweight: false,
        is_oversize: false,
      })
      fetchParts()
      return true
    } catch (e) {
      if (e?.response?.status === 409)
        message.error("Дубликат Part number для этой модели")
      else if (e?.response?.data?.message) message.error(e.response.data.message)
      else {
        console.error(e)
        message.error("Не удалось создать деталь")
      }
      return false
    }
  }

  const openPartDetail = useCallback(
    (recordOrId) => {
      const partId =
        typeof recordOrId === "object" && recordOrId !== null
          ? Number(recordOrId.id)
          : Number(recordOrId)
      if (!Number.isFinite(partId) || partId <= 0) return
      const currentModelId =
        typeof recordOrId === "object" && recordOrId !== null
          ? Number(recordOrId.equipment_model_id || model?.id || 0) || null
          : Number(model?.id || 0) || null

      const suffix = currentModelId ? `?equipment_model_id=${encodeURIComponent(currentModelId)}` : ""
      navigate(`/original-parts/${partId}${suffix}`, {
        state: {
          from: `${location.pathname}${location.search || ""}`,
          currentModelId,
          listState: {
            manufacturer,
            model,
            catalogContext,
            search,
            showAll,
            viewMode,
            filters,
            columnsByView,
            columnOrderByView,
          },
        },
      })
    },
    [
      navigate,
      location.pathname,
      location.search,
      manufacturer,
      model,
      catalogContext,
      search,
      showAll,
      viewMode,
      filters,
      columnsByView,
      columnOrderByView,
    ]
  )

  const openEditDrawer = (record) => {
    if (!record?.id) return
    const tnvedObj = record.tnved_code_id
      ? {
          id: record.tnved_code_id,
          code: record.tnved_code_text || record.tnved_code || "",
          description: record.tnved_description || "",
        }
      : null
    setEditingRow(record)
    setEditApplicationModelsLoading(true)
    setEditApplicationModels([])
    editForm.setFieldsValue({
      cat_number: record.cat_number || "",
      description_ru: record.description_ru || "",
      description_en: record.description_en || "",
      tech_description: record.tech_description || "",
      uom: record.uom ? String(record.uom).toLowerCase() : "шт",
      group_id:
        record.group_id === undefined || record.group_id === null
          ? null
          : Number(record.group_id),
      tnved: tnvedObj,
      weight_kg:
        record.weight_kg === undefined || record.weight_kg === null
          ? null
          : Number(record.weight_kg),
      length_cm:
        record.length_cm === undefined || record.length_cm === null
          ? null
          : Number(record.length_cm),
      width_cm:
        record.width_cm === undefined || record.width_cm === null
          ? null
          : Number(record.width_cm),
      height_cm:
        record.height_cm === undefined || record.height_cm === null
          ? null
          : Number(record.height_cm),
      has_drawing: !!record.has_drawing,
      is_overweight: !!record.is_overweight,
      is_oversize: !!record.is_oversize,
    })
    setEditOpen(true)
    ;(async () => {
      try {
        const { data } = await axios.get(`/original-parts/${record.id}/full`)
        const apps = Array.isArray(data?.application_models) ? data.application_models : []
        if (apps.length > 0) {
          setEditApplicationModels(apps)
        } else {
          setEditApplicationModels([
            {
              equipment_model_id: data?.equipment_model_id ?? record?.equipment_model_id ?? null,
              model_name: data?.model_name || record?.model_name || "—",
            },
          ])
        }
      } catch {
        setEditApplicationModels([
          {
            equipment_model_id: record?.equipment_model_id ?? null,
            model_name: record?.model_name || "—",
          },
        ])
      } finally {
        setEditApplicationModelsLoading(false)
      }
    })()
  }

  const submitEditPart = async (values) => {
    if (!editingRow?.id) return
    const toNum = (v) =>
      v === null || v === "" || Number.isNaN(Number(v)) ? null : Number(v)

    const payload = {
      cat_number: String(values.cat_number || "").trim() || null,
      description_ru: values.description_ru?.trim() ? values.description_ru.trim() : null,
      description_en: values.description_en?.trim() ? values.description_en.trim() : null,
      tech_description: values.tech_description?.trim() ? values.tech_description.trim() : null,
      uom: values.uom || "шт",
      group_id:
        values.group_id === undefined || values.group_id === null || values.group_id === ""
          ? null
          : Number(values.group_id),
      tnved_code_id: values.tnved?.id ?? null,
      equipment_model_id:
        editingRow.equipment_model_id === undefined || editingRow.equipment_model_id === null
          ? undefined
          : Number(editingRow.equipment_model_id),
      weight_kg: toNum(values.weight_kg),
      length_cm: toNum(values.length_cm),
      width_cm: toNum(values.width_cm),
      height_cm: toNum(values.height_cm),
      has_drawing: values.has_drawing ? 1 : 0,
      is_overweight: values.is_overweight ? 1 : 0,
      is_oversize: values.is_oversize ? 1 : 0,
    }

    if (!payload.cat_number) {
      message.warning("Укажите каталожный номер")
      return
    }

    setSavingEdit(true)
    try {
      await axios.put(`/original-parts/${editingRow.id}`, payload)
      message.success("Изменения сохранены")
      flashRow(editingRow.id)
      setEditOpen(false)
      setEditingRow(null)
      fetchParts()
    } catch (e) {
      if (e?.response?.data?.message) message.error(e.response.data.message)
      else {
        console.error(e)
        message.error("Не удалось сохранить изменения")
      }
    } finally {
      setSavingEdit(false)
    }
  }

  const clearSelection = () => {
    setManufacturer(null)
    setModel(null)
    setCatalogContext(null)
    setRows([])
    setShowAll(true)
    setViewMode("all")
    setFilters({})
    // columnsByView are per-user prefs: do not clear on selection reset
  }

  useEffect(() => {
    // no-op for list-only view
  }, [model?.id])

  useEffect(() => {
    if (!createOpen) return
    const t = setTimeout(() => createCatInputRef.current?.focus?.(), 80)
    return () => clearTimeout(t)
  }, [createOpen])

  useEffect(() => {
    if (!createOpen) return
    fetchMaterials("")
  }, [createOpen, fetchMaterials])

  useEffect(() => {
    if (!createOpen || !manufacturer?.id) {
      setReusePreview({ loading: false, existsInCurrentModel: false, modelNames: [] })
      return
    }
    const cat = String(createCatNumber || "").trim()
    if (!cat) {
      setReusePreview({ loading: false, existsInCurrentModel: false, modelNames: [] })
      return
    }

    let ignore = false
    const run = async () => {
      setReusePreview((prev) => ({ ...prev, loading: true }))
      try {
        const { data } = await axios.get("/original-parts", {
          params: {
            manufacturer_id: manufacturer.id,
            q: cat,
          },
        })
        if (ignore) return
        const sameNumberRows = (Array.isArray(data) ? data : []).filter(
          (r) => normalizePartNumber(r?.cat_number) === normalizePartNumber(cat)
        )
        const existsInCurrentModel = sameNumberRows.some(
          (r) => Number(r?.equipment_model_id) === Number(model?.id || 0)
        )
        const modelNames = Array.from(
          new Set(
            sameNumberRows
              .map((r) => String(r?.model_name || "").trim())
              .filter(Boolean)
          )
        )
        setReusePreview({
          loading: false,
          existsInCurrentModel,
          modelNames,
        })
      } catch {
        if (!ignore) {
          setReusePreview({ loading: false, existsInCurrentModel: false, modelNames: [] })
        }
      }
    }

    const t = setTimeout(run, 250)
    return () => {
      ignore = true
      clearTimeout(t)
    }
  }, [createOpen, createCatNumber, manufacturer?.id, model?.id])

  useEffect(() => {
    if (!createOpen) return
    fetchManufacturerModels()
  }, [createOpen, fetchManufacturerModels])

  useEffect(() => {
    if (!createOpen) return
    const currentId = Number(model?.id || 0)
    if (!currentId) return
    const existing = addForm.getFieldValue("application_model_ids")
    if (Array.isArray(existing) && existing.length) {
      if (!existing.includes(currentId)) {
        addForm.setFieldValue("application_model_ids", [...existing, currentId])
      }
      return
    }
    addForm.setFieldValue("application_model_ids", [currentId])
  }, [createOpen, model?.id, addForm])

  // В режиме showAll "корневые узлы" / "вне структуры" неоднозначны — падаем в "Все".
  useEffect(() => {
    if (showAll && (viewMode === "roots" || viewMode === "orphans")) {
      setViewMode("all")
    }
  }, [showAll, viewMode])

  /* -------------------------- рендер --------------------------- */
  return (
    <Space
      direction="vertical"
      style={{ width: "100%", minHeight: "calc(100vh - 180px)" }}
      size={16}
    >
      <Card bodyStyle={{ paddingTop: 8 }} style={{ width: "100%", minHeight: 400 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} lg={16}>
            <Space wrap>
              <Button
                icon={<ApartmentOutlined />}
                onClick={() => setPickerOpen(true)}
              >
                {manufacturer && model
                  ? "Изменить фильтр производителя/модели"
                  : "Выбрать производителя и модель"}
              </Button>

              {showAll ? (
                <>
                  <Tag color="green">Режим: весь OEM каталог</Tag>
                  {manufacturer || model ? (
                    <Tag>
                      Контекст: {[manufacturer?.name, model?.model_name].filter(Boolean).join(" / ")}
                    </Tag>
                  ) : null}
                  {catalogContext?.mode === "client" && catalogContext?.equipmentUnit ? (
                    <Tag color="purple">
                      Контекст машины:{" "}
                      {[
                        catalogContext.client?.company_name || "—",
                        catalogContext.equipmentUnit.serial_number || "без серийника",
                      ].join(" / ")}
                    </Tag>
                  ) : null}
                  {catalogContext?.mode === "classifier" && catalogContext?.classifierNode ? (
                    <Tag color="cyan">
                      Контекст типа: {catalogContext.classifierNode.name}
                    </Tag>
                  ) : null}
                </>
              ) : (
                <>
                  {manufacturer ? (
                    <Tag color="geekblue">
                      Производитель: {manufacturer.name}
                    </Tag>
                  ) : null}
                  {model ? <Tag color="blue">Модель: {model.model_name}</Tag> : null}
                  {catalogContext?.mode === "client" && catalogContext?.equipmentUnit ? (
                    <>
                      <Tag color="purple">Клиент: {catalogContext.client?.company_name || "—"}</Tag>
                      <Tag color="magenta">
                        Машина: {catalogContext.equipmentUnit.serial_number || "без серийника"}
                      </Tag>
                      {catalogContext.equipmentUnit.manufacture_year ? (
                        <Tag>Год: {catalogContext.equipmentUnit.manufacture_year}</Tag>
                      ) : null}
                    </>
                  ) : null}
                  {catalogContext?.mode === "classifier" && catalogContext?.classifierNode ? (
                    <Tag color="cyan">Классификатор: {catalogContext.classifierNode.name}</Tag>
                  ) : null}
                </>
              )}

              {(manufacturer || model || showAll) && (
                <Button
                  size="small"
                  onClick={clearSelection}
                  icon={<ReloadOutlined />}
                >
                  Сбросить
                </Button>
              )}
            </Space>
          </Col>

          <Col
            xs={24}
            lg={8}
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
          <Checkbox
            checked={showAll}
            onChange={(e) => {
              setShowAll(e.target.checked)
              if (e.target.checked && viewMode === "roots") setViewMode("all")
              if (e.target.checked && viewMode === "orphans") setViewMode("all")
            }}
          >
            Показывать весь OEM каталог
          </Checkbox>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                if (!model?.id) {
                  message.warning("Сначала выберите производителя и модель")
                  return
                }
                if (!addForm.getFieldValue("uom")) {
                  addForm.setFieldsValue({ uom: "шт" })
                }
                setCreateOpen(true)
              }}
              disabled={!model}
            >
              Создать позицию
            </Button>

            <Button
              onClick={() => {
                if (!model?.id) {
                  message.warning("Выберите модель для импорта OEM-каталога")
                  return
                }
                setImportOpen(true)
              }}
              disabled={!model}
            >
              Импорт
            </Button>
          </Col>

        </Row>

        {/* Поиск (фильтры по группе / ТН ВЭД переехали в колонки таблицы) */}
        <div className="table-section">
          <TableToolbar
            search={search}
            onSearch={(val) => {
              setSearch(val)
            }}
            placeholder={
              showAll
                ? "Поиск по номеру/RU/EN/ТН ВЭД… (по всем моделям)"
                : "Поиск по номеру/RU/EN/ТН ВЭД…"
            }
            searchWidth="clamp(280px, 42vw, 620px)"
            searchEnterButton="Найти"
            disabled={!model && !showAll}
            extraActions={
              <Space size={12} wrap style={{ justifyContent: "flex-end" }}>
                <div style={{ maxWidth: "100%", overflowX: "auto" }}>
                  <Segmented
                    size="small"
                    value={viewMode}
                    onChange={(val) => setViewMode(String(val))}
                    options={[
                      { label: "Узлы (дерево)", value: "roots", disabled: showAll || !model },
                      { label: "Сборки", value: "assemblies" },
                      { label: "Детали", value: "parts" },
                      { label: "Все", value: "all" },
                      { label: "Вне структуры", value: "orphans", disabled: showAll || !model },
                    ]}
                    disabled={!model && !showAll}
                  />
                </div>

                <Tooltip title="Фильтры">
                  <Badge count={countActiveFilters(filters)} size="small" offset={[-2, 6]}>
                    <Button
                      icon={<FilterOutlined />}
                      onClick={() => setFiltersOpen(true)}
                      disabled={!model && !showAll}
                    >
                      Фильтры
                    </Button>
                  </Badge>
                </Tooltip>

                <Popover
                  open={columnsPopoverOpen}
                  onOpenChange={setColumnsPopoverOpen}
                  trigger="click"
                  placement="bottomRight"
                  content={
                    <div style={{ width: 260 }}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>
                        Колонки ({showAll ? "все модели" : "модель"} • {viewMode})
                      </div>
                      {viewMode === "roots" ? (
                        <div style={{ color: "#6b7280" }}>
                          Для дерева колонок нет (позже сделаем настройки бейджей).
                        </div>
                      ) : (
                        <Space direction="vertical" size={6} style={{ width: "100%" }}>
                          {(columnsMeta.options || []).map((opt) => {
                            const base =
                              Array.isArray(currentVisibleKeys) && currentVisibleKeys.length
                                ? currentVisibleKeys
                                : columnsMeta.defaultVisible
                            const checked = base?.includes?.(opt.key)
                            return (
                              <Checkbox
                                key={opt.key}
                                checked={!!checked}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...(base || []), opt.key]
                                    : (base || []).filter((k) => k !== opt.key)
                                  setColumnsByView((prev) => ({
                                    ...(prev || {}),
                                    [columnsViewKey]: next,
                                  }))
                                }}
                              >
                                {opt.label}
                              </Checkbox>
                            )
                          })}
                          <Space style={{ marginTop: 8 }}>
                            <Button
                              size="small"
                              onClick={() => {
                                setColumnsByView((prev) => ({
                                  ...(prev || {}),
                                  [columnsViewKey]: columnsMeta.defaultVisible || [],
                                }))
                              }}
                            >
                              Сбросить
                            </Button>
                            <Button size="small" onClick={() => setColumnsPopoverOpen(false)}>
                              Готово
                            </Button>
                          </Space>
                        </Space>
                      )}
                    </div>
                  }
                >
                  <Button disabled={viewMode === "roots" || (!model && !showAll)}>
                    Колонки
                  </Button>
                </Popover>
              </Space>
            }
          />
        </div>

        <div
          ref={contentAnimRef}
          className="parts-table-wrap"
          style={{ minHeight: 240 }}
        >
          {model || showAll ? (
            viewMode === "roots" && !showAll ? (
              <OriginalPartsRootsTree
                manufacturer={manufacturer}
                model={model}
                loading={loading}
                rows={rows}
                focusId={treeFocusId}
                onOpenDetail={(partId) => {
                  const nextPartId = Number(partId)
                  if (!Number.isFinite(nextPartId) || nextPartId <= 0) return
                  navigate(`/original-parts/${nextPartId}`, {
                    state: {
                      from: `${location.pathname}${location.search || ""}`,
                      currentModelId: model?.id || null,
                      listState: {
                        manufacturer,
                        model,
                        catalogContext,
                        search,
                        showAll,
                        viewMode,
                        filters,
                        columnsByView,
                        columnOrderByView,
                        treeFocusId: partId,
                      },
                    },
                  })
                }}
              />
            ) : (
              <OriginalPartsTable
                data={rows}
                loading={loading}
                modelId={model?.id || null}
                showAll={showAll}
                highlightRowId={highlightRowId}
                onFlashRow={flashRow}
                visibleColumnKeys={currentVisibleKeys}
                columnOrderKeys={currentOrderKeys}
                onVisibleColumnKeysChange={(next) => {
                  setColumnsByView((prev) => ({
                    ...(prev || {}),
                    [columnsViewKey]: Array.isArray(next) ? next : [],
                  }))
                }}
                onColumnOrderKeysChange={(next) => {
                  setColumnOrderByView((prev) => ({
                    ...(prev || {}),
                    [columnsViewKey]: Array.isArray(next) ? next : [],
                  }))
                }}
                onColumnsMeta={(meta) => setColumnsMeta(meta || { options: [], defaultVisible: [], lockedKeys: [] })}
                onReload={fetchParts}
                onEditRecord={openEditDrawer}
                onOpenDetail={(record) => {
                  if (!record?.id) return
                  openPartDetail(record)
                }}
                onRemove={(id) => {
                  setRows((prev) => prev.filter((r) => r.id !== id))
                }}
              />
            )
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Каталог пуст для текущего фильтра"
              style={{ padding: "48px 0" }}
            />
          )}
        </div>
      </Card>

      <ImportModal
        open={importOpen}
        type="original_parts"
        extraParams={{ equipment_model_id: model?.id }}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          setImportOpen(false)
          fetchParts()
          message.success("Импорт выполнен")
        }}
      />

      <Drawer
        open={createOpen}
        onClose={() => {
          createSubmitModeRef.current = "create_close"
          setCreateOpen(false)
        }}
        width={560}
        destroyOnHidden={false}
        title="Создать позицию"
        extra={
          <Space>
            <Button onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button
              type="primary"
              onClick={() => {
                createSubmitModeRef.current = "create_close"
                addForm.submit()
              }}
              disabled={!model}
              loading={reusePreview.loading}
            >
              Создать
            </Button>
            <Button
              onClick={() => {
                createSubmitModeRef.current = "create_more"
                addForm.submit()
              }}
              disabled={!model}
            >
              Создать еще
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: "100%" }} size={10}>
          <Text type="secondary">
            Производитель: <b>{manufacturer?.name || "—"}</b> · Модель: <b>{model?.model_name || "—"}</b>
          </Text>
          <Form
            form={addForm}
            layout="vertical"
            onFinish={async (values) => {
              const ok = await submitAddPart(values)
              if (!ok) {
                createSubmitModeRef.current = "create_close"
                return
              }
              if (createSubmitModeRef.current === "create_more") {
                createSubmitModeRef.current = "create_close"
                setTimeout(() => createCatInputRef.current?.focus?.(), 50)
                return
              }
              setCreateOpen(false)
              createSubmitModeRef.current = "create_close"
            }}
            disabled={!model}
            initialValues={{ uom: "шт", application_model_ids: model?.id ? [model.id] : [] }}
          >
            <Card size="small" bodyStyle={{ padding: 12 }} style={{ marginBottom: 12 }}>
              <Space direction="vertical" style={{ width: "100%" }} size={8}>
                <Text strong>Модели применения</Text>
                <Form.Item
                  name="application_model_ids"
                  style={{ marginBottom: 0 }}
                  rules={[
                    {
                      validator: (_, value) =>
                        Array.isArray(value) && value.length > 0
                          ? Promise.resolve()
                          : Promise.reject(new Error("Выберите хотя бы одну модель")),
                    },
                  ]}
                >
                  <Checkbox.Group style={{ width: "100%" }}>
                    <Space direction="vertical" size={6} style={{ width: "100%" }}>
                      {manufacturerModels.map((m) => (
                        <Checkbox key={m.id} value={m.id}>
                          {m.model_name || `Модель #${m.id}`}
                          {Number(m.id) === Number(model?.id || 0) ? " (текущая)" : ""}
                        </Checkbox>
                      ))}
                    </Space>
                  </Checkbox.Group>
                </Form.Item>
                {!manufacturerModelsLoading && !manufacturerModels.length ? (
                  <Text type="secondary">
                    У выбранного производителя пока нет моделей. Создайте модель в НСИ/Справочнике и вернитесь в OEM-каталог.
                  </Text>
                ) : null}
              </Space>
            </Card>
            <Form.Item
              name="cat_number"
              label="Кат. номер"
              rules={[{ required: true, message: "Укажите каталожный номер" }]}
            >
              <Input
                ref={createCatInputRef}
                placeholder="например, 711-22-12340"
                allowClear
              />
            </Form.Item>
            {String(createCatNumber || "").trim() ? (
              reusePreview.existsInCurrentModel ? (
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message="Такой номер уже есть в текущей модели"
                  description="Создание будет отклонено. Выберите другой номер или откройте существующую позицию."
                />
              ) : reusePreview.modelNames.length ? (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message="Найдено совпадение по каталожному номеру"
                  description={`Уже используется в моделях: ${reusePreview.modelNames.join(", ")}. При создании будет предложено переиспользование.`}
                />
              ) : null
            ) : null}
            <Form.Item name="description_ru" label="Описание (RU)">
              <Input placeholder="Описание (RU)" allowClear />
            </Form.Item>
            <Form.Item name="description_en" label="Description (EN)">
              <Input placeholder="Description (EN)" allowClear />
            </Form.Item>
            <Form.Item name="tech_description" label="Тех. описание">
              <Input.TextArea
                placeholder="Коротко о детали: назначение, особенности, требования..."
                autoSize={{ minRows: 3, maxRows: 8 }}
              />
            </Form.Item>

            <Space style={{ width: "100%" }} size={12} align="start" wrap>
              <Form.Item name="uom" label="Ед. изм." style={{ minWidth: 140 }}>
                <Select style={{ width: 140 }} options={uomOptions} loading={uomLoading} />
              </Form.Item>
              <Form.Item label="Группа" style={{ minWidth: 280, flex: 1 }}>
                <Space.Compact style={{ width: "100%" }}>
                  <Form.Item name="group_id" noStyle>
                    <Select
                      style={{ width: "100%" }}
                      placeholder="Не выбрано"
                      loading={groupsLoading}
                      allowClear
                      options={groups.map((g) => ({
                        value: g.id,
                        label: g.name,
                      }))}
                    />
                  </Form.Item>
                  <Button
                    icon={<SettingOutlined />}
                    onClick={() => setGroupManagerOpen(true)}
                    title="Управление группами"
                  >
                    Группы
                  </Button>
                </Space.Compact>
              </Form.Item>
            </Space>

            <Divider style={{ margin: "8px 0 12px" }} />
            <Text strong>Классификация</Text>
            <Form.Item name="tnved" label="ТН ВЭД" style={{ marginTop: 8 }}>
              <TnvedPicker allowClear style={{ width: "100%" }} />
            </Form.Item>

            <Divider style={{ margin: "6px 0 12px" }} />
            <Text strong>Материал по умолчанию</Text>
            <Text type="secondary" style={{ display: "block", marginTop: 4 }}>
              Если выбрать материал, вес и габариты ниже сохранятся как его спецификация.
            </Text>
            <Form.Item name="default_material_id" label="Материал" style={{ marginTop: 8 }}>
              <Select
                showSearch
                allowClear
                placeholder="Поиск по названию/коду/стандарту"
                filterOption={false}
                loading={materialsLoading}
                onSearch={(q) => fetchMaterials(q)}
                onFocus={() => fetchMaterials("")}
                options={materialOptions.map((o) => ({
                  value: o.value,
                  label: `${o.label}${o.standard ? " · " + o.standard : ""}`,
                }))}
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    <Divider style={{ margin: "8px 0" }} />
                    <div style={{ padding: "0 8px 8px", color: "#6b7280" }}>
                      Нет нужного материала? Добавьте его в каталоге «Материалы».
                    </div>
                  </>
                )}
              />
            </Form.Item>
            <Form.Item name="default_material_note" label="Комментарий к материалу">
              <Input placeholder="например: вариант/примечание" allowClear />
            </Form.Item>

            <Divider style={{ margin: "6px 0 12px" }} />
            <Text strong>Логистика</Text>
            <Form.Item name="weight_kg" label="Вес, кг" style={{ marginTop: 8 }}>
              <InputNumber style={{ width: "100%" }} min={0} step={0.01} {...compactInputNumberProps} />
            </Form.Item>
            <Space style={{ width: "100%" }} size={10}>
              <Form.Item name="length_cm" label="Длина, см" style={{ flex: 1 }}>
                <InputNumber style={{ width: "100%" }} min={0} step={0.1} {...compactInputNumberProps} />
              </Form.Item>
              <Form.Item name="width_cm" label="Ширина, см" style={{ flex: 1 }}>
                <InputNumber style={{ width: "100%" }} min={0} step={0.1} {...compactInputNumberProps} />
              </Form.Item>
              <Form.Item name="height_cm" label="Высота, см" style={{ flex: 1 }}>
                <InputNumber style={{ width: "100%" }} min={0} step={0.1} {...compactInputNumberProps} />
              </Form.Item>
            </Space>

            <Divider style={{ margin: "6px 0 12px" }} />
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Признаки</div>
            <div
              style={{
                border: "1px solid #f0f0f0",
                borderRadius: 8,
                padding: "10px 12px",
                background: "#fafafa",
              }}
            >
              <Space size={20} wrap>
                <Form.Item
                  name="has_drawing"
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <Checkbox>Есть КД</Checkbox>
                </Form.Item>
                <Form.Item
                  name="is_overweight"
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <Checkbox>Тяжелая</Checkbox>
                </Form.Item>
                <Form.Item
                  name="is_oversize"
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <Checkbox>Негабарит</Checkbox>
                </Form.Item>
              </Space>
            </div>
          </Form>
        </Space>
      </Drawer>

      <Drawer
        open={editOpen}
        onClose={() => {
          if (savingEdit) return
          setEditOpen(false)
          setEditingRow(null)
        }}
        width={560}
        destroyOnHidden={false}
        title="Редактировать позицию"
        extra={
          <Space>
            <Button onClick={() => setEditOpen(false)} disabled={savingEdit}>
              Отмена
            </Button>
            <Button
              type="primary"
              loading={savingEdit}
              onClick={() => editForm.submit()}
            >
              Сохранить
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: "100%" }} size={10}>
          <Text type="secondary">
            Производитель: <b>{editingRow?.manufacturer_name || manufacturer?.name || "—"}</b> ·
            Модель: <b>{editingRow?.model_name || model?.model_name || "—"}</b>
          </Text>
          <Card size="small" bodyStyle={{ padding: 12 }}>
            <Space direction="vertical" style={{ width: "100%" }} size={8}>
              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Text strong>Модели применения</Text>
                <Button
                  size="small"
                  onClick={() => {
                    if (!editingRow?.id) return
                    setEditOpen(false)
                    openPartDetail(editingRow)
                  }}
                >
                  Открыть карточку
                </Button>
              </Space>
              {editApplicationModelsLoading ? (
                <Text type="secondary">Загрузка...</Text>
              ) : (
                <Space wrap>
                  {(editApplicationModels.length
                    ? editApplicationModels
                    : [
                        {
                          equipment_model_id: editingRow?.equipment_model_id ?? null,
                          model_name: editingRow?.model_name || "—",
                        },
                      ]
                  ).map((m) => (
                    <Tag
                      key={`${m.equipment_model_id || "x"}:${m.model_name || ""}`}
                      color="blue"
                    >
                      {m.model_name || "—"}
                    </Tag>
                  ))}
                </Space>
              )}
            </Space>
          </Card>
          <Form
            form={editForm}
            layout="vertical"
            onFinish={submitEditPart}
            initialValues={{ uom: "шт" }}
          >
            <Form.Item
              name="cat_number"
              label="Кат. номер"
              rules={[{ required: true, message: "Укажите каталожный номер" }]}
            >
              <Input placeholder="например, 711-22-12340" allowClear />
            </Form.Item>
            <Form.Item name="description_ru" label="Описание (RU)">
              <Input placeholder="Описание (RU)" allowClear />
            </Form.Item>
            <Form.Item name="description_en" label="Description (EN)">
              <Input placeholder="Description (EN)" allowClear />
            </Form.Item>
            <Form.Item name="tech_description" label="Тех. описание">
              <Input.TextArea
                placeholder="Коротко о детали: назначение, особенности, требования..."
                autoSize={{ minRows: 3, maxRows: 8 }}
              />
            </Form.Item>

            <Space style={{ width: "100%" }} size={12} align="start" wrap>
              <Form.Item name="uom" label="Ед. изм." style={{ minWidth: 140 }}>
                <Select style={{ width: 140 }} options={uomOptions} loading={uomLoading} />
              </Form.Item>
              <Form.Item label="Группа" style={{ minWidth: 280, flex: 1 }}>
                <Space.Compact style={{ width: "100%" }}>
                  <Form.Item name="group_id" noStyle>
                    <Select
                      style={{ width: "100%" }}
                      placeholder="Не выбрано"
                      loading={groupsLoading}
                      allowClear
                      options={groups.map((g) => ({
                        value: g.id,
                        label: g.name,
                      }))}
                    />
                  </Form.Item>
                  <Button
                    icon={<SettingOutlined />}
                    onClick={() => setGroupManagerOpen(true)}
                    title="Управление группами"
                  >
                    Группы
                  </Button>
                </Space.Compact>
              </Form.Item>
            </Space>

            <Divider style={{ margin: "8px 0 12px" }} />
            <Text strong>Классификация</Text>
            <Form.Item name="tnved" label="ТН ВЭД" style={{ marginTop: 8 }}>
              <TnvedPicker allowClear style={{ width: "100%" }} />
            </Form.Item>

            <Divider style={{ margin: "6px 0 12px" }} />
            <Text strong>Логистика</Text>
            <Form.Item name="weight_kg" label="Вес, кг" style={{ marginTop: 8 }}>
              <InputNumber style={{ width: "100%" }} min={0} step={0.01} {...compactInputNumberProps} />
            </Form.Item>
            <Space style={{ width: "100%" }} size={10}>
              <Form.Item name="length_cm" label="Длина, см" style={{ flex: 1 }}>
                <InputNumber style={{ width: "100%" }} min={0} step={0.1} {...compactInputNumberProps} />
              </Form.Item>
              <Form.Item name="width_cm" label="Ширина, см" style={{ flex: 1 }}>
                <InputNumber style={{ width: "100%" }} min={0} step={0.1} {...compactInputNumberProps} />
              </Form.Item>
              <Form.Item name="height_cm" label="Высота, см" style={{ flex: 1 }}>
                <InputNumber style={{ width: "100%" }} min={0} step={0.1} {...compactInputNumberProps} />
              </Form.Item>
            </Space>

            <Divider style={{ margin: "6px 0 12px" }} />
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Признаки</div>
            <div
              style={{
                border: "1px solid #f0f0f0",
                borderRadius: 8,
                padding: "10px 12px",
                background: "#fafafa",
              }}
            >
              <Space size={20} wrap>
                <Form.Item
                  name="has_drawing"
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <Checkbox>Есть КД</Checkbox>
                </Form.Item>
                <Form.Item
                  name="is_overweight"
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <Checkbox>Тяжелая</Checkbox>
                </Form.Item>
                <Form.Item
                  name="is_oversize"
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <Checkbox>Негабарит</Checkbox>
                </Form.Item>
              </Space>
            </div>
          </Form>
        </Space>
      </Drawer>

      <ManufacturerModelPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        initialManufacturerId={manufacturer?.id ?? null}
        initialModelId={model?.id ?? null}
        onPick={(mf, md, meta) => {
          setManufacturer(mf)
          setModel(md)
          setCatalogContext(meta || null)
          setShowAll(false)
          setViewMode("roots")
          setFilters({})
        }}
      />

      <OriginalPartGroupsManager
        open={groupManagerOpen}
        onClose={() => setGroupManagerOpen(false)}
        onChanged={() => {
          loadGroups()
          fetchParts()
        }}
      />

      <OriginalPartsFiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        value={filters}
        onApply={(next) => setFilters(next || {})}
      />
    </Space>
  )
}
