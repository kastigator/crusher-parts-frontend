// src/components/common/FullHistoryDialog.jsx
import React, { useEffect, useMemo, useState } from "react"
import { Modal, Table, Spin, Empty, Tag, Checkbox, Space, Tooltip, Button, message } from "antd"
import { CopyOutlined, DownloadOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import { logSchemas } from "@/utils/logSchemas"

// 👇 алиасы на случаи, когда страница пробрасывает одно имя, а в логах/БД — другое
const ENTITY_TYPE_ALIASES = {
  tnved_codes: "tnved_code",   // таблица plural, entity_type в логах — singular
  part_suppliers: "suppliers", // на всякий – если где-то передадим part_suppliers
}

export default function FullHistoryDialog({ entityId, entityType, onClose, onlyDeleted = false }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)

  const [actionFilter, setActionFilter] = useState(
    onlyDeleted ? { create: false, update: false, delete: true } : { create: true, update: true, delete: true }
  )

  useEffect(() => {
    setActionFilter(onlyDeleted ? { create: false, update: false, delete: true } : { create: true, update: true, delete: true })
  }, [onlyDeleted])

  useEffect(() => {
    if (!entityType || (entityId == null && !onlyDeleted)) return

    const fetchLogs = async () => {
      setLoading(true)
      try {
        const apiEntity = ENTITY_TYPE_ALIASES[entityType] || entityType
        let res
        if (onlyDeleted) {
          // удалённые
          res = await axios.get(`/activity-logs/deleted?entity_type=${apiEntity}`)
        } else {
          // стандартная история
          res = await axios.get(`/activity-logs/${apiEntity}/${entityId}`)
        }
        setLogs(Array.isArray(res.data) ? res.data : [])
      } catch (e) {
        console.error("Ошибка при загрузке логов:", e)
        setLogs([])
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [entityId, entityType, onlyDeleted])

  const entityLabels = {
    clients: "Клиент",
    client_billing_addresses: "Юр. адрес",
    client_shipping_addresses: "Адрес доставки",
    client_bank_details: "Банковские реквизиты",
    tnved_code: "ТН ВЭД",
    tnved_codes: "ТН ВЭД",   // чтобы подпись в таблице была нормальной для обоих ключей
    suppliers: "Поставщик",
  }

  // техполя не показываем как отдельные изменения
  const TECH_FIELDS = new Set(["id", "created_at", "updated_at", "client_id", "entity_id", "user_id", "version"])

  const labelForField = (record) => {
    const schema = logSchemas[record?.entity_type] || logSchemas[ENTITY_TYPE_ALIASES[record?.entity_type]]
    const nice = schema?.fields?.[record?.field_changed]
    if (nice) return nice
    if (!record?.field_changed) {
      if (record?.action === "delete") return "Удаление"
      if (record?.action === "create") return "Создание"
      return record?.comment || "—"
    }
    return record.field_changed
  }

  const filteredByAction = useMemo(() => {
    const allowed = new Set(Object.entries(actionFilter).filter(([, v]) => v).map(([k]) => k))
    return logs.filter((l) => allowed.has(l?.action))
  }, [logs, actionFilter])

  const base = onlyDeleted ? filteredByAction.filter((l) => l.action === "delete") : filteredByAction
  const rows = base.filter((log) => {
    if (!log) return false
    if (log.action === "create" || log.action === "delete") return true
    if (!log.field_changed) return false
    if (TECH_FIELDS.has(log.field_changed)) return false
    return true
  })

  const cellWrap = { whiteSpace: "pre-wrap", wordBreak: "break-word" }
  const bgOld = "#fff1f0"
  const bgNew = "#f6ffed"
  const formatValue = (v) =>
    v == null || v === ""
      ? "—"
      : typeof v === "object"
      ? (() => { try { return JSON.stringify(v, null, 2) } catch { return String(v) } })()
      : String(v)

  const copyText = async (t) => {
    try { await navigator.clipboard.writeText(t); message.success("Скопировано") }
    catch { message.warning("Не удалось скопировать") }
  }

  const exportCSV = () => {
    const header = onlyDeleted
      ? ["Сущность","Действие","Детали","Комментарий","Пользователь","Дата"]
      : ["Сущность","Действие","Поле","Было","Стало","Комментарий","Пользователь","Дата"]

    const lines = rows.map((r) => {
      const h = entityLabels[r.entity_type] || r.entity_type
      const action = r.action
      const user = r.user_name || r.user_id || "—"
      const date = r.created_at ? new Date(r.created_at).toLocaleString("ru-RU") : "—"
      const esc = (s) => `"${String(s).replaceAll(`"`, `""`)}"`
      if (onlyDeleted) {
        const details = formatValue(r.old_value)
        return [h, action, details, r.comment || "—", user, date].map(esc).join(",")
      } else {
        const field = labelForField(r)
        return [h, action, field, formatValue(r.old_value), formatValue(r.new_value), r.comment || "—", user, date]
          .map(esc)
          .join(",")
      }
    })
    const csv = [header.join(","), ...lines].join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `history_${(ENTITY_TYPE_ALIASES[entityType] || entityType) || "all"}_${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const leftCols = [
    { title: "Сущность", dataIndex: "entity_type", width: 150, fixed: "left", render: (val) => entityLabels[val] || val },
    { title: "Действие", dataIndex: "action", width: 110, fixed: "left",
      render: (val) => <Tag color={{create:"green",update:"blue",delete:"red"}[val] || "default"}>{val}</Tag> }
  ]

  const columnsFull = [
    ...leftCols,
    { title: "Поле", dataIndex: "field_changed", width: 180, render: (_v, r) => <div style={cellWrap}>{labelForField(r)}</div> },
    {
      title: "Было", dataIndex: "old_value", width: 520,
      render: (v, r) => {
        const text = formatValue(v)
        const content = <div style={{ ...cellWrap, background: r.action === "update" ? bgOld : undefined, padding: r.action === "update" ? "4px 6px" : 0 }}>{text}</div>
        return <Space size={6} align="start">{content}{text !== "—" && <Tooltip title="Скопировать"><Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copyText(text)} /></Tooltip>}</Space>
      }
    },
    {
      title: "Стало", dataIndex: "new_value", width: 520,
      render: (v, r) => {
        const text = formatValue(v)
        const content = <div style={{ ...cellWrap, background: r.action === "update" ? bgNew : undefined, padding: r.action === "update" ? "4px 6px" : 0 }}>{text}</div>
        return <Space size={6} align="start">{content}{text !== "—" && <Tooltip title="Скопировать"><Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copyText(text)} /></Tooltip>}</Space>
      }
    },
    { title: "Комментарий", dataIndex: "comment", width: 240, render: (v) => <div style={cellWrap}>{v || "—"}</div> },
    { title: "Пользователь", dataIndex: "user_name", width: 170, render: (v, r) => v || r.user_id || "—" },
    { title: "Дата", dataIndex: "created_at", width: 170, render: (v) => (v ? new Date(v).toLocaleString("ru-RU") : "—") }
  ]

  const columnsDeleted = [
    ...leftCols,
    {
      title: "Детали", dataIndex: "old_value", width: 820,
      render: (v) => {
        const text = formatValue(v)
        return (
          <Space size={6} align="start">
            <div style={cellWrap}>{text}</div>
            {text !== "—" && <Tooltip title="Скопировать"><Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copyText(text)} /></Tooltip>}
          </Space>
        )
      }
    },
    { title: "Комментарий", dataIndex: "comment", width: 260, render: (v) => <div style={cellWrap}>{v || "—"}</div> },
    { title: "Пользователь", dataIndex: "user_name", width: 170, render: (v, r) => v || r.user_id || "—" },
    { title: "Дата", dataIndex: "created_at", width: 170, render: (v) => (v ? new Date(v).toLocaleString("ru-RU") : "—") }
  ]

  const Controls = (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 12 }}>
      <Space wrap>
        <Checkbox checked={actionFilter.create} onChange={(e) => setActionFilter((s) => ({ ...s, create: e.target.checked }))}>create</Checkbox>
        <Checkbox checked={actionFilter.update} onChange={(e) => setActionFilter((s) => ({ ...s, update: e.target.checked }))}>update</Checkbox>
        <Checkbox checked={actionFilter.delete} onChange={(e) => setActionFilter((s) => ({ ...s, delete: e.target.checked }))}>delete</Checkbox>
      </Space>
      <Space><Button icon={<DownloadOutlined />} onClick={exportCSV}>Скачать CSV</Button></Space>
    </div>
  )

  return (
    <Modal
      open={onlyDeleted || !!entityId}
      onCancel={onClose}
      onOk={onClose}
      width={1280}
      title={onlyDeleted ? "Удалённые записи" : "История изменений"}
      okText="Закрыть"
      cancelButtonProps={{ style: { display: "none" } }}
      styles={{ body: { paddingTop: 12, maxHeight: "72vh", overflow: "hidden" } }} // вместо bodyStyle
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}><Spin /></div>
      ) : rows.length === 0 ? (
        <Empty description={onlyDeleted ? "Удалённых записей не найдено" : "Изменений не найдено"} style={{ padding: "2rem" }} />
      ) : (
        <>
          {!onlyDeleted && Controls}
          <Table
            dataSource={rows}
            columns={onlyDeleted ? columnsDeleted : columnsFull}
            rowKey={(row, i) =>
              row.id || `${row.entity_type}-${row.entity_id}-${row.action}-${row.field_changed || "action"}-${row.created_at || i}`
            }
            size="small"
            pagination={false}
            bordered
            tableLayout="fixed"
            sticky
            scroll={{ x: onlyDeleted ? 1500 : 1700, y: "60vh" }}
          />
        </>
      )}
    </Modal>
  )
}
