import React, { useEffect, useMemo, useState } from "react"
import { Table, message } from "antd"
import axios from "@/api/axiosInstance"

export default function BomExploded({ root }) {
  const [tree, setTree] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!root?.id) return
    setLoading(true)
    try {
      const { data } = await axios.get(`/original-part-bom/tree/${root.id}`)
      setTree(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e); message.error("Не удалось загрузить данные для Exploded")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [root?.id]) // eslint-disable-line

  const exploded = useMemo(() => {
    const map = new Map()
    for (const r of tree) {
      if (r.node_id === root?.id) continue
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
    return Array.from(map.values()).sort((a, b) => String(a.cat_number || "").localeCompare(String(b.cat_number || "")))
  }, [tree, root?.id])

  return (
    <Table
      rowKey="node_id"
      size="small"
      loading={loading}
      pagination={false}
      dataSource={exploded}
      columns={[
        { title: "Cat #", dataIndex: "cat_number", width: 160 },
        { title: "Описание", render: (_, r) => r.description_ru || r.description_en || "—" },
        { title: "Итого кол-во", dataIndex: "total_qty", width: 140 },
      ]}
    />
  )
}
