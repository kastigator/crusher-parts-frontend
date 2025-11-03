// src/components/supplierParts/SupplierPartsTable.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Table, Empty, message, Input, Tag, Tooltip } from "antd"
import axios from "@/api/axiosInstance"

import ValueDisplay from "@/components/common/ValueDisplay"
import ActionButtons from "@/components/common/ActionButtons"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import confirmAction from "@/utils/confirmAction"

import SupplierPartDock from "./SupplierPartDock"

export default function SupplierPartsTable({ supplierId, search, version, onReload }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

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

  const load = useCallback(async () => {
    if (!supplierId) { setRows([]); setTotal(0); return }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const params = { supplier_id: supplierId, page, page_size: pageSize }
      if (search?.trim()) params.q = search.trim()
      const { data } = await axios.get("/supplier-parts", { params, signal: controller.signal })
      setRows(Array.isArray(data?.items) ? data.items : [])
      setTotal(Number(data?.total || 0))
    } catch (e) {
      if (e?.name !== "AbortError" && e?.code !== "ERR_CANCELED") {
        console.error(e)
        message.error("Не удалось загрузить детали поставщика")
      }
    } finally {
      setLoading(false)
    }
  }, [supplierId, search, page, pageSize])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => { clearTimeout(t); abortRef.current?.abort() }
  }, [load, version])

  useEffect(() => { setPage(1) }, [supplierId, search])

  // ===== редактирование =====
  const isEditingCell = (record, field) =>
    editing && editing.id === record.id && editing.field === field

  const startEditCell = (record, field) => {
    setEditing({ id: record.id, field })
    setDraft({ ...record })
  }

  const cancelEdit = () => { setEditing(null); setDraft(null) }

  const norm = (v) => (v === "" || v === undefined) ? null : (typeof v === "string" ? v.trim() : v)

  const saveField = async (record, field, rawValue) => {
    const value = norm(rawValue)
    const current = norm(record[field])
    if (value === current) { cancelEdit(); return }

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
        onChange={(e) => setDraft((p) => ({ ...p, [field]: e.target.value }))}
        onBlur={() => saveField(record, field, draft?.[field] ?? "")}
        onKeyDown={(e) => e.key === "Escape" && cancelEdit()}
        autoSize={{ minRows: 2, maxRows: 6 }}
        autoFocus
      />
    ) : (
      <Input
        value={draft?.[field] ?? ""}
        onChange={(e) => setDraft((p) => ({ ...p, [field]: e.target.value }))}
        onPressEnter={() => saveField(record, field, draft?.[field] ?? "")}
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
      if (onReload) onReload(); else load()
    } catch (err) {
      console.error(err)
      message.error("Не удалось удалить деталь")
    }
  }

  // ===== колонки =====
  const columns = useMemo(() => [
    {
      title: "Номер у поставщика",
      dataIndex: "supplier_part_number",
      width: 220,
      onCell: (record) => ({ onDoubleClick: () => startEditCell(record, "supplier_part_number") }),
      render: (_, record) =>
        isEditingCell(record, "supplier_part_number")
          ? renderTextInput(record, "supplier_part_number")
          : <ValueDisplay value={record.supplier_part_number} copyable />,
    },
    {
      title: "Описание",
      dataIndex: "description",
      onCell: (record) => ({ onDoubleClick: () => startEditCell(record, "description") }),
      render: (_, record) =>
        isEditingCell(record, "description")
          ? renderTextInput(record, "description", { multiline: true })
          : <ValueDisplay value={record.description} />,
    },
    {
      title: "Привязки",
      dataIndex: "original_cat_numbers",
      width: 260,
      render: (v) => {
        if (!v) return <Tag>нет</Tag>
        const list = String(v).split(',').filter(Boolean)
        const shown = list.slice(0, 3)
        const extra = list.length - shown.length
        return (
          <span>
            {shown.map((c) => (
              <Tag key={c}>{c}</Tag>
            ))}
            {extra > 0 && (
              <Tooltip title={list.join(', ')}>
                <Tag>+{extra}</Tag>
              </Tooltip>
            )}
          </span>
        )
      }
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
      render: (v) => <ValueDisplay value={v && new Date(v).toLocaleDateString()} />,
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
  ], [editing, draft])

  // ===== пагинация =====
  const pagination = useMemo(() => ({
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
      if (sizeNum !== pageSize) { setPage(1); setPageSize(sizeNum) }
      else { setPage(nextPage) }
    },
    showTotal: (t, [from, to]) => `Всего: ${t} · Показано: ${from}–${to}`,
  }), [page, pageSize, total])

  // ===== раскрытые строки =====
  const expandedRowRender = (record) => (
    <div className="subtable-shell">
      <SupplierPartDock supplierPart={record} />
    </div>
  )

  if (!supplierId) return <Empty description="Выберите поставщика, чтобы увидеть его детали" />

  return (
    <>
      <div ref={wrapRef} className="parts-table-wrap">
        <Table
          rowKey="id"
          className="op-table parts-table"
          dataSource={rows}
          columns={columns}
          loading={loading}
          expandable={{ expandedRowRender }}
          pagination={pagination}
          size="middle"
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
