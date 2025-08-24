// src/components/supplierParts/SupplierPartsTable.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Table, Empty, message, Tabs } from "antd"
import axios from "@/api/axiosInstance"

// ВАЖНО: файлы лежат в той же папке
import PriceHistoryTab from "./PriceHistoryTab"
import OriginalsLinkTab from "./OriginalsLinkTab"

export default function SupplierPartsTable({ supplierId, search, version, onReload }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const abortRef = useRef(null)

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

      // Поддерживаем оба формата ответа: [{...}] или { items, total }
      const items = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : [])
      setRows(items)
      setTotal(Array.isArray(data) ? items.length : (Number(data?.total) || items.length))
    } catch (e) {
      const name = e?.name || e?.code
      if (name !== "AbortError" && name !== "ERR_CANCELED") {
        console.error(e); message.error("Не удалось загрузить детали поставщика")
      }
    } finally {
      setLoading(false)
    }
  }, [supplierId, search, page, pageSize])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => { clearTimeout(t); abortRef.current?.abort() }
  }, [load, version])

  // Колонки
  const columns = useMemo(() => [
    { title: "Номер у поставщика", dataIndex: "supplier_part_number", width: 220 },
    { title: "Описание", dataIndex: "description" },
    { title: "Оригинальные номера", dataIndex: "original_cat_numbers", width: 240, render: v => v || "—" },
    { title: "Последняя цена", dataIndex: "latest_price", width: 140, render: v => (v ?? "—") },
    { title: "Дата цены", dataIndex: "latest_price_date", width: 160, render: v => v ? String(v).slice(0, 10) : "—" },
  ], [])

  // Вложенные вкладки
  const expandedRowRender = (record) => {
    if (!record?.id) return null
    return (
      <div className="op-embedded">
        <Tabs
          defaultActiveKey="prices"
          destroyInactiveTabPane
          items={[
            {
              key: "prices",
              label: "История цен",
              children: <PriceHistoryTab supplierPartId={record.id} />
            },
            {
              key: "originals",
              label: "Оригинальные детали",
              children: <OriginalsLinkTab supplierPartId={record.id} onChanged={load} />
            }
          ]}
        />
      </div>
    )
  }

  if (!supplierId) {
    return <Empty description="Выберите поставщика, чтобы увидеть его детали" />
  }

  return (
    <Table
      rowKey="id"
      dataSource={rows}
      columns={columns}
      loading={loading}
      expandable={{ expandedRowRender }}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        pageSizeOptions: [10, 20, 50, 100],
      }}
      onChange={(p) => {
        setPage(p.current)
        setPageSize(p.pageSize)
      }}
      size="middle"
    />
  )
}
