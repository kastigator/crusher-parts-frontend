import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Table, message } from "antd"
import axios from "@/api/axiosInstance"

const fmt4 = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
})

export default function BomExploded({ root }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!root?.id) return
    setLoading(true)
    try {
      const { data } = await axios.get(`/original-part-bom/tree/${root.id}`)
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить данные для Exploded BOM")
    } finally {
      setLoading(false)
    }
  }, [root?.id])

  useEffect(() => {
    load()
  }, [root?.id, load])

  const exploded = useMemo(() => {
    if (!Array.isArray(rows) || rows.length === 0) return []
    const map = new Map()

    for (const r of rows) {
      if (r.node_id === root?.id) continue // пропускаем сам корень
      const key = r.node_id
      const current = map.get(key) || {
        node_id: key,
        cat_number: r.cat_number,
        description_en: r.description_en,
        description_ru: r.description_ru,
        total_qty: 0,
      }
      current.total_qty += Number(r.mult_qty || 0)
      map.set(key, current)
    }

    return Array.from(map.values()).sort((a, b) =>
      String(a.cat_number || "").localeCompare(String(b.cat_number || ""))
    )
  }, [rows, root?.id])

  const columns = [
    {
      title: "Part number",
      dataIndex: "cat_number",
      width: 180,
      render: (v) => v || "—",
    },
    {
      title: "Описание",
      dataIndex: "description_ru",
      ellipsis: true,
      render: (_, r) => r.description_ru || r.description_en || "—",
    },
    {
      title: "Итого кол-во",
      dataIndex: "total_qty",
      width: 160,
      align: "right",
      render: (v) => fmt4.format(Number(v ?? 0)),
    },
  ]

  return (
    <div className="subtable-shell" style={{ width: "100%" }}>
      <Table
        className="op-table"
        rowKey="node_id"
        size="small"
        loading={loading}
        pagination={false}
        dataSource={exploded}
        columns={columns}
        scroll={{ x: true }}
        locale={{ emptyText: "Нет дочерних позиций" }}
      />
    </div>
  )
}
