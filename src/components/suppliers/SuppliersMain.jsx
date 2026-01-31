// src/components/suppliers/SuppliersMain.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Popover,
  Segmented,
  Space,
  message,
} from "antd"
import { DeleteOutlined, FilterOutlined, UploadOutlined } from "@ant-design/icons"
import { useLocation, useNavigate } from "react-router-dom"
import axios from "@/api/axiosInstance"
import TableToolbar from "@/components/common/TableToolbar"
import ImportModal from "@/components/common/ImportModal"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import SuppliersTable from "./SuppliersTable"
import SuppliersFiltersDrawer, { countActiveFilters } from "./SuppliersFiltersDrawer"
import SupplierCreateAdvancedDrawer from "./SupplierCreateAdvancedDrawer"

const SUPPLIERS_TEMPLATE_URL =
  "https://storage.googleapis.com/shared-parts-bucket/templates/suppliers_template.xlsx"

const trimOrNull = (v) => {
  const s = (v ?? "").toString().trim()
  return s === "" ? null : s
}

export default function SuppliersMain() {
  const navigate = useNavigate()
  const location = useLocation()

  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState([])

  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState({})
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [importOpen, setImportOpen] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)

  const [addForm] = Form.useForm()
  const [adding, setAdding] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [advancedValues, setAdvancedValues] = useState({
    vat_number: "",
    website: "",
    payment_terms: "",
    preferred_currency: "",
    default_incoterms: "",
    default_pickup_location: "",
    can_oem: false,
    can_analog: true,
    reliability_rating: null,
    risk_level: "",
    default_lead_time_days: null,
    notes: "",
  })

  const [highlightRowId, setHighlightRowId] = useState(null)
  const highlightTimerRef = useRef(null)

  // columns (synced via backend to support multiple devices)
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

  const abortRef = useRef(null)
  const restoreAppliedRef = useRef(false)

  // Restore list state when returning from the detail page
  useEffect(() => {
    if (restoreAppliedRef.current) return
    const restore = location.state?.restore
    if (!restore) return
    restoreAppliedRef.current = true

    if (restore.search !== undefined) setSearch(restore.search || "")
    if (restore.filters !== undefined) setFilters(restore.filters || {})
    if (restore.columnsByView !== undefined) setColumnsByView(restore.columnsByView || {})
  }, [location.state])

  const flashRow = useCallback((id) => {
    const n = Number(id)
    if (!Number.isFinite(n) || n <= 0) return
    setHighlightRowId(n)
    clearTimeout(highlightTimerRef.current)
    highlightTimerRef.current = setTimeout(() => setHighlightRowId(null), 1600)
  }, [])

  useEffect(() => () => clearTimeout(highlightTimerRef.current), [])

  const columnsViewKey = "main"
  const currentVisibleKeys = columnsByView?.[columnsViewKey] || null

  const ensureDefaultColumns = useCallback(
    (meta) => {
      if (!meta?.options?.length) return
      if (columnsByView && Object.prototype.hasOwnProperty.call(columnsByView, columnsViewKey)) return

      const allToggleKeys = meta.options.map((o) => o.key)
      const pick = (keys) => keys.filter((k) => allToggleKeys.includes(k))

      const recommended = pick([
        "country",
        "contact_person",
        "phone",
        "email",
        "can_oem",
        "can_analog",
        "risk_level",
        "reliability_rating",
        "default_lead_time_days",
        "notes",
      ])

      setColumnsByView((prev) => ({ ...(prev || {}), [columnsViewKey]: recommended }))
    },
    [columnsByView],
  )

  useEffect(() => {
    if (!columnsHydratedRef.current) return
    ensureDefaultColumns(columnsMeta)
  }, [columnsMeta, ensureDefaultColumns])

  // Load column prefs once
  useEffect(() => {
    if (columnsLoadStartedRef.current) return
    columnsLoadStartedRef.current = true
    const run = async () => {
      try {
        const { data } = await axios.get("/user-ui-settings", {
          params: { scope: "suppliers", key: "columns_v1" },
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

  // Save column prefs (debounced)
  useEffect(() => {
    if (!columnsHydratedRef.current) return
    clearTimeout(columnsSaveTimerRef.current)
    columnsSaveTimerRef.current = setTimeout(async () => {
      try {
        await axios.put("/user-ui-settings", {
          scope: "suppliers",
          key: "columns_v1",
          value_json: { version: 1, configs: columnsByView },
        })
      } catch (e) {
        console.warn("Failed to save UI settings (columns)", e?.message || e)
      }
    }, 500)
    return () => clearTimeout(columnsSaveTimerRef.current)
  }, [columnsByView])

  const fetchSuppliers = useCallback(async () => {
    try {
      abortRef.current?.abort()
    } catch {}
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    try {
      const f = filters || {}
      const params = {}
      if (search?.trim()) params.q = search.trim()
      if (f.can_oem) params.can_oem = 1
      if (f.can_analog) params.can_analog = 1
      if (f.risk_level) params.risk_level = f.risk_level
      if (f.reliability_min != null) params.reliability_min = f.reliability_min
      if (f.reliability_max != null) params.reliability_max = f.reliability_max
      if (f.lead_time_min != null) params.lead_time_min = f.lead_time_min
      if (f.lead_time_max != null) params.lead_time_max = f.lead_time_max
      if (f.country_q) params.country = f.country_q
      if (f.has_contact) params.has_contact = 1
      if (f.has_address) params.has_address = 1

      const { data } = await axios.get("/suppliers", {
        params,
        signal: controller.signal,
      })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      if (
        e?.name === "AbortError" ||
        e?.name === "CanceledError" ||
        e?.code === "ERR_CANCELED"
      ) {
        return
      }
      console.error("Ошибка при загрузке поставщиков:", e)
      message.error("Не удалось загрузить поставщиков")
    } finally {
      setLoading(false)
    }
  }, [search, filters])

  // Debounced reload on search/filters change
  useEffect(() => {
    const t = setTimeout(() => fetchSuppliers(), 200)
    return () => clearTimeout(t)
  }, [fetchSuppliers])

  const handleCreate = async () => {
    try {
      const v = await addForm.validateFields()
      const name = v.name?.trim()
      const publicCode = v.public_code?.trim()
      if (!name) return message.error("Название поставщика обязательно")
      if (!publicCode) return message.error("Код поставщика обязателен")

      setAdding(true)
      const payload = {
        name,
        public_code: publicCode,
        vat_number: trimOrNull(advancedValues.vat_number),
        website: trimOrNull(advancedValues.website),
        payment_terms: trimOrNull(advancedValues.payment_terms),
        preferred_currency: trimOrNull(advancedValues.preferred_currency),
        default_incoterms: trimOrNull(advancedValues.default_incoterms),
        default_pickup_location: trimOrNull(advancedValues.default_pickup_location),
        can_oem: advancedValues.can_oem ? 1 : 0,
        can_analog: advancedValues.can_analog === false ? 0 : 1,
        reliability_rating: advancedValues.reliability_rating ?? null,
        risk_level: trimOrNull(advancedValues.risk_level),
        default_lead_time_days: advancedValues.default_lead_time_days ?? null,
        notes: trimOrNull(advancedValues.notes),
      }

      const { data: created } = await axios.post("/suppliers", payload)
      message.success("Поставщик создан")
      flashRow(created.id)
      addForm.setFieldsValue({ name: "", public_code: "" })
      // Reset only the "rare" fields; keep common prefs sticky
      setAdvancedValues((prev) => ({
        ...(prev || {}),
        vat_number: "",
        website: "",
        notes: "",
      }))
      await fetchSuppliers()
    } catch (e) {
      if (e?.errorFields) return
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось создать поставщика")
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (supplier) => {
    try {
      await axios.delete(`/suppliers/${supplier.id}`, {
        params: { version: supplier.version },
      })
      message.success("Поставщик удален")
      await fetchSuppliers()
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось удалить поставщика")
    }
  }

  const quickCapabilities = filters?.cap_mode || "all"
  const quickRisk = filters?.risk_level || "all"

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={16}>
      <Card bodyStyle={{ paddingTop: 8 }}>
        {/* Row A: service actions (consistent placement across catalogs) */}
        <div className="table-section" style={{ display: "flex", justifyContent: "flex-end" }}>
          <Space size={12} wrap>
            <Button icon={<UploadOutlined />} onClick={() => setImportOpen(true)}>
              Импорт
            </Button>
            <Button danger icon={<DeleteOutlined />} onClick={() => setShowDeleted(true)}>
              Удалённые
            </Button>
          </Space>
        </div>

        <TableToolbar
          placeholder="Поиск по поставщикам (название, код, VAT, контакт)…"
          search={search}
          onSearch={setSearch}
          searchWidth="clamp(280px, 42vw, 620px)"
          searchEnterButton="Найти"
          extraActions={
            <Space direction="vertical" size={8} style={{ alignItems: "flex-end" }}>
              <Space size={12} wrap>
                <Segmented
                  size="small"
                  value={quickCapabilities}
                  options={[
                    { label: "Все", value: "all" },
                    { label: "OEM", value: "oem" },
                    { label: "Аналоги", value: "analog" },
                  ]}
                  onChange={(v) => {
                    const next = String(v)
                    setFilters((prev) => {
                      const base = { ...(prev || {}) }
                      base.cap_mode = next
                      if (next === "oem") {
                        base.can_oem = true
                        base.can_analog = false
                      } else if (next === "analog") {
                        base.can_oem = false
                        base.can_analog = true
                      } else {
                        base.can_oem = false
                        base.can_analog = false
                      }
                      return base
                    })
                  }}
                />

                <Segmented
                  size="small"
                  value={quickRisk === "" ? "all" : quickRisk}
                  options={[
                    { label: "Риск: все", value: "all" },
                    { label: "низкий", value: "low" },
                    { label: "средний", value: "medium" },
                    { label: "высокий", value: "high" },
                  ]}
                  onChange={(v) => {
                    const next = String(v)
                    setFilters((prev) => ({
                      ...(prev || {}),
                      risk_level: next === "all" ? "" : next,
                    }))
                  }}
                />
              </Space>

              <Space size={12} wrap>
                <Badge count={countActiveFilters(filters)} size="small" offset={[-2, 6]}>
                  <Button icon={<FilterOutlined />} onClick={() => setFiltersOpen(true)}>
                    Фильтры
                  </Button>
                </Badge>

                <Popover
                  open={columnsPopoverOpen}
                  onOpenChange={setColumnsPopoverOpen}
                  trigger="click"
                  placement="bottomRight"
                  content={
                    <div style={{ width: 260 }}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>Колонки</div>
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
                  <Button>Колонки</Button>
                </Popover>
              </Space>
            </Space>
          }
        />

        <div className="table-section">
          <Form form={addForm} layout="inline" style={{ flexWrap: "wrap", rowGap: 8, columnGap: 12 }}>
            <Form.Item
              name="name"
              label="Название"
              rules={[{ required: true, message: "Введите название" }]}
            >
              <Input placeholder="Название поставщика" style={{ minWidth: 260 }} allowClear />
            </Form.Item>

            <Form.Item
              name="public_code"
              label="Код"
              rules={[{ required: true, message: "Введите код" }]}
            >
              <Input placeholder="S001" style={{ width: 140 }} allowClear />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button onClick={() => setAdvancedOpen(true)}>Расширенно</Button>
                <Button type="primary" onClick={handleCreate} loading={adding}>
                  Добавить
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </div>

        <div className="parts-table-wrap table-section">
          <SuppliersTable
            data={rows}
            loading={loading}
            highlightRowId={highlightRowId}
            visibleColumnKeys={currentVisibleKeys}
            onColumnsMeta={(meta) =>
              setColumnsMeta(meta || { options: [], defaultVisible: [], lockedKeys: [] })
            }
            onDelete={handleDelete}
            onOpenDetail={(record) => {
              if (!record?.id) return
              navigate(`/suppliers/${record.id}`, {
                state: {
                  from: `${location.pathname}${location.search || ""}`,
                  listState: { search, filters, columnsByView },
                },
              })
            }}
          />
        </div>
      </Card>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        type="suppliers"
        templateUrl={SUPPLIERS_TEMPLATE_URL}
        onImported={fetchSuppliers}
      />

      {showDeleted && (
        <FullHistoryDialog onlyDeleted entityType="suppliers" onClose={() => setShowDeleted(false)} />
      )}

      <SupplierCreateAdvancedDrawer
        open={advancedOpen}
        onClose={() => setAdvancedOpen(false)}
        value={advancedValues}
        onChange={(next) => setAdvancedValues(next || {})}
      />

      <SuppliersFiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        value={filters}
        onApply={(next) => setFilters(next || {})}
      />
    </Space>
  )
}
