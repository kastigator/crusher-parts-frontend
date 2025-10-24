import React, { useEffect, useMemo, useState } from "react"
import { Table, message, Empty } from "antd"
import axios from "@/api/axiosInstance"

const fmt = (n) => (n == null ? "—" : Number(n).toFixed(4))

function buildTree(rows) {
  if (!Array.isArray(rows) || !rows.length) return []
  const byPath = new Map()
  const makeNode = (r) => ({
    key: r.path,
    cat_number: r.cat_number,
    description: r.description_ru || r.description_en || "—",
    level: r.level,
    totalQty: Number(r.mult_qty ?? 1),
    directQty: null,
    children: [],
  })

  const root = makeNode(rows[0])
  byPath.set(rows[0].path, root)

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    const node = makeNode(r)
    const parentPath = r.path.split(">").slice(0, -1).join(">")
    const parent = byPath.get(parentPath)
    const parentQty = parent ? parent.totalQty || 1 : 1
    node.directQty = parentQty ? node.totalQty / parentQty : node.totalQty
    if (parent) parent.children.push(node)
    byPath.set(r.path, node)
  }
  return [root]
}

export default function BomTree({ rootId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!rootId) return
    let ignore = false
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await axios.get(`/original-part-bom/tree/${rootId}`)
        if (!ignore) setRows(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error(e)
        message.error("Ошибка загрузки дерева BOM")
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [rootId])

  const treeData = useMemo(() => buildTree(rows), [rows])

  const columns = [
    { title: "Part number", dataIndex: "cat_number", width: 200 },
    { title: "Описание", dataIndex: "description", ellipsis: true },
    { title: "Кол-во в родителе", width: 160, align: "right", render: (_, r) => fmt(r.level === 0 ? null : r.directQty) },
    { title: "Итоговое кол-во", width: 160, align: "right", render: (_, r) => fmt(r.totalQty) },
  ]

  return rows.length === 0 && !loading ? (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Нет данных для дерева" />
  ) : (
    <Table
      rowKey="key"
      columns={columns}
      dataSource={treeData}
      loading={loading}
      pagination={false}
      size="small"
      expandable={{ defaultExpandAllRows: true }}
      tableLayout="fixed"
    />
  )
}
