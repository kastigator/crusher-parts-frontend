import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Empty, message, Tag, Tooltip } from "antd"
import axios from "@/api/axiosInstance"

import ValueDisplay from "@/components/common/ValueDisplay"
import ActionButtons from "@/components/common/ActionButtons"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import DraggableColumnsTable from "@/components/common/DraggableColumnsTable"
import { getOrderedKeys } from "@/utils/columnOrder"
import { runTrashDeleteFlow } from "@/utils/trashUi"
import useTableScrollHints from "@/utils/useTableScrollHints"
import { formatPrice } from "@/utils/priceFormat"
import { formatUomLabel } from "@/utils/uom"

function CatalogLinksCell({ row }) {
  const [items, setItems] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const cats = row.catalog_position_numbers
    ? String(row.catalog_position_numbers)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  if (!cats.length) {
    return <Tag color="default">нет</Tag>
  }

  const loadCatalogLinks = async () => {
    if (items !== null || loading) return
    try {
      setLoading(true)
      setError(null)
      const { data } = await axios.get(`/supplier-parts/${row.id}/catalog-positions`)
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      setError("Не удалось загрузить связи с каталогом")
      message.error("Не удалось загрузить связи с каталогом")
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (open) => {
    if (open) loadCatalogLinks()
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
    tooltipContent = "Связей с каталогом не найдено"
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
  filters,
  version,
  onReload,
  showAll = false,
  onOpenDetail,
  onEditRecord,
  highlightRowId = null,
  onFlashRow: _onFlashRow,
  visibleColumnKeys = null,
  onVisibleColumnKeysChange: _onVisibleColumnKeysChange = null,
  onColumnsMeta = null,
  columnOrderKeys = null,
  onColumnOrderKeysChange = null,
  columnWidths = null,
  onColumnWidthsChange = null,
}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
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
    } catch {
      // ignore abort errors
    }
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

      const f = filters || {}
      if (f.part_type) params.part_type = f.part_type
      if (f.originals_mode && f.originals_mode !== "any") params.catalog_links_mode = f.originals_mode
      if (f.is_overweight) params.is_overweight = 1
      if (f.is_oversize) params.is_oversize = 1
      if (f.weight_min != null) params.weight_min = f.weight_min
      if (f.weight_max != null) params.weight_max = f.weight_max
      if (f.lead_time_min != null) params.lead_time_min = f.lead_time_min
      if (f.lead_time_max != null) params.lead_time_max = f.lead_time_max
      if (f.moq_min != null) params.moq_min = f.moq_min
      if (f.moq_max != null) params.moq_max = f.moq_max
      if (f.length_min != null) params.length_min = f.length_min
      if (f.length_max != null) params.length_max = f.length_max
      if (f.width_min != null) params.width_min = f.width_min
      if (f.width_max != null) params.width_max = f.width_max
      if (f.height_min != null) params.height_min = f.height_min
      if (f.height_max != null) params.height_max = f.height_max
      if (f.material_id) params.material_id = f.material_id
      if (f.material_mode) params.material_mode = f.material_mode

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
  }, [supplierId, showAll, search, page, pageSize, filters])

  useEffect(() => {
    setPage(1)
  }, [search, supplierId, showAll, filters])

  useEffect(() => {
    load()
    return () => {
      try {
        abortRef.current?.abort()
      } catch {
        // ignore abort errors
      }
    }
  }, [load, version, page, pageSize])

  const handleDelete = useCallback(async (id) => {
    try {
      const result = await runTrashDeleteFlow({
        entityType: "supplier_parts",
        entityId: id,
        deleteUrl: `/supplier-parts/${id}`,
        successMessage: "Деталь поставщика перемещена в корзину",
      })
      if (result?.deleted) {
        setRows((prev) => prev.filter((r) => r.id !== id))
        setTotal((t) => Math.max(0, t - 1))
        onReload?.()
      }
    } catch (_e) {
      message.error("Не удалось удалить деталь")
    }
  }, [onReload])

  const renderOemCell = (record) => {
    const type = String(record?.part_type || "").toUpperCase()
    if (type === "OEM") return <Tag color="blue">OEM</Tag>
    if (type === "ANALOG") return <Tag>Аналог</Tag>
    return <Tag>—</Tag>
  }

  const renderBoolTag = (v) => (
    <Tag color={v ? "green" : "default"}>{v ? "да" : "нет"}</Tag>
  )
  const renderUomTag = (raw) => {
    return <Tag>{formatUomLabel(raw) || "шт"}</Tag>
  }

  const renderPriceSource = useCallback((raw) => {
    const s = String(raw || "").trim().toUpperCase()
    if (!s) return ""
    const map = {
      RFQ: "RFQ",
      RFQ_RESPONSE: "Ответ RFQ",
      PRICE_LIST: "Прайс-лист",
      NEGOTIATION: "Переговоры",
      MANUAL: "Вручную",
      OTHER: "Другое",
    }
    return map[s] || String(raw)
  }, [])

  const renderPriceSourceDetails = useCallback((record) => {
    const sourceType = String(record?.latest_price_source_type || "")
      .trim()
      .toUpperCase()
    if (!sourceType) return ""

    if (sourceType === "RFQ" || sourceType === "RFQ_RESPONSE") {
      const number = record?.latest_price_rfq_number || null
      const rev =
        record?.latest_price_rfq_rev_number != null
          ? `rev ${record.latest_price_rfq_rev_number}`
          : null
      if (sourceType === "RFQ") {
        return [number, rev].filter(Boolean).join(" · ") || "RFQ"
      }
      const subtype = String(
        record?.latest_price_source_subtype || record?.latest_price_entry_source || ""
      ).toUpperCase()
      const subtypeLabel = {
        SUPPLIER_MANUAL: "вручную",
        SUPPLIER_FILE: "файл поставщика",
        NEGOTIATION: "переговоры",
        ACCEPTED_EXISTING: "принятая цена",
        SYSTEM_IMPORT: "системный импорт",
      }[subtype]
      const rfqLabel = [number, rev].filter(Boolean).join(" · ") || "RFQ"
      return subtypeLabel ? `Ответ RFQ (${subtypeLabel}): ${rfqLabel}` : `Ответ RFQ: ${rfqLabel}`
    }

    if (sourceType === "PRICE_LIST") {
      const listName =
        record?.latest_price_price_list_name ||
        record?.latest_price_price_list_code ||
        (record?.latest_price_price_list_id
          ? `#${record.latest_price_price_list_id}`
          : null)
      if (!listName) return "Прайс-лист"
      return `Прайс-лист: ${listName}`
    }

    return renderPriceSource(sourceType)
  }, [renderPriceSource])

  const getColumnWidth = useCallback(
    (key, fallback) => {
      const value = columnWidths?.[key]
      return Number.isFinite(Number(value)) ? Number(value) : fallback
    },
    [columnWidths]
  )

  const columnDefs = useMemo(() => {
    const cols = []

    if (showAll) {
      cols.push({
        key: "supplier_name",
        title: "Поставщик",
        dataIndex: "supplier_name",
        width: getColumnWidth("supplier_name", 220),
        minWidth: 100,
        maxWidth: 420,
        ellipsis: true,
        onCell: () => ({
          style: { overflow: "hidden" },
        }),
        render: (v) => <ValueDisplay value={v} maxLength={120} />,
      })
    }

    cols.push({
      key: "supplier_part_number",
      title: "Номер у поставщика",
      dataIndex: "supplier_part_number",
      width: getColumnWidth("supplier_part_number", 260),
      minWidth: 110,
      maxWidth: 520,
      ellipsis: true,
      onCell: () => ({
        style: { overflow: "hidden" },
      }),
      render: (value) => <ValueDisplay value={value} maxLength={160} />,
    })

    cols.push({
      key: "description_ru",
      title: "Описание (RU)",
      dataIndex: "description_ru",
      width: getColumnWidth("description_ru", 220),
      minWidth: 120,
      maxWidth: 420,
      ellipsis: true,
      onCell: () => ({
        style: { overflow: "hidden" },
      }),
      render: (value) => <ValueDisplay value={value} />,
    })

    cols.push({
      key: "description_en",
      title: "Описание (EN)",
      dataIndex: "description_en",
      width: getColumnWidth("description_en", 220),
      minWidth: 120,
      maxWidth: 420,
      ellipsis: true,
      onCell: () => ({
        style: { overflow: "hidden" },
      }),
      render: (value) => <ValueDisplay value={value} />,
    })

    cols.push({
      key: "comment",
      title: "Комментарий",
      dataIndex: "comment",
      width: getColumnWidth("comment", 220),
      minWidth: 120,
      maxWidth: 420,
      ellipsis: true,
      onCell: () => ({
        style: { overflow: "hidden" },
      }),
      render: (value) => <ValueDisplay value={value} />,
    })

    cols.push({
      key: "part_type",
      title: "OEM",
      dataIndex: "part_type",
      width: getColumnWidth("part_type", 90),
      minWidth: 80,
      maxWidth: 120,
      render: (_, record) => renderOemCell(record),
    })

    cols.push({
      key: "uom",
      title: "Ед. изм.",
      dataIndex: "uom",
      width: getColumnWidth("uom", 90),
      minWidth: 80,
      maxWidth: 120,
      render: (value) => renderUomTag(value),
    })

    cols.push({
      key: "latest_price",
      title: "Цена",
      dataIndex: "latest_price",
      width: getColumnWidth("latest_price", 220),
      minWidth: 72,
      maxWidth: 320,
      ellipsis: { showTitle: false },
      onCell: () => ({
        style: {
          overflow: "hidden",
        },
      }),
      render: (_, record) => {
        if (record?.latest_price == null) return <ValueDisplay value={null} />
        const priceText = `${formatPrice(record.latest_price)}${record?.latest_currency ? ` ${record.latest_currency}` : ""}`
        const sourceText = renderPriceSourceDetails(record)
        const title = [
          priceText,
          sourceText,
          record?.latest_price_date ? `Дата цены: ${String(record.latest_price_date).slice(0, 10)}` : null,
        ]
          .filter(Boolean)
          .join("\n")
        return (
          <Tooltip title={<div style={{ whiteSpace: "pre-line", maxWidth: 360 }}>{title}</div>}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 2,
                width: "100%",
                minWidth: 0,
              }}
            >
              <span
                className="cell-ellipsis"
                style={{ display: "block", width: "100%", maxWidth: "100%", fontWeight: 500, textAlign: "right" }}
              >
                {priceText}
              </span>
            </div>
          </Tooltip>
        )
      },
    })

    cols.push({
      key: "weight_kg",
      title: "Вес, кг",
      dataIndex: "weight_kg",
      width: getColumnWidth("weight_kg", 110),
      minWidth: 90,
      maxWidth: 140,
      align: "right",
      render: (value) => <ValueDisplay value={value} type="number" maximumFractionDigits={3} />,
    })

    cols.push({
      key: "length_cm",
      title: "Дл., см",
      dataIndex: "length_cm",
      width: getColumnWidth("length_cm", 100),
      minWidth: 90,
      maxWidth: 130,
      align: "right",
      render: (value) => <ValueDisplay value={value} type="number" maximumFractionDigits={2} />,
    })

    cols.push({
      key: "width_cm",
      title: "Шир., см",
      dataIndex: "width_cm",
      width: getColumnWidth("width_cm", 100),
      minWidth: 90,
      maxWidth: 130,
      align: "right",
      render: (value) => <ValueDisplay value={value} type="number" maximumFractionDigits={2} />,
    })

    cols.push({
      key: "height_cm",
      title: "Выс., см",
      dataIndex: "height_cm",
      width: getColumnWidth("height_cm", 100),
      minWidth: 90,
      maxWidth: 130,
      align: "right",
      render: (value) => <ValueDisplay value={value} type="number" maximumFractionDigits={2} />,
    })

    cols.push({
      key: "is_oversize",
      title: "Негабарит",
      dataIndex: "is_oversize",
      width: getColumnWidth("is_oversize", 110),
      minWidth: 100,
      maxWidth: 140,
      render: (_, record) => renderBoolTag(!!record?.is_oversize),
    })

    cols.push({
      key: "is_overweight",
      title: "Тяжелая",
      dataIndex: "is_overweight",
      width: getColumnWidth("is_overweight", 120),
      minWidth: 100,
      maxWidth: 140,
      render: (_, record) => renderBoolTag(!!record?.is_overweight),
    })

    cols.push({
      key: "default_material_name",
      title: "Материалы",
      dataIndex: "default_material_name",
      width: getColumnWidth("default_material_name", 180),
      minWidth: 140,
      maxWidth: 300,
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
      key: "lead_time_days",
      title: "Срок поставки, дн",
      dataIndex: "lead_time_days",
      width: getColumnWidth("lead_time_days", 130),
      minWidth: 110,
      maxWidth: 170,
      align: "right",
      render: (_, record) => <ValueDisplay value={record.lead_time_days} />,
    })

    cols.push({
      key: "min_order_qty",
      title: "MOQ",
      dataIndex: "min_order_qty",
      width: getColumnWidth("min_order_qty", 90),
      minWidth: 80,
      maxWidth: 120,
      align: "right",
      render: (value) => <ValueDisplay value={value} />,
    })

    cols.push({
      key: "packaging",
      title: "Упаковка",
      dataIndex: "packaging",
      width: getColumnWidth("packaging", 140),
      minWidth: 100,
      maxWidth: 240,
      ellipsis: true,
      onCell: () => ({
        style: { overflow: "hidden" },
      }),
      render: (value) => <ValueDisplay value={value} />,
    })

    cols.push({
      key: "catalog_links",
      title: "Связи с каталогом",
      dataIndex: "id",
      width: getColumnWidth("catalog_links", 180),
      minWidth: 120,
      maxWidth: 320,
      onCell: () => ({
        style: { overflow: "hidden" },
      }),
      render: (_, row) => <CatalogLinksCell row={row} />,
    })

    cols.push({
      key: "actions",
      title: "Действия",
      width: getColumnWidth("actions", 120),
      minWidth: 96,
      maxWidth: 140,
      resizable: false,
      render: (_, row) => {
        return (
          <ActionButtons
            onEdit={() => onEditRecord?.(row)}
            onHistory={() => setHistoryForId(row.id)}
            onDelete={() => handleDelete(row.id)}
            size="small"
          />
        )
      },
    })

    return cols
  }, [showAll, handleDelete, onEditRecord, renderPriceSourceDetails, getColumnWidth])

  const defaultVisible = useMemo(
    () =>
      [
        ...(showAll ? ["supplier_name"] : []),
        "supplier_part_number",
        "description_ru",
        "part_type",
        "latest_price",
        "lead_time_days",
        "min_order_qty",
        "catalog_links",
        "actions",
      ].filter((key) => columnDefs.some((column) => column.key === key)),
    [columnDefs, showAll],
  )
  const defaultOrder = [
    ...defaultVisible.filter((key) => key !== "actions"),
    ...(defaultVisible.includes("actions") ? ["actions"] : []),
  ]
  const effectiveVisibleKeys =
    Array.isArray(visibleColumnKeys) && visibleColumnKeys.length
      ? visibleColumnKeys
      : defaultVisible
  const effectiveOrderKeys = useMemo(
    () => getOrderedKeys(columnOrderKeys, defaultOrder),
    [columnOrderKeys, defaultOrder]
  )

  const orderedColumnDefs = useMemo(() => {
    const idx = new Map(effectiveOrderKeys.map((k, i) => [k, i]))
    return [...columnDefs].sort((a, b) => {
      const ai = idx.has(a.key) ? idx.get(a.key) : Number.MAX_SAFE_INTEGER
      const bi = idx.has(b.key) ? idx.get(b.key) : Number.MAX_SAFE_INTEGER
      return ai - bi
    })
  }, [columnDefs, effectiveOrderKeys])

  const columns = useMemo(() => {
    const visible = new Set(effectiveVisibleKeys)
    return orderedColumnDefs.filter((c) => c.lock || visible.has(c.key))
  }, [orderedColumnDefs, effectiveVisibleKeys])

  const scrollX = useMemo(
    () =>
      columns.reduce((sum, column) => {
        const width = Number(column?.width)
        return sum + (Number.isFinite(width) ? width : 160)
      }, 0),
    [columns]
  )

  const columnOptions = useMemo(
    () =>
      columnDefs
        .filter((c) => c.key && !c.lock)
        .map((c) => ({ key: c.key, label: c.title })),
    [columnDefs]
  )

  const lockedKeys = useMemo(
    () => columnDefs.filter((c) => c.lock).map((c) => c.key),
    [columnDefs]
  )

  useEffect(() => {
    onColumnsMeta?.({
      options: columnOptions,
      defaultVisible,
      lockedKeys,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(columnOptions), JSON.stringify(defaultVisible), JSON.stringify(lockedKeys)])

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
        <DraggableColumnsTable
          rowKey="id"
          className="op-table parts-table"
          style={{ "--op-table-resizable-width": `${scrollX}px` }}
          dataSource={rows}
          columns={columns}
          nonDraggableKeys={lockedKeys}
          onColumnOrderChange={({ activeKey, overKey }) => {
            if (typeof onColumnOrderKeysChange !== "function") return
            const nextFull = [...effectiveOrderKeys]
            const from = nextFull.indexOf(activeKey)
            const to = nextFull.indexOf(overKey)
            if (from < 0 || to < 0 || from === to) return
            const [item] = nextFull.splice(from, 1)
            nextFull.splice(to, 0, item)
            onColumnOrderKeysChange(nextFull)
          }}
          onColumnResize={(columnKey, nextWidth) => {
            if (typeof onColumnWidthsChange !== "function") return
            onColumnWidthsChange({
              ...(columnWidths || {}),
              [columnKey]: nextWidth,
            })
          }}
          loading={loading}
          pagination={pagination}
          size="middle"
          sticky
          tableLayout="fixed"
          scroll={{ x: scrollX }}
          onRow={(record) => ({
            onDoubleClick: (e) => {
              if (!onOpenDetail) return
              const target = e?.target
              if (
                target?.closest?.(
                  "button,a,input,textarea,select,.ant-btn,.ant-select,.ant-input,.ant-input-number,.ant-checkbox"
                )
              ) {
                return
              }
              onOpenDetail(record)
            },
          })}
          rowClassName={(record) =>
            Number(record?.id) === Number(highlightRowId) ? "op-row-flash" : ""
          }
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
