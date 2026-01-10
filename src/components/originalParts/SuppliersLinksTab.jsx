// /src/components/originalParts/suppliers/SuppliersLinksTab.jsx
import React, { useEffect, useMemo, useState } from "react"
import { Empty, Space, Table, Tooltip, Typography, Tag, Button } from "antd"
import { ArrowUpOutlined, ArrowDownOutlined, LinkOutlined, DeleteOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"

const { Text } = Typography

/**
 * Props:
 * - originalPartId (number, required)
 */
export default function SuppliersLinksTab({ originalPartId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  // «Комплект (сборный)» – только DEFАULT-варианты по ролям (read-only)
  const [bundleOptions, setBundleOptions] = useState([])
  const [bundleLoading, setBundleLoading] = useState(false)

  // сортировка (client-side)
  const [sortKey, setSortKey]   = useState(null)     // "price" | "date"
  const [sortDesc, setSortDesc] = useState(false)

  // -------- data: DIRECT offers через /original-parts/:id/options --------
  const loadDirectOffers = async () => {
    if (!originalPartId) return
    try {
      setLoading(true)
      const { data } = await axios.get(`/original-parts/${originalPartId}/options`, { params: { qty: 1 } })
      const direct = Array.isArray(data?.options)
        ? data.options.filter(o => o?.type === "DIRECT")
        : []

      // расплющим: каждая опция содержит items[0]
      const flat = []
      for (const opt of direct) {
        for (const it of opt.items || []) {
          flat.push({
            supplier_part_id: it.supplier_part_id,
            supplier_id: it.supplier_id,
            supplier_name: it.supplier_name || "—",
            supplier_part_number: it.supplier_part_number || null,
            description:
              it.description_ru || it.description_en || it.description || null,
            last_price: it.latest_price ?? null,
            last_currency: it.latest_currency ?? null,
            last_price_date: it.latest_price_date ?? null,
          })
        }
      }
      setRows(flat)
    } catch (e) {
      console.error(e)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  // -------- data: BUNDLE defaults через /supplier-bundles/:id/options --------
  const loadBundleDefaults = async () => {
    if (!originalPartId) { setBundleOptions([]); return }
    try {
      setBundleLoading(true)
      const { data: bundles } = await axios.get("/supplier-bundles", { params: { original_part_id: originalPartId } })
      if (Array.isArray(bundles) && bundles.length) {
        const bundleId = bundles[0].id
        const { data: opts } = await axios.get(`/supplier-bundles/${bundleId}/options`)
        // оставляем ТОЛЬКО дефолтные варианты
        const onlyDefaults = (Array.isArray(opts) ? opts : []).filter(o => o.is_default)
        setBundleOptions(onlyDefaults)
      } else {
        setBundleOptions([])
      }
    } catch (e) {
      console.error(e)
      setBundleOptions([])
    } finally {
      setBundleLoading(false)
    }
  }

  useEffect(() => { loadDirectOffers(); loadBundleDefaults() }, [originalPartId])

  // ✅ авто-рефреш из вкладки «Комплект (сборный)»
  useEffect(() => {
    const onRefresh = (ev) => {
      const id = ev?.detail?.original_part_id
      if (!id || id === originalPartId) {
        loadDirectOffers()
        loadBundleDefaults()
      }
    }
    window.addEventListener("supplier-links:refresh", onRefresh)
    return () => window.removeEventListener("supplier-links:refresh", onRefresh)
  }, [originalPartId])

  // -------- actions --------
  const removeLink = async (supplierPartId) => {
    const { confirmed } = await confirmAction("Удалить связь с поставщиком?")
    if (!confirmed) return
    try {
      // связь OP↔SP живёт в supplier_part_originals
      await axios.delete("/supplier-part-originals", {
        data: { original_part_id: originalPartId, supplier_part_id: supplierPartId }
      })
      await loadDirectOffers()
    } catch (e) {
      console.error(e)
    }
  }

  // deep-link в «Детали поставщиков»: передаём supplierId и focus
  const openSupplierPart = (supplierPartId, supplierId) => {
    const url = `/supplier-parts?supplierId=${encodeURIComponent(String(supplierId || ""))}&focus=${encodeURIComponent(String(supplierPartId))}`
    window.open(url, "_blank")
  }

  // -------- sorting --------
  const sortedRows = useMemo(() => {
    const list = [...rows]
    if (sortKey === "price") {
      const num = v => (v == null ? Number.POSITIVE_INFINITY : Number(v))
      list.sort((a, b) => num(a.last_price) - num(b.last_price))
    } else if (sortKey === "date") {
      const t = (d) => d ? new Date(d).getTime() : 0
      list.sort((a, b) => t(a.last_price_date) - t(b.last_price_date))
    }
    if (sortDesc) list.reverse()
    return list
  }, [rows, sortKey, sortDesc])

  const SortLabel = ({ active, label, dir }) => (
    <Space size={4}>
      <span>{label}</span>
      {active ? (dir ? <ArrowDownOutlined /> : <ArrowUpOutlined />) : null}
    </Space>
  )

  const onSort = (key) => {
    if (sortKey === key) setSortDesc((v) => !v)
    else { setSortKey(key); setSortDesc(false) }
  }

  // -------- columns --------
  const cols = [
    {
      title: "Поставщик",
      dataIndex: "supplier_name",
      width: 220,
      render: (v) => (
        <Tooltip title={v || "—"}>
          <span style={{ display: "inline-block", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
            {v || "—"}
          </span>
        </Tooltip>
      )
    },
    {
      title: "№ у поставщика",
      dataIndex: "supplier_part_number",
      width: 180,
      render: (v) => v || "—"
    },
    {
      title: "Описание",
      dataIndex: "description",
      render: (v) => v || "—",
      ellipsis: true,
    },
    {
      title: (
        <Button type="link" onClick={() => onSort("price")} style={{ padding: 0 }}>
          <SortLabel active={sortKey === "price"} label="Последняя цена" dir={sortDesc} />
        </Button>
      ),
      dataIndex: "last_price",
      align: "right",
      width: 140,
      render: (v, r) => v != null ? `${Number(v).toFixed(2)} ${r.last_currency || ""}` : "—"
    },
    {
      title: (
        <Button type="link" onClick={() => onSort("date")} style={{ padding: 0 }}>
          <SortLabel active={sortKey === "date"} label="Дата цены" dir={sortDesc} />
        </Button>
      ),
      dataIndex: "last_price_date",
      width: 130,
      render: (v) => v ? new Date(v).toLocaleDateString() : "—"
    },
    {
      title: "Действия",
      key: "act",
      width: 190,
      render: (_, r) => (
        <Space size="small">
          <Tooltip title="Открыть в «Детали поставщиков»">
            <Button
              size="small"
              icon={<LinkOutlined />}
              onClick={() => openSupplierPart(r.supplier_part_id, r.supplier_id)}
            />
          </Tooltip>
          <Tooltip title="Удалить связь">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => removeLink(r.supplier_part_id)}
            />
          </Tooltip>
        </Space>
      )
    }
  ]

  // сгруппировать bundleOptions по роли — только дефолт
  const bundleByRole = useMemo(() => {
    const map = new Map()
    for (const o of bundleOptions) {
      const key = o.role_label || "—"
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(o)
    }
    // порядок внутри роли — по link_id (стабильный)
    for (const [k, arr] of map.entries()) {
      map.set(k, [...arr].sort((a, b) => (a.link_id ?? 0) - (b.link_id ?? 0)))
    }
    return map
  }, [bundleOptions])

  return (
    <div>
      {/* Прямые аналоги */}
      <Table
        rowKey={(r) => `${r.supplier_part_id}`}
        className="op-table"
        size="small"
        loading={loading}
        columns={cols}
        dataSource={sortedRows}
        pagination={false}
        locale={{ emptyText: <Empty description="Нет связанных поставщиков" /> }}
      />

      {/* Комплект (сборный) — информативная панель (только default) */}
      <div style={{ marginTop: 16 }}>
        <Text type="secondary">
          Комплект (сборный): выбранные по умолчанию варианты по ролям
        </Text>
        <div style={{ marginTop: 8 }}>
          {bundleLoading ? (
            <div style={{ padding: 12 }}>Загрузка…</div>
          ) : bundleOptions.length === 0 ? (
            <div style={{ padding: 12 }}><Empty description="Нет дефолтных вариантов для этой детали" /></div>
          ) : (
            [...bundleByRole.entries()].map(([role, arr]) => (
              <div key={role} style={{ padding: "8px 12px", border: "1px solid #f0f0f0", borderRadius: 8, marginBottom: 8 }}>
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Text strong>{role}</Text>
                  <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 140px 130px 120px", gap: 8 }}>
                    <Text type="secondary">Поставщик</Text>
                    <Text type="secondary">Описание / № у поставщика</Text>
                    <Text type="secondary" style={{ textAlign: "right" }}>Цена</Text>
                    <Text type="secondary">Дата</Text>
                    <Text type="secondary">Статус</Text>
                    {arr.map((r) => (
                      <React.Fragment key={r.link_id}>
                        <div>{r.supplier_name || "—"}</div>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.supplier_part_description || "—"}
                          {r.supplier_part_number ? `  (${r.supplier_part_number})` : ""}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          {r.last_price != null ? `${Number(r.last_price).toFixed(2)} ${r.last_currency || ""}` : "—"}
                        </div>
                        <div>{r.last_price_date ? new Date(r.last_price_date).toLocaleDateString() : "—"}</div>
                        <div>{r.is_default ? <Tag color="green">по умолчанию</Tag> : <Tag>вариант</Tag>}</div>
                      </React.Fragment>
                    ))}
                  </div>
                </Space>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
