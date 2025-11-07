// /src/components/originalParts/suppliers/SuppliersLinksTab.jsx
import React, { useEffect, useMemo, useState } from "react"
import { Empty, Space, Table, Tooltip, Typography, Tag, Button } from "antd"
import { ArrowUpOutlined, ArrowDownOutlined, LinkOutlined, DeleteOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"             // ✅ правильный импорт
const { Text } = Typography

/**
 * Props:
 * - originalPartId (number, required)
 */
export default function SuppliersLinksTab({ originalPartId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  // «Комплект (сборный)» – просто просмотр вариантов по ролям
  const [bundleOptions, setBundleOptions] = useState([])
  const [bundleLoading, setBundleLoading] = useState(false)

  // сортировка (client-side)
  const [sortKey, setSortKey]   = useState(null)     // "price" | "date"
  const [sortDesc, setSortDesc] = useState(false)

  // -------- data --------
  const load = async () => {
    if (!originalPartId) return
    try {
      setLoading(true)
      const { data } = await axios.get("/original-parts/suppliers", { params: { original_part_id: originalPartId } })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // подпанель «Комплект (сборный)» (read-only)
  const loadBundle = async () => {
    if (!originalPartId) { setBundleOptions([]); return }
    try {
      setBundleLoading(true)
      const { data: bundles } = await axios.get("/supplier-bundles", { params: { original_part_id: originalPartId } })
      if (Array.isArray(bundles) && bundles.length) {
        const bundleId = bundles[0].id
        const { data: opts } = await axios.get(`/supplier-bundles/${bundleId}/options`)
        setBundleOptions(Array.isArray(opts) ? opts : [])
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

  useEffect(() => { load(); loadBundle() }, [originalPartId])

  // ✅ авто-рефреш из вкладки «Комплект (сборный)»
  useEffect(() => {
    const onRefresh = (ev) => {
      const id = ev?.detail?.original_part_id
      if (!id || id === originalPartId) {
        load()
        loadBundle()
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
      await axios.delete("/original-parts/suppliers", {
        data: { original_part_id: originalPartId, supplier_part_id: supplierPartId }
      })
      await load()
    } catch (e) {
      console.error(e)
    }
  }

  // deep-link в «Детали поставщиков» (см. правку SupplierPartsMain ниже)
  const openSupplierPart = (supplierPartId) => {
    const url = `/supplier-parts?focus=${encodeURIComponent(supplierPartId)}`
    window.open(url, "_blank")
  }

  // -------- sorting --------
  const sortedRows = useMemo(() => {
    const list = [...rows]
    if (sortKey === "price") {
      list.sort((a, b) => Number(a.last_price ?? Infinity) - Number(b.last_price ?? Infinity))
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
              onClick={() => openSupplierPart(r.supplier_part_id)}
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

  // сгруппировать bundleOptions по роли — просто для просмотра
  const bundleByRole = useMemo(() => {
    const map = new Map()
    for (const o of bundleOptions) {
      const key = o.role_label || "—"
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(o)
    }
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => (a.link_id ?? 0) - (b.link_id ?? 0))
      map.set(k, arr)
    }
    return map
  }, [bundleOptions])

  return (
    <div>
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

      {/* Комплект (сборный) — информативная панель */}
      <div style={{ marginTop: 16 }}>
        <Text type="secondary">
          Комплект (сборный): варианты по ролям
        </Text>
        <div style={{ marginTop: 8 }}>
          {bundleLoading ? (
            <div style={{ padding: 12 }}>Загрузка…</div>
          ) : bundleOptions.length === 0 ? (
            <div style={{ padding: 12 }}><Empty description="Нет вариантов комплекта для этой детали" /></div>
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
