// src/components/clients/ClientsMain.jsx
import React, { useCallback, useEffect, useRef, useState } from "react"
import { Badge, Button, Card, Checkbox, Form, Input, Popover, Space, message } from "antd"
import { DeleteOutlined, FilterOutlined } from "@ant-design/icons"
import { useLocation, useNavigate } from "react-router-dom"
import axios from "@/api/axiosInstance"

import TableToolbar from "@/components/common/TableToolbar"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import ClientsTable from "./ClientsTable"
import ClientsFiltersDrawer, { countActiveFilters } from "./ClientsFiltersDrawer"

const trimOrNull = (v) => {
  const s = (v ?? "").toString().trim()
  return s === "" ? null : s
}

export default function ClientsMain() {
  const navigate = useNavigate()
  const location = useLocation()

  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState([])

  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState({})
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)

  const [addForm] = Form.useForm()
  const [adding, setAdding] = useState(false)

  const [highlightRowId, setHighlightRowId] = useState(null)
  const highlightTimerRef = useRef(null)

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

  const restoreAppliedRef = useRef(false)
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
      const recommended = pick(["phone", "email", "website", "notes"])

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
          params: { scope: "clients", key: "columns_v1" },
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
          scope: "clients",
          key: "columns_v1",
          value_json: { version: 1, configs: columnsByView },
        })
      } catch (e) {
        console.warn("Failed to save UI settings (columns)", e?.message || e)
      }
    }, 500)
    return () => clearTimeout(columnsSaveTimerRef.current)
  }, [columnsByView])

  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit: 500, offset: 0 }
      if (search?.trim()) params.q = search.trim()
      const f = filters || {}
      if (f.has_phone) params.has_phone = 1
      if (f.has_email) params.has_email = 1
      if (f.has_tax_id) params.has_tax_id = 1
      if (f.has_website) params.has_website = 1
      const { data } = await axios.get("/clients", { params })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
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

  const handleCreate = async () => {
    try {
      const v = await addForm.validateFields()
      const name = v.company_name?.trim()
      if (!name) return message.error("Название компании обязательно")

      setAdding(true)
      const payload = {
        company_name: name,
        contact_person: trimOrNull(v.contact_person),
        phone: trimOrNull(v.phone),
        email: trimOrNull(v.email),
        registration_number: trimOrNull(v.registration_number),
        tax_id: trimOrNull(v.tax_id),
        website: trimOrNull(v.website),
        notes: trimOrNull(v.notes),
      }

      const { data: created } = await axios.post("/clients", payload)
      message.success("Клиент создан")
      flashRow(created?.id)
      addForm.resetFields()
      await fetchClients()
    } catch (e) {
      if (e?.errorFields) return
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось создать клиента")
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (client) => {
    try {
      const params = {}
      if (client?.version !== undefined && client?.version !== null) params.version = client.version
      await axios.delete(`/clients/${client.id}`, { params })
      message.success("Клиент удалён")
      await fetchClients()
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

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={16}>
      <Card bodyStyle={{ paddingTop: 8 }}>
        {/* Row A: service actions */}
        <div className="table-section" style={{ display: "flex", justifyContent: "flex-end" }}>
          <Space size={12} wrap>
            <Button danger icon={<DeleteOutlined />} onClick={() => setShowDeleted(true)}>
              Удалённые
            </Button>
          </Space>
        </div>

        {/* Row B: search + view controls */}
        <TableToolbar
          placeholder="Поиск по клиентам (компания, контакт, телефон, e-mail)…"
          search={search}
          onSearch={setSearch}
          searchWidth="clamp(280px, 42vw, 620px)"
          searchEnterButton="Найти"
          extraActions={
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
          }
        />

        {/* Row C: create inline */}
        <div className="table-section">
          <Form
            form={addForm}
            layout="inline"
            style={{ flexWrap: "wrap", rowGap: 8, columnGap: 12 }}
          >
            <Form.Item
              name="company_name"
              label="Компания"
              rules={[{ required: true, message: "Введите название" }]}
            >
              <Input placeholder="Название" style={{ minWidth: 260 }} allowClear />
            </Form.Item>

            <Form.Item name="contact_person" label="Контакт">
              <Input placeholder="ФИО" style={{ minWidth: 220 }} allowClear />
            </Form.Item>

            <Form.Item name="phone" label="Телефон">
              <Input placeholder="+7…" style={{ width: 180 }} allowClear />
            </Form.Item>

            <Form.Item name="email" label="E-mail">
              <Input placeholder="example@mail.com" style={{ minWidth: 240 }} allowClear />
            </Form.Item>

            <Form.Item>
              <Button type="primary" onClick={handleCreate} loading={adding}>
                Добавить
              </Button>
            </Form.Item>
          </Form>
        </div>

        <div className="parts-table-wrap table-section">
          <ClientsTable
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
              navigate(`/clients/${record.id}`, {
                state: {
                  from: `${location.pathname}${location.search || ""}`,
                  listState: { search, filters, columnsByView },
                },
              })
            }}
          />
        </div>
      </Card>

      {showDeleted && (
        <FullHistoryDialog
          onlyDeleted
          endpoint="/clients/logs/deleted"
          onClose={() => setShowDeleted(false)}
        />
      )}

      <ClientsFiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        value={filters}
        onApply={(next) => setFilters(next || {})}
      />
    </Space>
  )
}
