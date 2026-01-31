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
  Input,
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
} from "@ant-design/icons"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import TableToolbar from "@/components/common/TableToolbar"
import SupplierPickerDrawer from "./SupplierPickerDrawer"
import SupplierPartsTable from "./SupplierPartsTable"
import ImportModal from "@/components/common/ImportModal"
import axios from "@/api/axiosInstance"
import { getCountryLabel } from "@/components/inputs/CountrySelect"
import SupplierPartCreateAdvancedDrawer from "./SupplierPartCreateAdvancedDrawer"
import SupplierPartsFiltersDrawer, {
  countActiveFilters,
} from "./SupplierPartsFiltersDrawer"

const SUPPLIER_TEMPLATE_URL =
  "https://storage.googleapis.com/shared-parts-bucket/templates/supplier_parts_template.xlsx"

export default function SupplierPartsMain() {
  const location = useLocation()
  const navigate = useNavigate()

  const [pickerOpen, setPickerOpen] = useState(false)
  const [supplier, setSupplier] = useState(null)
  const [search, setSearch] = useState("")
  const [version, setVersion] = useState(0)
  const [importOpen, setImportOpen] = useState(false)

  const [form] = Form.useForm()
  const [adding, setAdding] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
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
  const columnsLoadStartedRef = useRef(false)
  const columnsHydratedRef = useRef(false)
  const columnsSaveTimerRef = useRef(null)

  const [params] = useSearchParams()
  const focusId = params.get("focus")
  const supplierIdParam = params.get("supplierId")
  const allParam = params.get("all")

  const [advancedValues, setAdvancedValues] = useState({
    comment: "",
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
    setVersion((v) => v + 1)
  }, [location.state])

  useEffect(() => {
    // do not wipe state on restore
    if (restoreAppliedRef.current) return
    setSearch("")
  }, [supplier?.id])

  useEffect(() => {
    // URL fallback: /supplier-parts?supplierId=...&all=1
    if (!restoreAppliedRef.current && allParam === "1") {
      setShowAll(true)
    }
  }, [allParam])

  const columnsViewKey = showAll ? "showAll" : "supplier"
  const currentVisibleKeys = columnsByView?.[columnsViewKey] || null
  const quickPartType = filters?.part_type || "all"
  const quickLinksMode = filters?.originals_mode || "any"
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
        "original_links",
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
        const { data } = await axios.get("/user-ui-settings", {
          params: { scope: "supplier_parts", key: "columns_v1" },
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
          scope: "supplier_parts",
          key: "columns_v1",
          value_json: { version: 1, configs: columnsByView },
        })
      } catch (e) {
        console.warn("Failed to save UI settings (columns)", e?.message || e)
      }
    }, 500)
    return () => clearTimeout(columnsSaveTimerRef.current)
  }, [columnsByView])

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

  const clearSupplier = () => {
    setSupplier(null)
    setSearch("")
    setShowAll(false)
    setFilters({})
    setVersion((v) => v + 1)
  }

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
        <Button size="small" onClick={clearSupplier} icon={<ReloadOutlined />}>
          Сбросить
        </Button>
      </Space>
    )
  }, [supplier])

  const handleImportClick = () => {
    if (!supplier?.id) {
      message.warning("Сначала выберите поставщика")
      return
    }
    setImportOpen(true)
  }

  const handleAdd = async () => {
    if (!supplier?.id) {
      message.warning("Сначала выберите поставщика")
      return
    }
    try {
      const v = await form.validateFields()
      setAdding(true)
      const payload = {
        supplier_id: supplier.id,
        supplier_part_number: v.supplier_part_number,
        description_ru: v.description_ru || null,
        description_en: v.description_en || null,
        comment: advancedValues.comment?.trim() ? advancedValues.comment.trim() : null,
        lead_time_days: advancedValues.lead_time_days ?? null,
        min_order_qty: advancedValues.min_order_qty ?? null,
        packaging: advancedValues.packaging?.trim() ? advancedValues.packaging.trim() : null,
        weight_kg: advancedValues.weight_kg ?? null,
        length_cm: advancedValues.length_cm ?? null,
        width_cm: advancedValues.width_cm ?? null,
        height_cm: advancedValues.height_cm ?? null,
        is_overweight: advancedValues.is_overweight ? 1 : 0,
        is_oversize: advancedValues.is_oversize ? 1 : 0,
        part_type: advancedValues.is_oem ? "OEM" : "ANALOG",
      }

      const { data } = await axios.post("/supplier-parts", payload)

      const defaultMaterialId = advancedValues.default_material_id
        ? Number(advancedValues.default_material_id)
        : null
      if (defaultMaterialId) {
        try {
          await axios.post("/supplier-part-materials", {
            supplier_part_id: data.id,
            material_id: defaultMaterialId,
            is_default: 1,
            note: advancedValues.default_material_note?.trim()
              ? advancedValues.default_material_note.trim()
              : null,
          })
        } catch (e) {
          console.warn("Failed to add default material during create", e?.message || e)
          message.warning(
            "Деталь создана, но материал не добавился (можно добавить в карточке → Материалы)."
          )
        }
      }

      message.success("Деталь поставщика добавлена")
      flashRow(data.id)
      // потоковый ввод: очищаем только основные поля, оставляя "липкими" поставщика и расширенные подсказки
      form.setFieldsValue({
        supplier_part_number: "",
        description_ru: "",
        description_en: "",
      })
      setAdvancedValues((prev) => ({
        ...(prev || {}),
        comment: "",
        default_material_note: "",
        weight_kg: null,
        length_cm: null,
        width_cm: null,
        height_cm: null,
        is_overweight: false,
        is_oversize: false,
      }))
      setVersion((x) => x + 1)
    } catch (e) {
      if (e?.response?.data?.message) message.error(e.response.data.message)
      else if (!e?.errorFields) {
        console.error(e)
        message.error("Не удалось создать деталь")
      }
    } finally {
      setAdding(false)
    }
  }

  useEffect(() => {
    const initSupplierOnly = async () => {
      const sid = supplierIdParam && Number(supplierIdParam)
      if (!sid || focusId) return
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierIdParam, focusId])

  useEffect(() => {
    // If opened via legacy deep link (?focus=...), redirect to the full detail page.
    const id = focusId && Number(focusId)
    if (!id) return
    const qs = new URLSearchParams()
    if (supplierIdParam) qs.set("supplierId", String(supplierIdParam))
    if (allParam) qs.set("all", String(allParam))
    navigate(`/supplier-parts/${id}${qs.toString() ? `?${qs.toString()}` : ""}`, {
      replace: true,
    })
  }, [focusId, supplierIdParam, allParam, navigate])

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={16}>
      <Card bodyStyle={{ paddingTop: 8 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={12}>
            <Space wrap>
              <Button
                icon={<TeamOutlined />}
                onClick={() => setPickerOpen(true)}
              >
                {supplier ? "Изменить поставщика" : "Выбрать поставщика"}
              </Button>
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
              <Space direction="vertical" size={8} style={{ alignItems: "flex-end" }}>
                {/* Row B: quick switches */}
                <Space size={12} wrap>
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
                        originals_mode: next,
                      }))
                    }}
                  />
                </Space>

                {/* Row B: view controls */}
                <Space size={12} wrap>
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
              </Space>
            }
          />
        </div>

        <div className="table-section">
          <Form
            form={form}
            layout="inline"
            disabled={!supplier}
            style={{ flexWrap: "wrap", rowGap: 8, columnGap: 12 }}
          >
            <Form.Item
              name="supplier_part_number"
              label="№ у поставщика"
              rules={[{ required: true, message: "Введите номер" }]}
            >
              <Input placeholder="например, P-12345" style={{ width: 240 }} allowClear />
            </Form.Item>

            <Form.Item name="description_ru" label="RU">
              <Input
                placeholder="Описание (RU)"
                style={{ minWidth: 220 }}
                allowClear
              />
            </Form.Item>

            <Form.Item name="description_en" label="EN">
              <Input
                placeholder="Description (EN)"
                style={{ minWidth: 220 }}
                allowClear
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button onClick={() => setAdvancedOpen(true)} disabled={!supplier}>
                  Расширенно
                </Button>
                <Button type="primary" onClick={handleAdd} loading={adding} disabled={!supplier}>
                  Добавить
                </Button>
              </Space>
            </Form.Item>
          </Form>
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
          onColumnsMeta={(meta) =>
            setColumnsMeta(meta || { options: [], defaultVisible: [], lockedKeys: [] })
          }
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
                  },
                },
              }
            )
          }}
        />
      </Card>

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

      <ImportModal
        open={importOpen}
        type="supplier_parts"
        templateUrl={SUPPLIER_TEMPLATE_URL}
        extraParams={{ supplier_id: supplier?.id }}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          setImportOpen(false)
          setVersion((v) => v + 1)
          message.success("Импорт выполнен")
        }}
      />

      <SupplierPartCreateAdvancedDrawer
        open={advancedOpen}
        onClose={() => setAdvancedOpen(false)}
        value={advancedValues}
        onChange={(next) => setAdvancedValues(next || {})}
      />

      <SupplierPartsFiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        value={filters}
        onApply={(next) => setFilters(next || {})}
      />
    </Space>
  )
}
