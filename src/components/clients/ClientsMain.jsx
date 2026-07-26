// src/components/clients/ClientsMain.jsx
import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Empty,
  Form,
  Popover,
  Segmented,
  Space,
  message,
} from "antd"
import { FilterOutlined } from "@ant-design/icons"
import { useLocation, useNavigate } from "react-router-dom"
import axios from "@/api/axiosInstance"

import TableToolbar from "@/components/common/TableToolbar"
import WorkspaceShell from "@/components/common/WorkspaceShell"
import ClientsTable from "./ClientsTable"
import ClientsFiltersDrawer from "./ClientsFiltersDrawer"
import { countActiveFilters } from "./clientsFiltersUtils"
import ClientUpsertDrawer from "./ClientUpsertDrawer"
import ClientDock from "./ClientDock"
import { runTrashDeleteFlow } from "@/utils/trashUi"

const trimOrNull = (v) => {
  const s = (v ?? "").toString().trim()
  return s === "" ? null : s
}

export default function ClientsMain() {
  const navigate = useNavigate()
  const location = useLocation()

  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState([])
  const [selectedClientId, setSelectedClientId] = useState(null)
  const [selectedClient, setSelectedClient] = useState(null)

  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState({})
  const [filtersOpen, setFiltersOpen] = useState(false)

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
      const recommended = pick(["contact_person", "phone", "email"])

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
            params: { scope: "clients", key: "columns_v1" },
          }),
          axios.get("/user-ui-settings", {
            params: { scope: "clients", key: "column_order_v1" },
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
            scope: "clients",
            key: "columns_v1",
            value_json: { version: 1, configs: columnsByView },
          }),
          axios.put("/user-ui-settings", {
            scope: "clients",
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

  const fetchClients = useCallback(async () => {
    try {
      abortRef.current?.abort()
    } catch {
      // ignore abort errors
    }
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    try {
      const params = { limit: 500, offset: 0 }
      if (search?.trim()) params.q = search.trim()
      const f = filters || {}
      if (f.has_phone) params.has_phone = 1
      if (f.has_email) params.has_email = 1
      if (f.has_tax_id) params.has_tax_id = 1
      if (f.has_website) params.has_website = 1
      const { data } = await axios.get("/clients", {
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
      console.error(e)
      message.error("Не удалось загрузить клиентов")
    } finally {
      setLoading(false)
    }
  }, [search, filters])

  // Debounced reload on search change
  useEffect(() => {
    const t = setTimeout(() => fetchClients(), 200)
    return () => clearTimeout(t)
  }, [fetchClients])

  useEffect(() => {
    if (!rows.length) {
      setSelectedClientId(null)
      setSelectedClient(null)
      return
    }

    const current = selectedClientId
      ? rows.find((row) => Number(row.id) === Number(selectedClientId))
      : null
    if (current) {
      setSelectedClient(current)
      return
    }

    setSelectedClientId(rows[0].id)
    setSelectedClient(rows[0])
  }, [rows, selectedClientId])

  const selectClient = useCallback((record) => {
    if (!record?.id) return
    setSelectedClientId(Number(record.id))
    setSelectedClient(record)
  }, [])

  const loadSelectedClient = useCallback(async () => {
    if (!selectedClientId) return null
    try {
      const { data } = await axios.get(`/clients/${selectedClientId}`)
      if (data?.id) {
        setSelectedClient(data)
        setRows((prev) =>
          (Array.isArray(prev) ? prev : []).map((row) =>
            Number(row.id) === Number(data.id) ? { ...row, ...data } : row,
          ),
        )
      }
      return data || null
    } catch (e) {
      console.error("Не удалось обновить карточку клиента", e)
      message.error("Не удалось обновить карточку клиента")
      return null
    }
  }, [selectedClientId])

  const handleWorkspaceChanged = useCallback(async () => {
    await loadSelectedClient()
    await fetchClients()
  }, [fetchClients, loadSelectedClient])

  const formInitialValues = useCallback(
    (record = null) => ({
      company_name: record?.company_name || "",
      contact_person: record?.contact_person || "",
      phone: record?.phone || "",
      email: record?.email || "",
      registration_number: record?.registration_number || "",
      tax_id: record?.tax_id || "",
      website: record?.website || "",
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
    company_name: String(values.company_name || "").trim(),
    contact_person: trimOrNull(values.contact_person),
    phone: trimOrNull(values.phone),
    email: trimOrNull(values.email),
    registration_number: trimOrNull(values.registration_number),
    tax_id: trimOrNull(values.tax_id),
    website: trimOrNull(values.website),
    notes: trimOrNull(values.notes),
  })

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields()
      const name = values.company_name?.trim()
      if (!name) return message.error("Название компании обязательно")

      setAdding(true)
      const payload = buildPayload(values)

      const { data: created } = await axios.post("/clients", payload)
      message.success("Клиент создан")
      flashRow(created?.id)
      if (created?.id) {
        setSelectedClientId(Number(created.id))
        setSelectedClient(created)
      }
      await fetchClients()
      if (createSubmitModeRef.current === "create_next") {
        createForm.setFieldsValue(formInitialValues())
      } else {
        setCreateOpen(false)
      }
    } catch (e) {
      if (e?.errorFields) return
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось создать клиента")
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
      const { data: updated } = await axios.put(`/clients/${editingRow.id}`, payload)
      message.success("Клиент обновлен")
      flashRow(updated?.id || editingRow.id)
      if (Number(selectedClientId) === Number(editingRow.id)) {
        setSelectedClient(updated || { ...editingRow, ...payload })
      }
      setEditOpen(false)
      setEditingRow(null)
      await fetchClients()
    } catch (e) {
      if (e?.errorFields) return
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось сохранить клиента")
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = async (client) => {
    try {
      const params = {}
      if (client?.version !== undefined && client?.version !== null) params.version = client.version
      const result = await runTrashDeleteFlow({
        entityType: "clients",
        entityId: client.id,
        deleteUrl: `/clients/${client.id}`,
        deleteParams: params,
        successMessage: "Клиент перемещён в корзину",
      })
      if (result?.deleted) {
        if (Number(selectedClientId) === Number(client.id)) {
          setSelectedClientId(null)
          setSelectedClient(null)
        }
        await fetchClients()
      }
    } catch (e) {
      console.error(e)
      if (e?.response?.status === 409) {
        message.error("Конфликт версии. Обнови список и попробуй ещё раз.")
        await fetchClients()
        return
      }
      message.error(e?.response?.data?.message || "Не удалось удалить клиента")
    }
  }

  const quickCompleteness = filters?.has_phone
    ? "phone"
    : filters?.has_email
      ? "email"
      : filters?.has_tax_id
        ? "tax"
        : "all"

  const listPane = (
    <Card bodyStyle={{ paddingTop: 8 }}>
      <TableToolbar
        placeholder="Поиск по клиентам (компания, контакт, телефон, e-mail)…"
        search={search}
        onSearch={setSearch}
        onAdd={openCreateDrawer}
        onShowDeleted={() => navigate("/trash")}
        searchWidth="clamp(280px, 42vw, 620px)"
        searchEnterButton="Найти"
        extraActions={
          <Space size={12} wrap style={{ justifyContent: "flex-end" }}>
            <Segmented
              size="small"
              value={quickCompleteness}
              options={[
                { label: "Все", value: "all" },
                { label: "Телефон", value: "phone" },
                { label: "E-mail", value: "email" },
                { label: "ИНН", value: "tax" },
              ]}
              onChange={(value) => {
                const next = String(value)
                setFilters((prev) => ({
                  ...(prev || {}),
                  has_phone: next === "phone",
                  has_email: next === "email",
                  has_tax_id: next === "tax",
                }))
              }}
            />

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
        }
      />

      <div className="parts-table-wrap table-section">
        <ClientsTable
          data={rows}
          loading={loading}
          selectedRowId={selectedClientId}
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
          onSelectRecord={selectClient}
          onOpenDetail={selectClient}
        />
      </div>
    </Card>
  )

  const detailPane = selectedClient ? (
    <ClientDock client={selectedClient} onChanged={handleWorkspaceChanged} />
  ) : (
    <Card bodyStyle={{ padding: 24 }}>
      <Empty description="Выберите клиента в списке" />
    </Card>
  )

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={16}>
      <WorkspaceShell listWidth={520} listPane={listPane} detailPane={detailPane} />

      <ClientUpsertDrawer
        open={createOpen}
        title="Создать клиента"
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

      <ClientUpsertDrawer
        open={editOpen}
        title="Редактировать клиента"
        form={editForm}
        saving={savingEdit}
        onClose={() => {
          setEditOpen(false)
          setEditingRow(null)
        }}
        onSubmit={handleSaveEdit}
      />

      <ClientsFiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        value={filters}
        onApply={(next) => setFilters(next || {})}
      />
    </Space>
  )
}
