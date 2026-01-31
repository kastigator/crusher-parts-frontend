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
} from "antd"
import {
  ApartmentOutlined,
  FilterOutlined,
  ReloadOutlined,
  SettingOutlined,
} from "@ant-design/icons"
import { useLocation, useNavigate } from "react-router-dom"
import axios from "@/api/axiosInstance"
import TableToolbar from "@/components/common/TableToolbar"
import ImportModal from "@/components/common/ImportModal"
import OriginalPartsTable from "./OriginalPartsTable"
import OriginalPartsRootsTree from "./OriginalPartsRootsTree"
import OriginalPartsFiltersDrawer, {
  countActiveFilters,
} from "./OriginalPartsFiltersDrawer"
import OriginalPartCreateAdvancedDrawer from "./OriginalPartCreateAdvancedDrawer"
import ManufacturerModelPicker from "@/components/originalParts/ManufacturerModelPicker"
import OriginalPartGroupsManager from "@/components/originalParts/OriginalPartGroupsManager"

const TEMPLATE_URL =
  "https://storage.googleapis.com/shared-parts-bucket/templates/original_parts_template.xlsx"

const UOM_OPTIONS = [
  { value: "pcs", label: "шт" },
  { value: "kg", label: "кг" },
  { value: "set", label: "компл." },
]

export default function OriginalPartsMain() {
  const location = useLocation()
  const [manufacturer, setManufacturer] = useState(null)
  const [model, setModel] = useState(null)

  const [search, setSearch] = useState("")
  // viewMode:
  // - roots: корневые узлы как дерево
  // - assemblies: таблица только сборок
  // - parts: таблица только деталей
  // - all: таблица всех
  // - orphans: таблица "вне структуры" (детали без родителей)
  const [viewMode, setViewMode] = useState("roots")

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [highlightRowId, setHighlightRowId] = useState(null)
  const highlightTimerRef = useRef(null)
  const [treeFocusId, setTreeFocusId] = useState(null)

  const [importOpen, setImportOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [addForm] = Form.useForm()

  const navigate = useNavigate()

  const partsAbortRef = useRef(null)

  // 🔹 режим "Показать все детали"
  const [showAll, setShowAll] = useState(false)

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState({})

  const [columnsMeta, setColumnsMeta] = useState({ options: [], defaultVisible: [], lockedKeys: [] })
  const [columnsPopoverOpen, setColumnsPopoverOpen] = useState(false)

  const [advancedValues, setAdvancedValues] = useState({
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

  // per-view column visibility (synced via backend to support multiple devices)
  const [columnsByView, setColumnsByView] = useState({})
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
    if (restore.search !== undefined) setSearch(restore.search || "")
    if (restore.showAll !== undefined) setShowAll(!!restore.showAll)
    if (restore.filters !== undefined) setFilters(restore.filters || {})
    if (restore.columnsByView !== undefined) setColumnsByView(restore.columnsByView || {})
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
    } catch {}
    const controller = new AbortController()
    partsAbortRef.current = controller

    setLoading(true)
    try {
      const params = {}

      // в обычном режиме фильтруем по модели
      if (!showAll && modelId) {
        params.equipment_model_id = modelId
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

  const ensureDefaultColumnsForView = useCallback(
    (viewKey, meta) => {
      if (!meta?.options?.length) return
      if (columnsByView && Object.prototype.hasOwnProperty.call(columnsByView, viewKey)) return

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
        recommended = pick(["manufacturer", "model", ...base])
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
        const { data } = await axios.get("/user-ui-settings", {
          params: { scope: "original_parts", key: "columns_v1" },
        })
        const v = data?.value_json
        const cfg = v?.configs && typeof v.configs === "object" ? v.configs : v
        if (cfg && typeof cfg === "object") setColumnsByView(cfg)
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
        await axios.put("/user-ui-settings", {
          scope: "original_parts",
          key: "columns_v1",
          value_json: { version: 1, configs: columnsByView },
        })
      } catch (e) {
        console.warn("Failed to save UI settings (columns)", e?.message || e)
      }
    }, 500)
    return () => clearTimeout(columnsSaveTimerRef.current)
  }, [columnsByView])

  useEffect(() => {
    const t = setTimeout(fetchParts, 300)
    return () => {
      clearTimeout(t)
      try {
        partsAbortRef.current?.abort()
      } catch {}
    }
  }, [fetchParts])

  /* ----------------------- создание детали -------------------- */
  const submitAddPart = async (values) => {
    if (!model?.id) {
      message.warning("Сначала выберите производителя и модель")
      return
    }
    try {
      const defaultMaterialId = advancedValues.default_material_id
        ? Number(advancedValues.default_material_id)
        : null

      const payload = {
        equipment_model_id: model.id,
        cat_number: values.cat_number,
        description_ru: values.description_ru || null,
        description_en: values.description_en || null,
        tech_description:
          advancedValues.tech_description?.trim() === ""
            ? null
            : advancedValues.tech_description.trim(),
        // If a default material is selected, treat logistics values as a per-material spec.
        // Base columns are left empty to avoid conflicting sources of truth.
        weight_kg: defaultMaterialId ? null : advancedValues.weight_kg ?? null,
        uom: values.uom || "pcs",
        tnved_code_id: advancedValues.tnved?.id ?? null,
        group_id: values.group_id ?? null,
        length_cm: defaultMaterialId ? null : advancedValues.length_cm ?? null,
        width_cm: defaultMaterialId ? null : advancedValues.width_cm ?? null,
        height_cm: defaultMaterialId ? null : advancedValues.height_cm ?? null,
        is_overweight: advancedValues.is_overweight ? 1 : 0,
        is_oversize: advancedValues.is_oversize ? 1 : 0,
        has_drawing: advancedValues.has_drawing ? 1 : 0,
      }
      const { data } = await axios.post("/original-parts", payload)

      // Optional: set default material right after creating the part (and save spec values to that material).
      if (defaultMaterialId) {
        try {
          await axios.post("/original-part-materials", {
            original_part_id: data.id,
            material_id: defaultMaterialId,
            is_default: 1,
            note: advancedValues.default_material_note?.trim()
              ? advancedValues.default_material_note.trim()
              : null,
          })

          const anySpec =
            advancedValues.weight_kg != null ||
            advancedValues.length_cm != null ||
            advancedValues.width_cm != null ||
            advancedValues.height_cm != null

          if (anySpec) {
            await axios.put("/original-part-material-specs", {
              original_part_id: data.id,
              material_id: defaultMaterialId,
              weight_kg: advancedValues.weight_kg ?? null,
              length_cm: advancedValues.length_cm ?? null,
              width_cm: advancedValues.width_cm ?? null,
              height_cm: advancedValues.height_cm ?? null,
            })
          }
        } catch (e) {
          console.warn("Failed to add default material during create", e?.message || e)
          message.warning(
            "Деталь создана, но материал не добавился (можно добавить в карточке → Материалы)."
          )
        }
      }

      message.success(`Деталь ${data.cat_number} создана`)
      flashRow(data.id)
      setTreeFocusId(data.id)
      // Потоковый ввод: очищаем только основные поля,
      // оставляя группу/ед.изм. как "следующее по умолчанию".
      addForm.setFieldsValue({
        cat_number: "",
        description_ru: "",
        description_en: "",
      })
      // Advanced: keep TN VED + default material as "sticky" helpers for bulk entry,
      // but clear free-text/logistics and flags for the next record.
      setAdvancedValues((prev) => ({
        ...(prev || {}),
        tech_description: "",
        default_material_note: "",
        weight_kg: null,
        length_cm: null,
        width_cm: null,
        height_cm: null,
        has_drawing: false,
        is_overweight: false,
        is_oversize: false,
      }))
      fetchParts()
    } catch (e) {
      if (e?.response?.status === 409)
        message.error("Дубликат Part number для этой модели")
      else if (e?.response?.data?.message) message.error(e.response.data.message)
      else {
        console.error(e)
        message.error("Не удалось создать деталь")
      }
    }
  }

  const clearSelection = () => {
    setManufacturer(null)
    setModel(null)
    setRows([])
    setShowAll(false) // при сбросе также выключаем режим "все"
    setViewMode("roots")
    setFilters({})
    // columnsByView are per-user prefs: do not clear on selection reset
    setAdvancedValues({
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
  }

  useEffect(() => {
    // no-op for list-only view
  }, [model?.id])

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
                  ? "Изменить производителя/модель"
                  : "Выбрать производителя и модель"}
              </Button>

              {manufacturer && !showAll ? (
                <Tag color="geekblue">
                  Производитель: {manufacturer.name}
                </Tag>
              ) : null}
              {model && !showAll ? <Tag color="blue">Модель: {model.model_name}</Tag> : null}

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
            По всем моделям
          </Checkbox>

            <Button
              onClick={() => {
                if (!model?.id) {
                  message.warning("Выберите модель для импорта каталога")
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
              <Space direction="vertical" size={8} style={{ alignItems: "flex-end" }}>
                {/* Row B: quick view switches */}
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

                {/* Row B: view controls */}
                <Space size={12} wrap>
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
              </Space>
            }
          />
        </div>

        {/* Форма добавления детали — по-прежнему только для выбранной модели */}
        <Form
          form={addForm}
          layout="inline"
          onFinish={submitAddPart}
          disabled={!model}
          initialValues={{ uom: "pcs" }}
          className="table-section"
          style={{
            marginTop: 8,
            marginBottom: 8,
            flexWrap: "wrap",
            rowGap: 8,
            columnGap: 12,
          }}
        >
          <Form.Item
            name="cat_number"
            label="Кат. номер"
            rules={[{ required: true, message: "Укажите каталожный номер" }]}
          >
            <Input placeholder="например, 711-22-12340" allowClear />
          </Form.Item>
          <Form.Item name="description_ru" label="RU">
            <Input placeholder="Описание (RU)" allowClear />
          </Form.Item>
          <Form.Item name="description_en" label="EN">
            <Input placeholder="Description (EN)" allowClear />
          </Form.Item>
          <Form.Item name="uom" label="Ед. изм.">
            <Select style={{ width: 120 }} options={UOM_OPTIONS} />
          </Form.Item>

          <Form.Item label="Группа">
            <Space.Compact>
              <Form.Item name="group_id" noStyle>
                <Select
                  style={{ width: 220 }}
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

          <Form.Item>
            <Space>
              <Button onClick={() => setAdvancedOpen(true)}>Расширенно</Button>
              <Button type="primary" htmlType="submit">
                Добавить
              </Button>
            </Space>
          </Form.Item>
        </Form>

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
                  if (!partId) return
                  navigate(`/original-parts/${partId}`, {
                    state: {
                      from: `${location.pathname}${location.search || ""}`,
                      listState: {
                        manufacturer,
                        model,
                        search,
                        showAll,
                        viewMode,
                        filters,
                        columnsByView,
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
                onVisibleColumnKeysChange={(next) => {
                  setColumnsByView((prev) => ({
                    ...(prev || {}),
                    [columnsViewKey]: Array.isArray(next) ? next : [],
                  }))
                }}
                onColumnsMeta={(meta) => setColumnsMeta(meta || { options: [], defaultVisible: [], lockedKeys: [] })}
                onReload={fetchParts}
                onOpenDetail={(record) => {
                  if (!record?.id) return
                  navigate(`/original-parts/${record.id}`, {
                    state: {
                      from: `${location.pathname}${location.search || ""}`,
                      listState: {
                        manufacturer,
                        model,
                        search,
                        showAll,
                        viewMode,
                        filters,
                        columnsByView,
                      },
                    },
                  })
                }}
                onRemove={(id) => {
                  setRows((prev) => prev.filter((r) => r.id !== id))
                }}
              />
            )
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Выберите производителя и модель или включите режим «Показать все детали»"
              style={{ padding: "48px 0" }}
            />
          )}
        </div>
      </Card>

      <ImportModal
        open={importOpen}
        type="original_parts"
        templateUrl={TEMPLATE_URL}
        extraParams={{ equipment_model_id: model?.id }}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          setImportOpen(false)
          fetchParts()
          message.success("Импорт выполнен")
        }}
      />

      <ManufacturerModelPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        initialManufacturerId={manufacturer?.id ?? null}
        initialModelId={model?.id ?? null}
        onPick={(mf, md) => {
          setManufacturer(mf)
          setModel(md)
          setShowAll(false)
          setViewMode("roots")
          setFilters({})
          setAdvancedValues({
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

      <OriginalPartCreateAdvancedDrawer
        open={advancedOpen}
        onClose={() => setAdvancedOpen(false)}
        value={advancedValues}
        onChange={(next) => setAdvancedValues(next || {})}
      />
    </Space>
  )
}
