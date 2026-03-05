import React, { useCallback, useEffect, useRef, useState } from "react"
import { Button, Card, Checkbox, Form, Input, InputNumber, Popover, Space, message } from "antd"
import { DeleteOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import TnvedCodesTable from "./TnvedCodesTable"
import ImportModal from "@/components/common/ImportModal"
import TableToolbar from "@/components/common/TableToolbar"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import { isSameByFields } from "@/utils/versionConflict"

const { TextArea } = Input

const EMPTY_NEW_RECORD = {
  code: "",
  description: "",
  duty_rate: null,
  notes: "",
}

export default function TnvedCodesMain() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [importVisible, setImportVisible] = useState(false)
  const [search, setSearch] = useState("")
  const [newRecord, setNewRecord] = useState(EMPTY_NEW_RECORD)
  const [logId, setLogId] = useState(null)

  const [hasNew, setHasNew] = useState(false)
  const [etag, setEtag] = useState(null)

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

  const toNull = (v) => (v === "" || v === undefined ? null : v)

  const toNumberOrNull = (v) => {
    if (v === "" || v === null || v === undefined) return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }

  const replaceRow = (fresh) => {
    setData((prev) => prev.map((r) => (r.id === fresh.id ? fresh : r)))
  }

  const removeRow = (id) =>
    setData((prev) => prev.filter((r) => r.id !== id))

  // ---------- API ----------
  const fetchEtag = useCallback(async () => {
    try {
      const { data: e } = await axios.get("/tnved-codes/etag")
      return e?.etag || null
    } catch {
      return null
    }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get("/tnved-codes")
      setData(res.data || [])

      const freshEtag = await fetchEtag()
      setEtag(freshEtag)
      setHasNew(false)
    } catch (err) {
      console.error("Ошибка загрузки данных:", err)
      message.error("Не удалось загрузить коды ТН ВЭД")
    } finally {
      setLoading(false)
    }
  }, [fetchEtag])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Load column prefs once
  useEffect(() => {
    if (columnsLoadStartedRef.current) return
    columnsLoadStartedRef.current = true
    const run = async () => {
      try {
        const [columnsRes, orderRes] = await Promise.all([
          axios.get("/user-ui-settings", {
            params: { scope: "tnved_codes", key: "columns_v1" },
          }),
          axios.get("/user-ui-settings", {
            params: { scope: "tnved_codes", key: "column_order_v1" },
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
            scope: "tnved_codes",
            key: "columns_v1",
            value_json: { version: 1, configs: columnsByView },
          }),
          axios.put("/user-ui-settings", {
            scope: "tnved_codes",
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

  // ---------- поллинг по ETag ----------
  useEffect(() => {
    let timer
    const checkChanged = async () => {
      if (document.hidden || loading) return
      const next = await fetchEtag()
      if (etag && next && next !== etag) {
        setHasNew(true)
      }
    }

    const t0 = setTimeout(checkChanged, 10000)
    timer = setInterval(checkChanged, 30000)
    const vis = () => checkChanged()
    document.addEventListener("visibilitychange", vis)

    return () => {
      clearTimeout(t0)
      clearInterval(timer)
      document.removeEventListener("visibilitychange", vis)
    }
  }, [etag, loading, fetchEtag])

  // ---------- create ----------
  const handleAdd = async () => {
    if (!newRecord.code?.trim()) {
      message.warning("Поле 'Код' обязательно для заполнения")
      return
    }

    const payload = {
      code: newRecord.code.trim(),
      description: toNull(newRecord.description?.trim?.()),
      duty_rate: toNumberOrNull(newRecord.duty_rate),
      notes: toNull(newRecord.notes?.trim?.()),
    }

    try {
      const { data: created } = await axios.post("/tnved-codes", payload)
      setData((prev) => [created, ...prev])
      setNewRecord(EMPTY_NEW_RECORD)
      setHasNew(false)

      const freshEtag = await fetchEtag()
      setEtag(freshEtag)
      message.success("Запись добавлена")
    } catch (err) {
      console.error("Ошибка при добавлении:", err)
      const t = err?.response?.data?.type
      if (t === "duplicate_key") {
        message.error("Запись с таким кодом и описанием уже существует")
      } else {
        message.error(
          err?.response?.data?.message || "Не удалось добавить запись",
        )
      }
    }
  }

  // ---------- update ----------
  const handleUpdate = async (id, updated) => {
    try {
      const { data: fresh } = await axios.put(`/tnved-codes/${id}`, {
        code: updated.code?.trim(),
        description: toNull(updated?.description?.trim?.()),
        duty_rate: toNumberOrNull(updated?.duty_rate),
        notes: toNull(updated?.notes?.trim?.()),
        version: updated.version,
      })
      replaceRow(fresh)

      const freshEtag = await fetchEtag()
      setEtag(freshEtag)
      message.success("Изменения сохранены")
    } catch (err) {
      const res = err?.response
      if (res?.status === 409) {
        const current =
          res?.data?.current || res?.data?.currentRecord || err.currentRecord
        const payload = {
          code: updated.code?.trim(),
          description: toNull(updated?.description?.trim?.()),
          duty_rate: toNumberOrNull(updated?.duty_rate),
          notes: toNull(updated?.notes?.trim?.()),
        }
        if (
          current &&
          isSameByFields(current, payload, [
            "code",
            "description",
            "duty_rate",
            "notes",
          ])
        ) {
          replaceRow(current)
          const freshEtag = await fetchEtag()
          setEtag(freshEtag)
          message.success("Изменения сохранены")
          return
        }
      }
      throw err
    }
  }

  // ---------- delete ----------
  const handleDelete = async (record) => {
    try {
      await axios.delete(`/tnved-codes/${record.id}`, {
        params: { version: record.version },
      })
      removeRow(record.id)
      const freshEtag = await fetchEtag()
      setEtag(freshEtag)
      message.success("Код удалён")
    } catch (err) {
      if (err?.isVersionConflict) {
        if (err.currentRecord) replaceRow(err.currentRecord)
        message.warning(
          "Запись изменилась и не была удалена. Обновили строку.",
        )
        return
      }
      console.error("Ошибка удаления:", err)
      message.error("Ошибка при удалении кода")
    }
  }

  // ---------- фильтр по строке поиска ----------
  const filteredData = data.filter(
    (item) =>
      item.code?.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase()) ||
      item.notes?.toLowerCase().includes(search.toLowerCase()),
  )

  const columnsViewKey = "main"
  const currentVisibleKeys = columnsByView?.[columnsViewKey] || null
  const currentOrderKeys = columnOrderByView?.[columnsViewKey] || null

  return (
    <Space
      direction="vertical"
      style={{ width: "100%", maxWidth: "100%" }}
      size={16}
    >
      <Card
        bodyStyle={{ paddingTop: 16 }}
        style={{ width: "100%", boxSizing: "border-box" }}
        extra={
          <Space>
            <Button
              size="small"
              type="link"
              href="https://www.alta.ru/tnved/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Коды ТН ВЭД РФ
            </Button>
            <Button
              size="small"
              type="link"
              href="https://ec.europa.eu/taxation_customs/dds2/taric/taric_consultation.jsp?Lang=en"
              target="_blank"
              rel="noopener noreferrer"
            >
              EU HS Code
            </Button>
          </Space>
        }
      >
        {hasNew && (
          <div className="table-section">
            <Button
              type="primary"
              onClick={async () => {
                await fetchData()
                message.success("Список обновлён")
              }}
            >
              Появились изменения — обновить
            </Button>
          </div>
        )}

        {/* Row A: service actions */}
        <div className="table-section" style={{ display: "flex", justifyContent: "flex-end" }}>
          <Space size={12} wrap>
            <Button onClick={() => setImportVisible(true)}>Импорт</Button>
            <Button danger icon={<DeleteOutlined />} onClick={() => setLogId("deleted")}>
              Удалённые
            </Button>
          </Space>
        </div>

        {/* Row B: search + view controls */}
        <div className="table-section">
          <TableToolbar
            placeholder="Поиск по коду/описанию/примечаниям…"
            search={search}
            onSearch={setSearch}
            searchWidth="clamp(280px, 42vw, 620px)"
            searchEnterButton="Найти"
            extraActions={
              <Space size={12} wrap>
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
        </div>

        {/* форма быстрого добавления */}
        <div className="table-section">
          <Form
            layout="inline"
            style={{ flexWrap: "wrap", rowGap: 8, columnGap: 12 }}
            onFinish={handleAdd}
          >
          <Form.Item label="Код">
            <Input
              value={newRecord.code}
              onChange={(e) =>
                setNewRecord((prev) => ({
                  ...(prev || EMPTY_NEW_RECORD),
                  code: e.target.value,
                }))
              }
              placeholder="Введите код"
            />
          </Form.Item>

          <Form.Item label="Описание">
            <TextArea
              rows={1}
              value={newRecord.description}
              onChange={(e) =>
                setNewRecord((prev) => ({
                  ...(prev || EMPTY_NEW_RECORD),
                  description: e.target.value,
                }))
              }
              placeholder="Описание"
              style={{ width: 300 }}
            />
          </Form.Item>

          <Form.Item label="Пошлина">
            <InputNumber
              value={newRecord.duty_rate}
              step={0.01}
              placeholder="%"
              style={{ width: 120 }}
              onChange={(v) =>
                setNewRecord((prev) => ({
                  ...(prev || EMPTY_NEW_RECORD),
                  duty_rate: v,
                }))
              }
            />
          </Form.Item>

          <Form.Item label="Примечания">
            <TextArea
              rows={1}
              value={newRecord.notes}
              onChange={(e) =>
                setNewRecord((prev) => ({
                  ...(prev || EMPTY_NEW_RECORD),
                  notes: e.target.value,
                }))
              }
              placeholder="Примечания"
              style={{ width: 220 }}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              Добавить
            </Button>
          </Form.Item>
          </Form>
        </div>

        <TnvedCodesTable
          data={filteredData}
          loading={loading}
          visibleColumnKeys={currentVisibleKeys}
          columnOrderKeys={currentOrderKeys}
          onColumnOrderKeysChange={(next) =>
            setColumnOrderByView((prev) => ({
              ...(prev || {}),
              [columnsViewKey]: Array.isArray(next) ? next : [],
            }))
          }
          onColumnsMeta={(meta) =>
            setColumnsMeta(meta || { options: [], defaultVisible: [], lockedKeys: [] })
          }
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onReplaceRow={replaceRow}
          onRefresh={fetchData}
        />
      </Card>

      <ImportModal
        open={importVisible}
        onClose={() => setImportVisible(false)}
        onSuccess={fetchData}
        type="tnved_codes"
        templateUrl="https://storage.googleapis.com/shared-parts-bucket/templates/tnved_codes_template.xlsx"
      />

      {logId === "deleted" && (
        <FullHistoryDialog
          onlyDeleted
          entityType="tnved_codes"
          onClose={() => setLogId(null)}
        />
      )}
    </Space>
  )
}
