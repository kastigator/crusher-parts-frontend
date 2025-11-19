// src/components/supplierParts/SupplierPartsTable.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Table, Empty, message, Tag, Input, Tooltip } from "antd"
import axios from "@/api/axiosInstance"

import ValueDisplay from "@/components/common/ValueDisplay"
import ActionButtons from "@/components/common/ActionButtons"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import confirmAction from "@/utils/confirmAction"

// ===== ячейка "Привязки" с тегами + Tooltip =====
function OriginalsCell({ row }) {
  const [items, setItems] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const cats = row.original_cat_numbers
    ? String(row.original_cat_numbers)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  // нет привязок — показываем "нет"
  if (!cats.length) {
    return <Tag color="default">нет</Tag>
  }

  const loadOriginals = async () => {
    if (items !== null || loading) return
    try {
      setLoading(true)
      setError(null)
      const { data } = await axios.get(`/supplier-parts/${row.id}/originals`)
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      setError("Не удалось загрузить привязки")
      message.error("Не удалось загрузить привязки к оригиналам")
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (open) => {
    if (open) loadOriginals()
  }

  let tooltipContent = null
  if (loading && items === null) {
    tooltipContent = "Загрузка…"
  } else if (error) {
    tooltipContent = error
  } else if (items && items.length) {
    tooltipContent = (
      <div style={{ maxWidth: 420 }}>
        {items.map((o) => (
          <div key={o.id} style={{ marginBottom: 8 }}>
            <div>
              <b>{o.cat_number}</b>{" "}
              {o.description_ru || o.description_en || ""}
            </div>
            <div style={{ fontSize: 12, color: "#888" }}>
              {o.manufacturer_name} {o.model_name}
            </div>
          </div>
        ))}
      </div>
    )
  } else {
    tooltipContent = "Привязки не найдены"
  }

  return (
    <Tooltip
      title={tooltipContent}
      placement="right"
      onOpenChange={handleOpenChange}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {cats.slice(0, 2).map((cat) => (
          <Tag key={cat}>{cat}</Tag>
        ))}
        {cats.length > 2 && <Tag>+{cats.length - 2}</Tag>}
      </div>
    </Tooltip>
  )
}

// ===== ячейка "Комплекты" с Tooltip =====
function BundlesCell({ partId, count }) {
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (!count || count <= 0) {
    return <span style={{ color: "#999" }}>—</span>
  }

  const loadDetails = async () => {
    if (details !== null || loading) return
    try {
      setLoading(true)
      setError(null)
      const { data } = await axios.get("/supplier-bundles/usage/detail", {
        params: { supplier_part_id: partId },
      })
      setDetails(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      setError("Не удалось загрузить участие в комплектах")
      setDetails([])
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (open) => {
    if (open) loadDetails()
  }

  let content = null
  if (loading && details === null) {
    content = "Загрузка…"
  } else if (error) {
    content = error
  } else if (details && details.length) {
    content = (
      <div style={{ maxWidth: 420 }}>
        {details.map((d, idx) => (
          <div key={`${d.bundle_id}-${idx}`} style={{ marginBottom: 8 }}>
            <div>
              <b>
                Комплект #{d.bundle_id}
                {d.title ? `: ${d.title}` : ""}
              </b>
            </div>
            <div style={{ fontSize: 12 }}>
              Роль: {d.role_label} · Кол-во: {d.qty}
            </div>
            <div style={{ fontSize: 12, color: "#888" }}>
              Оригинал: {d.original_cat_number} · {d.manufacturer_name}{" "}
              {d.model_name}
            </div>
          </div>
        ))}
      </div>
    )
  } else {
    content = "Информация по комплектам не найдена"
  }

  return (
    <Tooltip
      title={content}
      placement="right"
      onOpenChange={handleOpenChange}
    >
      <Tag color="purple">Входит: {count}</Tag>
    </Tooltip>
  )
}

export default function SupplierPartsTable({
  supplierId,
  search,
  version,
  onReload,
  selectedId = null,
  onSelectPart = () => {},
}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  // доп. инфо: в скольких комплектах участвует деталь поставщика
  const [usageCounts, setUsageCounts] = useState({}) // { [supplier_part_id]: number }

  // редактирование
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(null)

  // пагинация
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)

  // история
  const [historyForId, setHistoryForId] = useState(null)

  const abortRef = useRef(null)
  const wrapRef = useRef(null)

  const load = useCallback(
    async () => {
      if (!supplierId) {
        setRows([])
        setTotal(0)
        setUsageCounts({})
        return
      }
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      try {
        const params = { supplier_id: supplierId, page, page_size: pageSize }
        if (search?.trim()) params.q = search.trim()
        const { data } = await axios.get("/supplier-parts", {
          params,
          signal: controller.signal,
        })
        const items = Array.isArray(data?.items) ? data.items : []
        setRows(items)
        setTotal(Number(data?.total || 0))

        // участие в комплектах
        try {
          const ids = items.map((r) => r.id)
          if (ids.length) {
            const { data: usage } = await axios.get(
              "/supplier-bundles/usage",
              {
                params: { part_ids: ids.join(",") },
                signal: controller.signal,
              }
            )
            if (Array.isArray(usage)) {
              const map = {}
              for (const u of usage) {
                if (u && u.supplier_part_id != null) {
                  map[u.supplier_part_id] = Number(u.uses || 0)
                }
              }
              setUsageCounts(map)
            } else {
              setUsageCounts({})
            }
          } else {
            setUsageCounts({})
          }
        } catch (e) {
          console.error(e)
          setUsageCounts({})
        }
      } catch (e) {
        const name = e?.name || e?.code
        if (name !== "AbortError" && name !== "ERR_CANCELED") {
          console.error(e)
          message.error("Не удалось загрузить детали поставщика")
        }
      } finally {
        setLoading(false)
      }
    },
    [supplierId, search, page, pageSize]
  )

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => {
      clearTimeout(t)
      abortRef.current?.abort()
    }
  }, [load, version])

  useEffect(() => {
    setPage(1)
  }, [supplierId, search])

  // ===== редактирование =====
  const isEditingCell = (record, field) =>
    editing && editing.id === record.id && editing.field === field

  const startEditCell = (record, field) => {
    setEditing({ id: record.id, field })
    setDraft({ ...record })
  }

  const cancelEdit = () => {
    setEditing(null)
    setDraft(null)
  }

  const norm = (v) =>
    v === "" || v === undefined ? null : typeof v === "string" ? v.trim() : v

  const saveField = async (record, field, rawValue) => {
    const value = norm(rawValue)
    const current = norm(record[field])
    if (value === current) {
      cancelEdit()
      return
    }

    try {
      await axios.put(`/supplier-parts/${record.id}`, { [field]: value })
      message.success("Сохранено")
      cancelEdit()
      await load()
    } catch (err) {
      console.error(err)
      message.error(err?.response?.data?.message || "Не удалось сохранить")
      cancelEdit()
    }
  }

  const renderTextInput = (record, field, { multiline = false } = {}) =>
    multiline ? (
      <Input.TextArea
        rows={3}
        value={draft?.[field] ?? ""}
        onChange={(e) =>
          setDraft((p) => ({ ...p, [field]: e.target.value }))
        }
        onBlur={() => saveField(record, field, draft?.[field] ?? "")}
        onKeyDown={(e) => e.key === "Escape" && cancelEdit()}
        autoSize={{ minRows: 2, maxRows: 6 }}
        autoFocus
      />
    ) : (
      <Input
        value={draft?.[field] ?? ""}
        onChange={(e) =>
          setDraft((p) => ({ ...p, [field]: e.target.value }))
        }
        onPressEnter={() =>
          saveField(record, field, draft?.[field] ?? "")
        }
        onBlur={() => saveField(record, field, draft?.[field] ?? "")}
        onKeyDown={(e) => e.key === "Escape" && cancelEdit()}
        autoFocus
      />
    )

  // ===== удаление =====
  const handleDelete = async (id) => {
    const { confirmed } = await confirmAction("Удалить деталь поставщика?")
    if (!confirmed) return
    try {
      await axios.delete(`/supplier-parts/${id}`)
      message.success("Удалено")
      if (onReload) onReload()
      else load()
    } catch (err) {
      console.error(err)
      message.error("Не удалось удалить деталь")
    }
  }

  // ===== колонки =====
  const columns = useMemo(
    () => [
      {
        title: "Номер у поставщика",
        dataIndex: "supplier_part_number",
        width: 220,
        onCell: (record) => ({
          onDoubleClick: () =>
            startEditCell(record, "supplier_part_number"),
        }),
        render: (_, record) =>
          isEditingCell(record, "supplier_part_number") ? (
            renderTextInput(record, "supplier_part_number")
          ) : (
            <ValueDisplay value={record.supplier_part_number} copyable />
          ),
      },
      {
        title: "Описание",
        dataIndex: "description",
        onCell: (record) => ({
          onDoubleClick: () => startEditCell(record, "description"),
        }),
        render: (_, record) =>
          isEditingCell(record, "description") ? (
            renderTextInput(record, "description", { multiline: true })
          ) : (
            <ValueDisplay value={record.description} />
          ),
      },
      {
        title: "Комментарий",
        dataIndex: "comment",
        width: 260,
        onCell: (record) => ({
          onDoubleClick: () => startEditCell(record, "comment"),
        }),
        render: (_, record) =>
          isEditingCell(record, "comment") ? (
            renderTextInput(record, "comment", { multiline: true })
          ) : (
            <ValueDisplay value={record.comment} />
          ),
      },
      {
        title: "Срок поставки, дн",
        dataIndex: "lead_time_days",
        width: 150,
        align: "right",
        onCell: (record) => ({
          onDoubleClick: () => startEditCell(record, "lead_time_days"),
        }),
        render: (_, record) =>
          isEditingCell(record, "lead_time_days") ? (
            renderTextInput(record, "lead_time_days")
          ) : (
            <ValueDisplay value={record.lead_time_days} />
          ),
      },
      {
        title: "Привязки",
        dataIndex: "id",
        width: 200,
        render: (_, row) => <OriginalsCell row={row} />,
      },
      {
        title: "Комплекты",
        dataIndex: "id",
        width: 160,
        render: (_, row) => {
          const n = usageCounts?.[row.id] ?? 0
          return <BundlesCell partId={row.id} count={n} />
        },
      },
      {
        title: "Последняя цена",
        dataIndex: "latest_price",
        width: 140,
        align: "right",
        render: (v) => <ValueDisplay value={v} />,
      },
      {
        title: "Дата цены",
        dataIndex: "latest_price_date",
        width: 160,
        render: (v) => (
          <ValueDisplay
            value={v && new Date(v).toLocaleDateString()}
          />
        ),
      },
      {
        title: "Действия",
        key: "actions",
        width: 120,
        render: (_, row) => (
          <ActionButtons
            onHistory={() => setHistoryForId(row.id)}
            onDelete={() => handleDelete(row.id)}
            size="small"
          />
        ),
      },
    ],
    [editing, draft, usageCounts, selectedId]
  )

  // ===== пагинация =====
  const pagination = useMemo(
    () => ({
      current: page,
      pageSize,
      total,
      showSizeChanger: true,
      pageSizeOptions: [10, 20, 50, 100],
      selectProps: {
        getPopupContainer: () => wrapRef.current || document.body,
      },
      onChange: (nextPage, nextSize) => {
        const sizeNum = Number(nextSize)
        if (sizeNum !== pageSize) {
          setPage(1)
          setPageSize(sizeNum)
        } else {
          setPage(nextPage)
        }
      },
      showTotal: (t, [from, to]) => `Всего: ${t} · Показано: ${from}–${to}`,
    }),
    [page, pageSize, total]
  )

  if (!supplierId)
    return (
      <Empty description="Выберите поставщика, чтобы увидеть его детали" />
    )

  return (
    <>
      <div ref={wrapRef} className="parts-table-wrap">
        <Table
          rowKey="id"
          className="op-table parts-table"
          dataSource={rows}
          columns={columns}
          loading={loading}
          pagination={pagination}
          size="middle"
          rowClassName={(r) =>
            r.id === selectedId ? "ant-table-row-selected" : ""
          }
          onRow={(record) => ({
            onClick: () => onSelectPart(record),
            onDoubleClick: () => onSelectPart(record),
          })}
        />
      </div>

      {historyForId && (
        <FullHistoryDialog
          entityType="supplier_parts"
          entityId={historyForId}
          onClose={() => setHistoryForId(null)}
        />
      )}
    </>
  )
}
