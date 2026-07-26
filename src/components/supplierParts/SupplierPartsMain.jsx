import React, { useMemo, useState, useEffect, useRef, useCallback } from "react"
import {
  Card,
  Row,
  Col,
  Space,
  Button,
  Tag,
  Badge,
  Tooltip,
  message,
  Form,
  Checkbox,
  Popover,
  Segmented,
} from "antd"
import {
  TeamOutlined,
  ImportOutlined,
  ReloadOutlined,
  FilterOutlined,
  PlusOutlined,
} from "@ant-design/icons"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import TableToolbar from "@/components/common/TableToolbar"
import SupplierPickerDrawer from "./SupplierPickerDrawer"
import SupplierPartsTable from "./SupplierPartsTable"
import ImportModal from "@/components/common/ImportModal"
import axios from "@/api/axiosInstance"
import { getCountryLabel } from "@/components/inputs/countryUtils"
import SupplierPartsFiltersDrawer from "./SupplierPartsFiltersDrawer"
import { countActiveFilters } from "./supplierPartsFiltersUtils"
import SupplierPartCatalogLinksDrawer from "./SupplierPartCatalogLinksDrawer"
import SupplierPriceListsDrawer from "./SupplierPriceListsDrawer"
import SupplierPartUpsertDrawer from "./SupplierPartUpsertDrawer"
import { cmToMm, mmToCm } from "@/utils/dimensions"

export default function SupplierPartsMain({
  initialSupplier = null,
  embedded = false,
  allowShowAll = true,
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const isEmbedded = !!embedded

  const [pickerOpen, setPickerOpen] = useState(false)
  const [supplier, setSupplier] = useState(initialSupplier || null)
  const [search, setSearch] = useState("")
  const [version, setVersion] = useState(0)
  const [importOpen, setImportOpen] = useState(false)
  const [priceListsOpen, setPriceListsOpen] = useState(false)

  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [catalogLinksPart, setCatalogLinksPart] = useState(null)
  const [savingCreate, setSavingCreate] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const createSubmitModeRef = useRef("create_close")
  const [materialOptions, setMaterialOptions] = useState([])
  const [materialsLoading, setMaterialsLoading] = useState(false)
  const [highlightRowId, setHighlightRowId] = useState(null)
  const highlightTimerRef = useRef(null)

  const [showAll, setShowAll] = useState(false)

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState({})

  const [columnsMeta, setColumnsMeta] = useState({
    options: [],
    defaultVisible: [],
    lockedKeys: [],
  })
  const [columnsPopoverOpen, setColumnsPopoverOpen] = useState(false)

  const [columnsByView, setColumnsByView] = useState({})
  const [columnOrderByView, setColumnOrderByView] = useState({})
  const [columnWidthsByView, setColumnWidthsByView] = useState({})
  const columnsLoadStartedRef = useRef(false)
  const columnsHydratedRef = useRef(false)
  const columnsSaveTimerRef = useRef(null)

  const [params] = useSearchParams()
  const focusId = params.get("focus")
  const supplierIdParam = params.get("supplierId")
  const allParam = params.get("all")

  useEffect(() => {
    if (!isEmbedded) return
    setSupplier(initialSupplier || null)
    setShowAll(false)
    setSearch("")
    setFilters({})
    setCatalogLinksPart(null)
    setVersion((v) => v + 1)
  }, [initialSupplier, isEmbedded])

  // Restore list state when returning from the detail page
  const restoreAppliedRef = useRef(false)
  useEffect(() => {
    if (restoreAppliedRef.current) return
    const restore = location.state?.restore
    if (!restore) return
    restoreAppliedRef.current = true

    if (restore.supplier !== undefined) setSupplier(restore.supplier || null)
    if (restore.search !== undefined) setSearch(restore.search || "")
    if (restore.showAll !== undefined) setShowAll(!!restore.showAll)
    if (restore.filters !== undefined) setFilters(restore.filters || {})
    if (restore.columnsByView !== undefined) setColumnsByView(restore.columnsByView || {})
    if (restore.columnOrderByView !== undefined) {
      setColumnOrderByView(restore.columnOrderByView || {})
    }
    if (restore.columnWidthsByView !== undefined) {
      setColumnWidthsByView(restore.columnWidthsByView || {})
    }
    setVersion((v) => v + 1)
  }, [location.state])

  useEffect(() => {
    // do not wipe state on restore
    if (restoreAppliedRef.current) return
    setSearch("")
  }, [supplier?.id])

  useEffect(() => {
    // URL fallback: /supplier-parts?supplierId=...&all=1
    if (!isEmbedded && allowShowAll && !restoreAppliedRef.current && allParam === "1") {
      setShowAll(true)
    }
  }, [allParam, allowShowAll, isEmbedded])

  const columnsViewKey = showAll ? "showAll" : "supplier"
  const currentVisibleKeys = columnsByView?.[columnsViewKey] || null
  const currentOrderKeys = columnOrderByView?.[columnsViewKey] || null
  const currentColumnWidths = columnWidthsByView?.[columnsViewKey] || null
  const quickPartType = filters?.part_type || "all"
  const quickLinksMode = filters?.catalog_links_mode || "any"
  const listDisabled = !supplier && !showAll

  const ensureDefaultColumnsForView = useCallback(
    (viewKey, meta) => {
      if (!meta?.options?.length) return
      if (columnsByView && Object.prototype.hasOwnProperty.call(columnsByView, viewKey)) return

      const allToggleKeys = meta.options.map((o) => o.key)
      const pick = (keys) => keys.filter((k) => allToggleKeys.includes(k))

      let recommended = pick([
        "description_ru",
        "description_en",
        "comment",
        "part_type",
        "default_material_name",
        "lead_time_days",
        "min_order_qty",
        "packaging",
        "catalog_links",
      ])

      if (viewKey === "showAll") {
        recommended = pick(["supplier_name", ...recommended])
      }

      setColumnsByView((prev) => ({ ...(prev || {}), [viewKey]: recommended }))
    },
    [columnsByView]
  )

  useEffect(() => {
    if (!columnsHydratedRef.current) return
    ensureDefaultColumnsForView(columnsViewKey, columnsMeta)
  }, [columnsMeta, columnsViewKey, ensureDefaultColumnsForView])

  // Load column prefs from backend once
  useEffect(() => {
    if (columnsLoadStartedRef.current) return
    columnsLoadStartedRef.current = true
    const run = async () => {
      try {
        const [columnsRes, orderRes, widthsRes] = await Promise.all([
          axios.get("/user-ui-settings", {
            params: { scope: "supplier_parts", key: "columns_v1" },
          }),
          axios.get("/user-ui-settings", {
            params: { scope: "supplier_parts", key: "column_order_v1" },
          }),
          axios.get("/user-ui-settings", {
            params: { scope: "supplier_parts", key: "column_widths_v1" },
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

        const widthsValue = widthsRes?.data?.value_json
        const widthsCfg =
          widthsValue?.configs && typeof widthsValue.configs === "object"
            ? widthsValue.configs
            : widthsValue
        if (widthsCfg && typeof widthsCfg === "object") setColumnWidthsByView(widthsCfg)
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
            scope: "supplier_parts",
            key: "columns_v1",
            value_json: { version: 1, configs: columnsByView },
          }),
          axios.put("/user-ui-settings", {
            scope: "supplier_parts",
            key: "column_order_v1",
            value_json: { version: 1, configs: columnOrderByView },
          }),
          axios.put("/user-ui-settings", {
            scope: "supplier_parts",
            key: "column_widths_v1",
            value_json: { version: 1, configs: columnWidthsByView },
          }),
        ])
      } catch (e) {
        console.warn("Failed to save UI settings (columns)", e?.message || e)
      }
    }, 500)
    return () => clearTimeout(columnsSaveTimerRef.current)
  }, [columnsByView, columnOrderByView, columnWidthsByView])

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

  const clearSupplier = useCallback(() => {
    if (isEmbedded) return
    setSupplier(null)
    setSearch("")
    setShowAll(false)
    setFilters({})
    setCatalogLinksPart(null)
    setVersion((v) => v + 1)
  }, [isEmbedded])

  const openCatalogLinks = useCallback((row) => {
    if (!row?.id) return
    setCatalogLinksPart(row)
  }, [])

  const handleCatalogLinksChanged = useCallback(() => {
    setVersion((v) => v + 1)
  }, [])

  const supplierSummary = useMemo(() => {
    if (!supplier) return null
    const title = supplier.company || supplier.name
    const countryLabel = supplier.country
      ? getCountryLabel(supplier.country, "ru")
      : null

    return (
      <Space wrap size={[8, 8]}>
        <Tag color="geekblue">Поставщик: {title}</Tag>
        {countryLabel ? <Tag>{countryLabel}</Tag> : null}
        {supplier.phone ? <Tag>{supplier.phone}</Tag> : null}
        {supplier.email ? <Tag>{supplier.email}</Tag> : null}
        {!isEmbedded ? (
          <Button size="small" onClick={clearSupplier} icon={<ReloadOutlined />}>
            Сбросить
          </Button>
        ) : null}
      </Space>
    )
  }, [clearSupplier, isEmbedded, supplier])

  const handleImportClick = () => {
    if (!supplier?.id) {
      message.warning("Сначала выберите поставщика")
      return
    }
    setImportOpen(true)
  }

  const fetchMaterials = useCallback(async (q = "") => {
    setMaterialsLoading(true)
    try {
      const { data } = await axios.get("/materials", {
        params: { q, limit: 50 },
      })
      setMaterialOptions(
        (data || []).map((m) => ({
          value: m.id,
          label: `${m.name}${m.standard ? ` · ${m.standard}` : ""}`,
        }))
      )
    } catch (e) {
      console.error("Не удалось загрузить справочник материалов", e)
    } finally {
      setMaterialsLoading(false)
    }
  }, [])

  const openCreateDrawer = () => {
    if (!supplier?.id) {
      message.warning("Сначала выберите поставщика")
      return
    }
    createForm.setFieldsValue({
      supplier_part_number: "",
      description_ru: "",
      description_en: "",
      comment: "",
      uom: "шт",
      lead_time_days: null,
      min_order_qty: null,
      packaging: "",
      weight_kg: null,
      length_cm: null,
      width_cm: null,
      height_cm: null,
      is_oem: false,
      is_overweight: false,
      is_oversize: false,
      default_material_id: null,
      default_material_note: "",
    })
    setCreateOpen(true)
    fetchMaterials("")
  }

  const openEditDrawer = (row) => {
    if (!row?.id) return
    setEditingRow(row)
    editForm.setFieldsValue({
      supplier_part_number: row.supplier_part_number || "",
      description_ru: row.description_ru || "",
      description_en: row.description_en || "",
      comment: row.comment || "",
      uom: row.uom ? String(row.uom).toLowerCase() : "шт",
      lead_time_days:
        row.lead_time_days === undefined || row.lead_time_days === null
          ? null
          : Number(row.lead_time_days),
      min_order_qty:
        row.min_order_qty === undefined || row.min_order_qty === null
          ? null
          : Number(row.min_order_qty),
      packaging: row.packaging || "",
      weight_kg:
        row.weight_kg === undefined || row.weight_kg === null ? null : Number(row.weight_kg),
      length_cm: cmToMm(row.length_cm),
      width_cm: cmToMm(row.width_cm),
      height_cm: cmToMm(row.height_cm),
      is_oem: String(row.part_type || "").toUpperCase() === "OEM",
      is_overweight: !!row.is_overweight,
      is_oversize: !!row.is_oversize,
      default_material_id: null,
      default_material_note: "",
    })
    setEditOpen(true)
    fetchMaterials("")
  }

  const buildPayload = (values) => ({
    supplier_part_number: String(values.supplier_part_number || "").trim(),
    description_ru: String(values.description_ru || "").trim() || null,
    description_en: String(values.description_en || "").trim() || null,
    comment: String(values.comment || "").trim() || null,
    uom: values.uom || "шт",
    lead_time_days: values.lead_time_days ?? null,
    min_order_qty: values.min_order_qty ?? null,
    packaging: String(values.packaging || "").trim() || null,
    weight_kg: values.weight_kg ?? null,
    length_cm: mmToCm(values.length_cm),
    width_cm: mmToCm(values.width_cm),
    height_cm: mmToCm(values.height_cm),
    is_overweight: values.is_overweight ? 1 : 0,
    is_oversize: values.is_oversize ? 1 : 0,
    part_type: values.is_oem ? "OEM" : "ANALOG",
  })

  const checkDuplicateSupplierPartNumber = useCallback(
    async (supplierId, supplierPartNumber, excludeId = null) => {
      const sid = Number(supplierId)
      const partNumber = String(supplierPartNumber || "").trim()
      if (!sid || !partNumber) return false
      const { data } = await axios.get("/supplier-parts/validate-number", {
        params: {
          supplier_id: sid,
          supplier_part_number: partNumber,
          ...(excludeId ? { exclude_id: Number(excludeId) } : {}),
        },
      })
      return !!data?.exists
    },
    []
  )

  const createPartNumberRules = useMemo(
    () => [
      { required: true, message: "Введите номер детали" },
      {
        validator: async (_, value) => {
          const partNumber = String(value || "").trim()
          if (!partNumber || !supplier?.id) return
          const exists = await checkDuplicateSupplierPartNumber(supplier.id, partNumber)
          if (exists) {
            throw new Error("Такой номер уже существует у выбранного поставщика")
          }
        },
      },
    ],
    [supplier?.id, checkDuplicateSupplierPartNumber]
  )

  const editPartNumberRules = useMemo(
    () => [
      { required: true, message: "Введите номер детали" },
      {
        validator: async (_, value) => {
          const partNumber = String(value || "").trim()
          if (!partNumber || !supplier?.id) return
          const exists = await checkDuplicateSupplierPartNumber(
            supplier.id,
            partNumber,
            editingRow?.id || null
          )
          if (exists) {
            throw new Error("Такой номер уже существует у выбранного поставщика")
          }
        },
      },
    ],
    [supplier?.id, editingRow?.id, checkDuplicateSupplierPartNumber]
  )

  const upsertDefaultMaterial = async (partId, values) => {
    const materialId = values.default_material_id ? Number(values.default_material_id) : null
    if (!materialId) return
    await axios.post("/supplier-part-materials", {
      supplier_part_id: partId,
      material_id: materialId,
      is_default: 1,
      note: String(values.default_material_note || "").trim() || null,
    })
  }

  const submitCreate = async () => {
    try {
      const values = await createForm.validateFields()
      const isDuplicate = await checkDuplicateSupplierPartNumber(
        supplier.id,
        values.supplier_part_number
      )
      if (isDuplicate) {
        message.error("Такой номер уже существует у выбранного поставщика")
        return
      }
      setSavingCreate(true)
      const payload = {
        supplier_id: supplier.id,
        ...buildPayload(values),
      }
      const { data } = await axios.post("/supplier-parts", payload)
      await upsertDefaultMaterial(data.id, values)
      message.success("Деталь поставщика добавлена")
      flashRow(data.id)
      setVersion((x) => x + 1)
      if (createSubmitModeRef.current === "create_next") {
        createForm.setFieldsValue({
          supplier_part_number: "",
          description_ru: "",
          description_en: "",
          comment: "",
          default_material_note: "",
          weight_kg: null,
          length_cm: null,
          width_cm: null,
          height_cm: null,
          is_overweight: false,
          is_oversize: false,
        })
      } else {
        setCreateOpen(false)
      }
    } catch (e) {
      if (e?.response?.data?.message) message.error(e.response.data.message)
      else if (!e?.errorFields) {
        console.error(e)
        message.error("Не удалось создать деталь")
      }
    } finally {
      setSavingCreate(false)
    }
  }

  const submitEdit = async () => {
    if (!editingRow?.id) return
    try {
      const values = await editForm.validateFields()
      const isDuplicate = await checkDuplicateSupplierPartNumber(
        supplier.id,
        values.supplier_part_number,
        editingRow.id
      )
      if (isDuplicate) {
        message.error("Такой номер уже существует у выбранного поставщика")
        return
      }
      setSavingEdit(true)
      await axios.put(`/supplier-parts/${editingRow.id}`, buildPayload(values))
      await upsertDefaultMaterial(editingRow.id, values)
      message.success("Изменения сохранены")
      setEditOpen(false)
      setEditingRow(null)
      setVersion((x) => x + 1)
    } catch (e) {
      if (e?.response?.data?.message) message.error(e.response.data.message)
      else if (!e?.errorFields) {
        console.error(e)
        message.error("Не удалось сохранить изменения")
      }
    } finally {
      setSavingEdit(false)
    }
  }

  useEffect(() => {
    const initSupplierOnly = async () => {
      const sid = supplierIdParam && Number(supplierIdParam)
      if (isEmbedded || !sid || focusId) return
      try {
        const { data } = await axios.get(`/part-suppliers/${sid}`)
        if (!data) return
        setSupplier({
          id: data.id,
          company: data.company || data.name || `#${data.id}`,
          country: data.country || null,
          phone: data.phone || null,
          email: data.email || null,
        })
        setVersion((v) => v + 1)
      } catch (e) {
        console.error("supplierId init failed", e)
      }
    }
    initSupplierOnly()
  }, [supplierIdParam, focusId, isEmbedded])

  useEffect(() => {
    // If opened via legacy deep link (?focus=...), redirect to the full detail page.
    const id = focusId && Number(focusId)
    if (isEmbedded || !id) return
    const qs = new URLSearchParams()
    if (supplierIdParam) qs.set("supplierId", String(supplierIdParam))
    if (allParam) qs.set("all", String(allParam))
    navigate(`/supplier-parts/${id}${qs.toString() ? `?${qs.toString()}` : ""}`, {
      replace: true,
    })
  }, [focusId, supplierIdParam, allParam, isEmbedded, navigate])

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={isEmbedded ? 12 : 16}>
      <Card size={isEmbedded ? "small" : "default"} bodyStyle={{ paddingTop: 8 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={12}>
            <Space wrap>
              {!isEmbedded ? (
                <Button
                  icon={<TeamOutlined />}
                  onClick={() => setPickerOpen(true)}
                >
                  {supplier ? "Изменить поставщика" : "Выбрать поставщика"}
                </Button>
              ) : null}
              {supplierSummary}
            </Space>
          </Col>

          <Col
            xs={24}
            md={12}
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 12,
            }}
          >
            {!isEmbedded && allowShowAll ? (
              <Checkbox
                checked={showAll}
                onChange={(e) => {
                  const checked = e.target.checked
                  setShowAll(checked)
                  setVersion((v) => v + 1)
                }}
              >
                Показать все детали
              </Checkbox>
            ) : null}

            <Button
              onClick={() => setPriceListsOpen(true)}
              disabled={!supplier}
            >
              Прайс-листы
            </Button>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateDrawer}
              disabled={!supplier}
            >
              Создать позицию
            </Button>

            <Button
              icon={<ImportOutlined />}
              onClick={handleImportClick}
              disabled={!supplier}
            >
              Импорт
            </Button>
          </Col>
        </Row>

        <div className="table-section">
          <TableToolbar
            placeholder={
              showAll
                ? "Поиск по номеру/RU/EN/комментариям… (по всем поставщикам)"
                : "Поиск по номеру/RU/EN/комментариям…"
            }
            search={search}
            onSearch={setSearch}
            disabled={listDisabled}
            searchWidth="clamp(280px, 42vw, 620px)"
            searchEnterButton="Найти"
            extraActions={
              <Space size={12} wrap style={{ justifyContent: "flex-end" }}>
                <Segmented
                  size="small"
                  disabled={listDisabled}
                  value={quickPartType}
                  options={[
                    { label: "Все", value: "all" },
                    { label: "OEM", value: "OEM" },
                    { label: "Аналоги", value: "ANALOG" },
                  ]}
                  onChange={(v) => {
                    const next = String(v)
                    setFilters((prev) => ({
                      ...(prev || {}),
                      part_type: next === "all" ? null : next,
                    }))
                  }}
                />

                <Segmented
                  size="small"
                  disabled={listDisabled}
                  value={quickLinksMode}
                  options={[
                    { label: "Все", value: "any" },
                    { label: "Привязанные", value: "linked" },
                    { label: "Без привязок", value: "unlinked" },
                  ]}
                  onChange={(v) => {
                    const next = String(v)
                    setFilters((prev) => ({
                      ...(prev || {}),
                      catalog_links_mode: next,
                    }))
                  }}
                />

                <Tooltip title="Фильтры">
                  <Badge count={countActiveFilters(filters)} size="small" offset={[-2, 6]}>
                    <Button
                      icon={<FilterOutlined />}
                      onClick={() => setFiltersOpen(true)}
                      disabled={listDisabled}
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
                        Колонки ({showAll ? "все поставщики" : "поставщик"})
                      </div>
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
                    </div>
                  }
                >
                  <Button disabled={listDisabled}>Колонки</Button>
                </Popover>
              </Space>
            }
          />
        </div>

        <SupplierPartsTable
          supplierId={showAll ? null : supplier?.id || null}
          search={search}
          filters={filters}
          version={version}
          onReload={() => setVersion((v) => v + 1)}
          showAll={showAll}
          highlightRowId={highlightRowId}
          onFlashRow={flashRow}
          visibleColumnKeys={currentVisibleKeys}
          columnOrderKeys={currentOrderKeys}
          columnWidths={currentColumnWidths}
          onColumnOrderKeysChange={(next) =>
            setColumnOrderByView((prev) => ({
              ...(prev || {}),
              [columnsViewKey]: Array.isArray(next) ? next : [],
            }))
          }
          onColumnWidthsChange={(next) =>
            setColumnWidthsByView((prev) => ({
              ...(prev || {}),
              [columnsViewKey]: next && typeof next === "object" ? next : {},
            }))
          }
          onColumnsMeta={(meta) =>
            setColumnsMeta(meta || { options: [], defaultVisible: [], lockedKeys: [] })
          }
          onEditRecord={openEditDrawer}
          onOpenCatalogLinks={openCatalogLinks}
          onOpenDetail={(record) => {
            if (!record?.id) return
            const qs = new URLSearchParams()
            if (supplier?.id) qs.set("supplierId", String(supplier.id))
            if (showAll) qs.set("all", "1")

            navigate(
              `/supplier-parts/${record.id}${qs.toString() ? `?${qs.toString()}` : ""}`,
              {
                state: {
                  from: `${location.pathname}${location.search || ""}`,
                  listState: {
                    supplier,
                    search,
                    showAll,
                    filters,
                    columnsByView,
                    columnOrderByView,
                    columnWidthsByView,
                  },
                },
              }
            )
          }}
        />
      </Card>

      {!isEmbedded ? (
        <SupplierPickerDrawer
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onPick={(s) => {
            setSupplier(s)
            setPickerOpen(false)
            setShowAll(false)
            setFilters({})
            setVersion((v) => v + 1)
          }}
          initialSupplierId={supplier?.id ?? null}
        />
      ) : null}

      <ImportModal
        open={importOpen}
        type="supplier_parts"
        extraParams={{ supplier_id: supplier?.id }}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          setImportOpen(false)
          setVersion((v) => v + 1)
          message.success("Импорт выполнен")
        }}
      />
      <SupplierPartUpsertDrawer
        open={createOpen}
        title="Создать позицию"
        form={createForm}
        saving={savingCreate}
        onClose={() => setCreateOpen(false)}
        onSubmit={() => {
          createSubmitModeRef.current = "create_close"
          submitCreate()
        }}
        onSubmitAndCreate={() => {
          createSubmitModeRef.current = "create_next"
          submitCreate()
        }}
        supplierLabel={supplier?.company || supplier?.name || "—"}
        supplierPartNumberRules={createPartNumberRules}
        materialOptions={materialOptions}
        materialsLoading={materialsLoading}
        onSearchMaterials={fetchMaterials}
        onFocusMaterials={() => fetchMaterials("")}
      />

      <SupplierPartUpsertDrawer
        open={editOpen}
        title="Редактировать позицию"
        form={editForm}
        saving={savingEdit}
        onClose={() => {
          if (savingEdit) return
          setEditOpen(false)
          setEditingRow(null)
        }}
        onSubmit={submitEdit}
        supplierPartNumberRules={editPartNumberRules}
        materialOptions={materialOptions}
        materialsLoading={materialsLoading}
        onSearchMaterials={fetchMaterials}
        onFocusMaterials={() => fetchMaterials("")}
      />

      <SupplierPartsFiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        value={filters}
        onApply={(next) => setFilters(next || {})}
      />

      <SupplierPartCatalogLinksDrawer
        open={!!catalogLinksPart?.id}
        part={catalogLinksPart}
        onClose={() => setCatalogLinksPart(null)}
        onChanged={handleCatalogLinksChanged}
      />

      <SupplierPriceListsDrawer
        open={priceListsOpen}
        supplier={supplier}
        onClose={() => setPriceListsOpen(false)}
      />
    </Space>
  )
}
