import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Table, Empty, message, Tag, Input, Tooltip, Checkbox } from "antd"
import axios from "@/api/axiosInstance"

import ValueDisplay from "@/components/common/ValueDisplay"
import ActionButtons from "@/components/common/ActionButtons"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import confirmAction from "@/utils/confirmAction"
import SupplierPartDock from "./SupplierPartDock"
import useTableScrollHints from "@/utils/useTableScrollHints"

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
    tooltipContent = "Загрузка..."
  } else if (error) {
    tooltipContent = error
  } else if (items && items.length) {
    tooltipContent = (
      <div style={{ maxWidth: 420 }}>
        {items.map((o) => (
          <div key={o.id} style={{ marginBottom: 8 }}>
            <div>
              <b>{o.cat_number}</b> {o.description_ru || o.description_en || ""}
            </div>
            <div style={{ fontSize: 12, color: "#888" }}>
              {o.manufacturer_name} {o.model_name}
            </div>
          </div>
        ))}
      </div>
    )
  } else {
    tooltipContent = "Привязок не найдено"
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


export default function SupplierPartsTable({
  supplierId,
  search,
  version,
  onReload,
  expandedId = null,
  onExpandChange = () => {},
  showAll = false,
}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [historyForId, setHistoryForId] = useState(null)

  const abortRef = useRef(null)
  const wrapRef = useRef(null)
  const scrollHints = useTableScrollHints(wrapRef, [rows, loading, page, pageSize, showAll])

  const load = useCallback(async () => {
    if (!supplierId && !showAll) {
      setRows([])
      setTotal(0)
      return
    }

    try {
      abortRef.current?.abort()
    } catch {}
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    try {
      const params = {
        page_size: pageSize,
        page,
      }
      if (supplierId) params.supplier_id = supplierId
      if (search) params.q = search
      if (showAll) params.all = 1

      const { data } = await axios.get("/supplier-parts", {
        params,
        signal: controller.signal,
      })

      const pickList = (payload) => {
        if (Array.isArray(payload)) return payload
        if (!payload || typeof payload !== "object") return []
        const candidates = [
          payload.rows,
          payload.data,
          payload.items,
          payload.list,
          payload.results,
          payload.records,
        ]
        for (const c of candidates) {
          if (Array.isArray(c)) return c
        }
        return []
      }

      let list = pickList(data)
      if (!list.length && data?.data) {
        list = pickList(data.data)
      }

      const totalCount =
        data?.total !== undefined
          ? Number(data.total)
          : data?.data?.total !== undefined
            ? Number(data.data.total)
            : Array.isArray(list)
              ? list.length
              : 0

      setRows(list)
      setTotal(totalCount)
    } catch (e) {
      if (
        e?.name === "AbortError" ||
        e?.name === "CanceledError" ||
        e?.code === "ERR_CANCELED"
      ) {
        return
      }
      console.error(e)
      message.error("Не удалось загрузить детали поставщиков")
    } finally {
      setLoading(false)
    }
  }, [supplierId, showAll, search, page, pageSize])

  useEffect(() => {
    setPage(1)
  }, [search, supplierId, showAll])

  useEffect(() => {
    load()
    return () => {
      try {
        abortRef.current?.abort()
      } catch {}
    }
  }, [load, version, page, pageSize])

  const startEditCell = (record, field) => {
    if (editing && editing.id !== record.id) {
      message.warning("Сначала сохраните или отмените текущие изменения")
      return
    }
    setEditing({ id: record.id, field })
    setDraft((prev) => (prev && prev.id === record.id ? prev : { ...record }))
  }

  const cancelEdit = () => {
    setEditing(null)
    setDraft(null)
  }

  const isEditingCell = (record, field) =>
    editing && editing.id === record.id && editing.field === field

  const handleSave = async () => {
    if (!draft?.id) return
    const payload = { ...draft }
    try {
      const { data } = await axios.put(`/supplier-parts/${draft.id}`, payload)
      setRows((prev) => prev.map((r) => (r.id === draft.id ? data : r)))
      cancelEdit()
      message.success("Деталь обновлена")
      onReload?.()
    } catch (e) {
      if (e?.response?.status === 409) {
        message.error("Конфликт версии, обновите список")
        await load()
      } else {
        message.error("Не удалось обновить деталь")
      }
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      e.preventDefault()
      cancelEdit()
    }
  }

  const handleDelete = async (id) => {
    const { confirmed } = await confirmAction("Удалить деталь?")
    if (!confirmed) return
    try {
      await axios.delete(`/supplier-parts/${id}`)
      setRows((prev) => prev.filter((r) => r.id !== id))
      setTotal((t) => Math.max(0, t - 1))
      message.success("Деталь удалена")
      onReload?.()
    } catch (e) {
      message.error("Не удалось удалить деталь")
    }
  }

  const renderTextInput = (record, field) => (
    <Input
      value={draft?.[field] ?? ""}
      onChange={(e) =>
        setDraft((prev) => ({ ...(prev || {}), [field]: e.target.value }))
      }
      onKeyDown={handleKeyDown}
      autoFocus
      size="small"
    />
  )

  const renderBoolCell = (record, field) => {
    if (isEditingCell(record, field)) {
      return (
        <Checkbox
          checked={!!draft?.[field]}
          onChange={(e) =>
            setDraft((prev) => ({ ...(prev || {}), [field]: e.target.checked ? 1 : 0 }))
          }
          onKeyDown={handleKeyDown}
        />
      )
    }
    return <Tag color={record?.[field] ? "green" : "default"}>{record?.[field] ? "да" : "нет"}</Tag>
  }

  const renderOemCell = (record) => {
    const type = String(record?.part_type || "").toUpperCase()
    const isOem = type === "OEM"
    const isAnalog = type === "ANALOG"
    if (isEditingCell(record, "part_type")) {
      return (
        <Checkbox
          checked={isOem}
          onChange={(e) =>
            setDraft((prev) => ({
              ...(prev || {}),
              part_type: e.target.checked ? "OEM" : "ANALOG",
            }))
          }
          onKeyDown={handleKeyDown}
        >
          OEM
        </Checkbox>
      )
    }
    if (isOem) return <Tag color="blue">OEM</Tag>
    if (isAnalog) return <Tag>Аналог</Tag>
    return <Tag>—</Tag>
  }

  const columns = useMemo(() => {
    const cols = []

    if (showAll) {
      cols.push({
        title: "Поставщик",
        dataIndex: "supplier_name",
        width: 180,
        fixed: "left",
        ellipsis: true,
        render: (v) => <ValueDisplay value={v} />,
      })
    }

    cols.push({
      title: "Номер у поставщика",
      dataIndex: "supplier_part_number",
      width: 160,
      fixed: "left",
      ellipsis: true,
      onCell: (record) => ({
        onDoubleClick: () => {
          if (isEditingCell(record, "supplier_part_number")) return
          startEditCell(record, "supplier_part_number")
        },
      }),
      render: (value, record) => {
        if (isEditingCell(record, "supplier_part_number"))
          return renderTextInput(record, "supplier_part_number")
        return <ValueDisplay value={value} />
      },
    })

    cols.push({
      title: "Описание (RU)",
      dataIndex: "description_ru",
      width: 220,
      ellipsis: true,
      onCell: (record) => ({
        onDoubleClick: () => {
          if (isEditingCell(record, "description_ru")) return
          startEditCell(record, "description_ru")
        },
      }),
      render: (value, record) => {
        if (isEditingCell(record, "description_ru"))
          return renderTextInput(record, "description_ru")
        return <ValueDisplay value={value} />
      },
    })

    cols.push({
      title: "Описание (EN)",
      dataIndex: "description_en",
      width: 220,
      ellipsis: true,
      onCell: (record) => ({
        onDoubleClick: () => {
          if (isEditingCell(record, "description_en")) return
          startEditCell(record, "description_en")
        },
      }),
      render: (value, record) => {
        if (isEditingCell(record, "description_en"))
          return renderTextInput(record, "description_en")
        return <ValueDisplay value={value} />
      },
    })

    cols.push({
      title: "Комментарий",
      dataIndex: "comment",
      width: 200,
      ellipsis: true,
      onCell: (record) => ({
        onDoubleClick: () => {
          if (isEditingCell(record, "comment")) return
          startEditCell(record, "comment")
        },
      }),
      render: (value, record) => {
        if (isEditingCell(record, "comment"))
          return renderTextInput(record, "comment")
        return <ValueDisplay value={value} />
      },
    })

    cols.push({
      title: "OEM",
      dataIndex: "part_type",
      width: 110,
      onCell: (record) => ({
        onDoubleClick: () => {
          if (isEditingCell(record, "part_type")) return
          startEditCell(record, "part_type")
        },
      }),
      render: (_, record) => renderOemCell(record),
    })

    cols.push({
      title: "Вес, кг",
      dataIndex: "weight_kg",
      width: 110,
      align: "right",
      onCell: (record) => ({
        onDoubleClick: () => {
          if (isEditingCell(record, "weight_kg")) return
          startEditCell(record, "weight_kg")
        },
      }),
      render: (value, record) =>
        isEditingCell(record, "weight_kg")
          ? renderTextInput(record, "weight_kg")
          : <ValueDisplay value={value} />,
    })

    cols.push({
      title: "Дл., см",
      dataIndex: "length_cm",
      width: 100,
      align: "right",
      onCell: (record) => ({
        onDoubleClick: () => {
          if (isEditingCell(record, "length_cm")) return
          startEditCell(record, "length_cm")
        },
      }),
      render: (value, record) =>
        isEditingCell(record, "length_cm")
          ? renderTextInput(record, "length_cm")
          : <ValueDisplay value={value} />,
    })

    cols.push({
      title: "Шир., см",
      dataIndex: "width_cm",
      width: 100,
      align: "right",
      onCell: (record) => ({
        onDoubleClick: () => {
          if (isEditingCell(record, "width_cm")) return
          startEditCell(record, "width_cm")
        },
      }),
      render: (value, record) =>
        isEditingCell(record, "width_cm")
          ? renderTextInput(record, "width_cm")
          : <ValueDisplay value={value} />,
    })

    cols.push({
      title: "Выс., см",
      dataIndex: "height_cm",
      width: 100,
      align: "right",
      onCell: (record) => ({
        onDoubleClick: () => {
          if (isEditingCell(record, "height_cm")) return
          startEditCell(record, "height_cm")
        },
      }),
      render: (value, record) =>
        isEditingCell(record, "height_cm")
          ? renderTextInput(record, "height_cm")
          : <ValueDisplay value={value} />,
    })

    cols.push({
      title: "Негабарит",
      dataIndex: "is_oversize",
      width: 110,
      onCell: (record) => ({
        onDoubleClick: () => {
          if (isEditingCell(record, "is_oversize")) return
          startEditCell(record, "is_oversize")
        },
      }),
      render: (_, record) => renderBoolCell(record, "is_oversize"),
    })

    cols.push({
      title: "Тяжелая",
      dataIndex: "is_overweight",
      width: 120,
      onCell: (record) => ({
        onDoubleClick: () => {
          if (isEditingCell(record, "is_overweight")) return
          startEditCell(record, "is_overweight")
        },
      }),
      render: (_, record) => renderBoolCell(record, "is_overweight"),
    })

    cols.push({
      title: "Материалы",
      dataIndex: "default_material_name",
      width: 180,
      render: (_, record) => {
        const cnt = record.materials_count || 0
        if (record.default_material_name) {
          return <Tag color="blue">{record.default_material_name}</Tag>
        }
        if (cnt > 0) {
          return <Tag>{cnt}</Tag>
        }
        return <span style={{ color: "#9ca3af" }}>—</span>
      },
    })

    cols.push({
      title: "Срок поставки, дн",
      dataIndex: "lead_time_days",
      width: 130,
      align: "right",
      onCell: (record) => ({
        onDoubleClick: () => {
          if (isEditingCell(record, "lead_time_days")) return
          startEditCell(record, "lead_time_days")
        },
      }),
      render: (_, record) =>
        isEditingCell(record, "lead_time_days") ? (
          renderTextInput(record, "lead_time_days")
        ) : (
          <ValueDisplay value={record.lead_time_days} />
        ),
    })

    cols.push({
      title: "MOQ",
      dataIndex: "min_order_qty",
      width: 90,
      align: "right",
      onCell: (record) => ({
        onDoubleClick: () => {
          if (isEditingCell(record, "min_order_qty")) return
          startEditCell(record, "min_order_qty")
        },
      }),
      render: (value, record) =>
        isEditingCell(record, "min_order_qty")
          ? renderTextInput(record, "min_order_qty")
          : <ValueDisplay value={value} />,
    })

    cols.push({
      title: "Упаковка",
      dataIndex: "packaging",
      width: 140,
      ellipsis: true,
      onCell: (record) => ({
        onDoubleClick: () => {
          if (isEditingCell(record, "packaging")) return
          startEditCell(record, "packaging")
        },
      }),
      render: (value, record) =>
        isEditingCell(record, "packaging")
          ? renderTextInput(record, "packaging")
          : <ValueDisplay value={value} />,
    })

    cols.push({
      title: "Привязки",
      dataIndex: "id",
      width: 160,
      render: (_, row) => <OriginalsCell row={row} />,
    })

    cols.push({
      title: "Действия",
      key: "actions",
      width: 180,
      render: (_, row) => {
        const isRowEditing = editing?.id === row.id
        return (
          <ActionButtons
            onEdit={!isRowEditing ? () => startEditCell(row, "supplier_part_number") : undefined}
            onSave={isRowEditing ? handleSave : undefined}
            onCancel={isRowEditing ? cancelEdit : undefined}
            onHistory={!isRowEditing ? () => setHistoryForId(row.id) : undefined}
            onDelete={!isRowEditing ? () => handleDelete(row.id) : undefined}
            disabledEdit={!!editing && !isRowEditing}
            disabledDelete={!!editing && !isRowEditing}
            size="small"
          />
        )
      },
    })

    return cols
  }, [editing, draft, showAll])

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
      showTotal: (t, [from, to]) => `Всего: ${t} · Показано: ${from}-${to}`,
    }),
    [page, pageSize, total]
  )

  if (!supplierId && !showAll)
    return (
      <Empty description="Выберите поставщика или включите режим «Показать все детали»" />
    )

  return (
    <>
      <div
        ref={wrapRef}
        className={`parts-table-wrap op-table-wrap${scrollHints.left ? " scroll-left" : ""}${
          scrollHints.right ? " scroll-right" : ""
        }`}
      >
        <Table
          rowKey="id"
          className="op-table parts-table"
          dataSource={rows}
          columns={columns}
          loading={loading}
          pagination={pagination}
          size="middle"
          tableLayout="fixed"
          scroll={{ x: "max-content" }}
          expandable={{
            expandedRowKeys: expandedId ? [expandedId] : [],
            onExpand: (expanded, record) =>
              onExpandChange(expanded ? record.id : null),
            expandedRowRender: (record) => (
              <div className="subtable-shell parts-table-wrap table-section">
                <SupplierPartDock
                  part={record}
                  onChanged={() => onReload?.()}
                />
              </div>
            ),
          }}
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
