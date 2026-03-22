// src/components/suppliers/SuppliersMain.jsx
import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Form,
  Popover,
  Segmented,
  Space,
  message,
} from "antd"
import { DeleteOutlined, FilterOutlined, PlusOutlined, UploadOutlined } from "@ant-design/icons"
import { useLocation, useNavigate } from "react-router-dom"
import axios from "@/api/axiosInstance"
import TableToolbar from "@/components/common/TableToolbar"
import ImportModal from "@/components/common/ImportModal"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import SuppliersTable from "./SuppliersTable"
import SuppliersFiltersDrawer from "./SuppliersFiltersDrawer"
import { countActiveFilters } from "./suppliersFiltersUtils"
import SupplierUpsertDrawer from "./SupplierUpsertDrawer"

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

  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const createSubmitModeRef = useRef("create_close")
  const [editingRow, setEditingRow] = useState(null)

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
  const [columnOrderByView, setColumnOrderByView] = useState({})
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
    if (restore.columnOrderByView !== undefined) {
      setColumnOrderByView(restore.columnOrderByView || {})
    }
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
  const currentOrderKeys = columnOrderByView?.[columnsViewKey] || null

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
        const [columnsRes, orderRes] = await Promise.all([
          axios.get("/user-ui-settings", {
            params: { scope: "suppliers", key: "columns_v1" },
          }),
          axios.get("/user-ui-settings", {
            params: { scope: "suppliers", key: "column_order_v1" },
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

  // Save column prefs (debounced)
  useEffect(() => {
    if (!columnsHydratedRef.current) return
    clearTimeout(columnsSaveTimerRef.current)
    columnsSaveTimerRef.current = setTimeout(async () => {
      try {
        await Promise.all([
          axios.put("/user-ui-settings", {
            scope: "suppliers",
            key: "columns_v1",
            value_json: { version: 1, configs: columnsByView },
          }),
          axios.put("/user-ui-settings", {
            scope: "suppliers",
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

  const fetchSuppliers = useCallback(async () => {
    try {
      abortRef.current?.abort()
    } catch {
      // ignore abort errors
    }
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

  const formInitialValues = useCallback(
    (record = null) => ({
      name: record?.name || "",
      public_code: record?.public_code || "",
      vat_number: record?.vat_number || "",
      website: record?.website || "",
      payment_terms: record?.payment_terms || "",
      preferred_currency: record?.preferred_currency || "",
      default_pickup_location: record?.default_pickup_location || "",
      can_oem: !!record?.can_oem,
      can_analog: record?.can_analog === undefined ? true : !!record?.can_analog,
      reliability_rating:
        record?.reliability_rating === undefined || record?.reliability_rating === null
          ? null
          : Number(record.reliability_rating),
      risk_level: record?.risk_level || "",
      default_lead_time_days:
        record?.default_lead_time_days === undefined || record?.default_lead_time_days === null
          ? null
          : Number(record.default_lead_time_days),
      notes: record?.notes || "",
    }),
    []
  )

  const openCreateDrawer = () => {
    createForm.setFieldsValue(formInitialValues())
    setCreateOpen(true)
  }

  const openEditDrawer = (row) => {
    if (!row?.id) return
    setEditingRow(row)
    editForm.setFieldsValue(formInitialValues(row))
    setEditOpen(true)
  }

  const buildPayload = (values) => ({
    name: String(values.name || "").trim(),
    public_code: String(values.public_code || "").trim(),
    vat_number: trimOrNull(values.vat_number),
    website: trimOrNull(values.website),
    payment_terms: trimOrNull(values.payment_terms),
    preferred_currency: trimOrNull(values.preferred_currency),
    default_pickup_location: trimOrNull(values.default_pickup_location),
    can_oem: values.can_oem ? 1 : 0,
    can_analog: values.can_analog === false ? 0 : 1,
    reliability_rating: values.reliability_rating ?? null,
    risk_level: trimOrNull(values.risk_level),
    default_lead_time_days: values.default_lead_time_days ?? null,
    notes: trimOrNull(values.notes),
  })

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields()
      const name = values.name?.trim()
      const publicCode = values.public_code?.trim()
      if (!name) return message.error("Название поставщика обязательно")
      if (!publicCode) return message.error("Код поставщика обязателен")

      setAdding(true)
      const payload = buildPayload(values)

      const { data: created } = await axios.post("/suppliers", payload)
      message.success("Поставщик создан")
      flashRow(created.id)
      await fetchSuppliers()
      if (createSubmitModeRef.current === "create_next") {
        createForm.setFieldsValue(formInitialValues())
      } else {
        setCreateOpen(false)
      }
    } catch (e) {
      if (e?.errorFields) return
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось создать поставщика")
    } finally {
      setAdding(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingRow?.id) return
    try {
      const values = await editForm.validateFields()
      const payload = {
        ...buildPayload(values),
        version: Number(editingRow.version),
      }
      setSavingEdit(true)
      const { data: updated } = await axios.put(`/suppliers/${editingRow.id}`, payload)
      message.success("Поставщик обновлен")
      flashRow(updated.id || editingRow.id)
      setEditOpen(false)
      setEditingRow(null)
      await fetchSuppliers()
    } catch (e) {
      if (e?.errorFields) return
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось сохранить поставщика")
    } finally {
      setSavingEdit(false)
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
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
              Создать поставщика
            </Button>
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

        <div className="parts-table-wrap table-section">
          <SuppliersTable
            data={rows}
            loading={loading}
            highlightRowId={highlightRowId}
            visibleColumnKeys={currentVisibleKeys}
            columnOrderKeys={currentOrderKeys}
            onColumnsMeta={(meta) =>
              setColumnsMeta(meta || { options: [], defaultVisible: [], lockedKeys: [] })
            }
            onColumnOrderKeysChange={(next) =>
              setColumnOrderByView((prev) => ({
                ...(prev || {}),
                [columnsViewKey]: Array.isArray(next) ? next : [],
              }))
            }
            onEditRecord={openEditDrawer}
            onDelete={handleDelete}
            onOpenDetail={(record) => {
              if (!record?.id) return
              navigate(`/suppliers/${record.id}`, {
                state: {
                  from: `${location.pathname}${location.search || ""}`,
                  listState: { search, filters, columnsByView, columnOrderByView },
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
        onSuccess={fetchSuppliers}
      />

      {showDeleted && (
        <FullHistoryDialog onlyDeleted entityType="suppliers" onClose={() => setShowDeleted(false)} />
      )}

      <SupplierUpsertDrawer
        open={createOpen}
        title="Создать поставщика"
        form={createForm}
        saving={adding}
        onClose={() => setCreateOpen(false)}
        onSubmit={() => {
          createSubmitModeRef.current = "create_close"
          handleCreate()
        }}
        onSubmitAndCreate={() => {
          createSubmitModeRef.current = "create_next"
          handleCreate()
        }}
      />

      <SupplierUpsertDrawer
        open={editOpen}
        title="Редактировать поставщика"
        form={editForm}
        saving={savingEdit}
        onClose={() => {
          setEditOpen(false)
          setEditingRow(null)
        }}
        onSubmit={handleSaveEdit}
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
