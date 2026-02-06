import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Table, Empty, message, Tag, Tooltip } from "antd"
import axios from "@/api/axiosInstance"

import ValueDisplay from "@/components/common/ValueDisplay"
import ActionButtons from "@/components/common/ActionButtons"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import confirmAction from "@/utils/confirmAction"
import useTableScrollHints from "@/utils/useTableScrollHints"
import { formatPrice } from "@/utils/priceFormat"

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
  filters,
  version,
  onReload,
  showAll = false,
  onOpenDetail,
  highlightRowId = null,
  onFlashRow,
  visibleColumnKeys = null,
  onVisibleColumnKeysChange = null,
  onColumnsMeta = null,
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

      const f = filters || {}
      if (f.part_type) params.part_type = f.part_type
      if (f.originals_mode && f.originals_mode !== "any") params.originals_mode = f.originals_mode
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
      } catch {}
    }
  }, [load, version, page, pageSize])

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

  const renderOemCell = (record) => {
    const type = String(record?.part_type || "").toUpperCase()
    if (type === "OEM") return <Tag color="blue">OEM</Tag>
    if (type === "ANALOG") return <Tag>Аналог</Tag>
    return <Tag>—</Tag>
  }

  const renderBoolTag = (v) => (
    <Tag color={v ? "green" : "default"}>{v ? "да" : "нет"}</Tag>
  )

  const renderPriceSource = (raw) => {
    const s = String(raw || "").trim().toUpperCase()
    if (!s) return ""
    const map = {
      RFQ: "RFQ",
      PRICE_LIST: "Прайс-лист",
      NEGOTIATION: "Переговоры",
      MANUAL: "Вручную",
      OTHER: "Другое",
    }
    return map[s] || String(raw)
  }

  const renderPriceSourceDetails = (record) => {
    const sourceType = String(record?.latest_price_source_type || "")
      .trim()
      .toUpperCase()
    if (!sourceType) return ""

    if (sourceType === "RFQ") {
      const number = record?.latest_price_rfq_number || null
      const rev =
        record?.latest_price_rfq_rev_number != null
          ? `rev ${record.latest_price_rfq_rev_number}`
          : null
      return [number, rev].filter(Boolean).join(" · ") || "RFQ"
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
  }

  const columnDefs = useMemo(() => {
    const cols = []

    if (showAll) {
      cols.push({
        key: "supplier_name",
        title: "Поставщик",
        dataIndex: "supplier_name",
        width: 180,
        fixed: "left",
        ellipsis: true,
        render: (v) => <ValueDisplay value={v} />,
      })
    }

    cols.push({
      key: "supplier_part_number",
      title: "Номер у поставщика",
      dataIndex: "supplier_part_number",
      width: 160,
      fixed: "left",
      ellipsis: true,
      lock: true,
      render: (value) => <ValueDisplay value={value} />,
    })

    cols.push({
      key: "description_ru",
      title: "Описание (RU)",
      dataIndex: "description_ru",
      width: 220,
      ellipsis: true,
      render: (value) => <ValueDisplay value={value} />,
    })

    cols.push({
      key: "description_en",
      title: "Описание (EN)",
      dataIndex: "description_en",
      width: 220,
      ellipsis: true,
      render: (value) => <ValueDisplay value={value} />,
    })

    cols.push({
      key: "comment",
      title: "Комментарий",
      dataIndex: "comment",
      width: 200,
      ellipsis: true,
      render: (value) => <ValueDisplay value={value} />,
    })

    cols.push({
      key: "part_type",
      title: "OEM",
      dataIndex: "part_type",
      width: 110,
      render: (_, record) => renderOemCell(record),
    })

    cols.push({
      key: "latest_price",
      title: "Цена",
      dataIndex: "latest_price",
      width: 220,
      align: "right",
      render: (_, record) => {
        if (record?.latest_price == null) return <ValueDisplay value={null} />
        const priceText = `${formatPrice(record.latest_price)}${record?.latest_currency ? ` ${record.latest_currency}` : ""}`
        const sourceText = renderPriceSourceDetails(record)
        const text = sourceText ? `${priceText} · ${sourceText}` : priceText
        if (!record?.latest_price_date) return <span>{text}</span>
        return (
          <Tooltip title={`Дата цены: ${String(record.latest_price_date).slice(0, 10)}`}>
            <span>{text}</span>
          </Tooltip>
        )
      },
    })

    cols.push({
      key: "weight_kg",
      title: "Вес, кг",
      dataIndex: "weight_kg",
      width: 110,
      align: "right",
      render: (value) => <ValueDisplay value={value} />,
    })

    cols.push({
      key: "length_cm",
      title: "Дл., см",
      dataIndex: "length_cm",
      width: 100,
      align: "right",
      render: (value) => <ValueDisplay value={value} />,
    })

    cols.push({
      key: "width_cm",
      title: "Шир., см",
      dataIndex: "width_cm",
      width: 100,
      align: "right",
      render: (value) => <ValueDisplay value={value} />,
    })

    cols.push({
      key: "height_cm",
      title: "Выс., см",
      dataIndex: "height_cm",
      width: 100,
      align: "right",
      render: (value) => <ValueDisplay value={value} />,
    })

    cols.push({
      key: "is_oversize",
      title: "Негабарит",
      dataIndex: "is_oversize",
      width: 110,
      render: (_, record) => renderBoolTag(!!record?.is_oversize),
    })

    cols.push({
      key: "is_overweight",
      title: "Тяжелая",
      dataIndex: "is_overweight",
      width: 120,
      render: (_, record) => renderBoolTag(!!record?.is_overweight),
    })

    cols.push({
      key: "default_material_name",
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
      key: "lead_time_days",
      title: "Срок поставки, дн",
      dataIndex: "lead_time_days",
      width: 130,
      align: "right",
      render: (_, record) => <ValueDisplay value={record.lead_time_days} />,
    })

    cols.push({
      key: "min_order_qty",
      title: "MOQ",
      dataIndex: "min_order_qty",
      width: 90,
      align: "right",
      render: (value) => <ValueDisplay value={value} />,
    })

    cols.push({
      key: "packaging",
      title: "Упаковка",
      dataIndex: "packaging",
      width: 140,
      ellipsis: true,
      render: (value) => <ValueDisplay value={value} />,
    })

    cols.push({
      key: "original_links",
      title: "Привязки",
      dataIndex: "id",
      width: 160,
      render: (_, row) => <OriginalsCell row={row} />,
    })

    cols.push({
      key: "actions",
      title: "Действия",
      width: 180,
      lock: true,
      render: (_, row) => {
        return (
          <ActionButtons
            onHistory={() => setHistoryForId(row.id)}
            onDelete={() => handleDelete(row.id)}
            size="small"
          />
        )
      },
    })

    return cols
  }, [showAll])

  const defaultVisible = useMemo(() => columnDefs.map((c) => c.key), [columnDefs])
  const effectiveVisibleKeys =
    Array.isArray(visibleColumnKeys) && visibleColumnKeys.length
      ? visibleColumnKeys
      : defaultVisible

  const columns = useMemo(() => {
    const visible = new Set(effectiveVisibleKeys)
    return columnDefs.filter((c) => c.lock || visible.has(c.key))
  }, [columnDefs, effectiveVisibleKeys])

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
        <Table
          rowKey="id"
          className="op-table parts-table"
          dataSource={rows}
          columns={columns}
          loading={loading}
          pagination={pagination}
          size="middle"
          tableLayout="fixed"
          scroll={{ x: true }}
          onRow={(record) => ({
            onClick: (e) => {
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
