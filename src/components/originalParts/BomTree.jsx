import React, { useEffect, useMemo, useState } from "react"
import { Table, message, Empty } from "antd"
import axios from "@/api/axiosInstance"

const fmt = (n) =>
  n == null || Number.isNaN(Number(n)) ? "—" : Number(n).toFixed(4)

function buildTree(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return []

  const byPath = new Map()

  const makeNode = (r) => ({
    key: r.path,
    partId: r.node_id,
    cat_number: r.cat_number,
    description: r.description_ru || r.description_en || "—",
    level: r.level,
    totalQty: Number(r.mult_qty ?? 1),
    directQty: null,
    children: [],
  })

  const rootRow = rows[0]
  const root = makeNode(rootRow)
  byPath.set(rootRow.path, root)

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    const node = makeNode(r)
    const parentPath = String(r.path).split(">").slice(0, -1).join(">")
    const parent = byPath.get(parentPath)
    const parentTotal = parent ? Number(parent.totalQty) || 1 : 1
    node.directQty = parentTotal
      ? Number(node.totalQty) / parentTotal
      : Number(node.totalQty)
    if (parent) parent.children.push(node)
    byPath.set(r.path, node)
  }

  return [root]
}

export default function BomTree({ rootId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!rootId) {
      setRows([])
      return
    }

    let ignore = false

    const load = async () => {
      setLoading(true)
      try {
        const { data } = await axios.get(`/original-part-bom/tree/${rootId}`)
        if (!ignore) setRows(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error(e)
        message.error("Не удалось загрузить дерево BOM")
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    load()
    return () => {
      ignore = true
    }
  }, [rootId])

  const treeData = useMemo(() => buildTree(rows), [rows])

  const columns = [
    { title: "Part number", dataIndex: "cat_number", width: 200 },
    { title: "Описание", dataIndex: "description", ellipsis: true },
    {
      title: "Кол-во в родителе",
      key: "direct",
      width: 160,
      align: "right",
      render: (_, r) => fmt(r.level === 0 ? null : r.directQty),
    },
    {
      title: "Итоговое кол-во",
      key: "total",
      width: 160,
      align: "right",
      render: (_, r) => fmt(r.totalQty),
    },
  ]

  return (
    <div
      className="subtable-shell"
      style={{
        width: "100%",
        minHeight: 160,          // ✅ фиксирует базовую высоту
        maxHeight: "70vh",       // ✅ ограничивает вертикальный рост
        overflowY: "auto",
      }}
    >
      {(!loading && (!rows || rows.length === 0)) ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Нет данных для отображения дерева"
          style={{ margin: "24px 0" }}
        />
      ) : (
        <Table
          className="op-table"
          rowKey="key"
          columns={columns}
          loading={loading}
          dataSource={treeData}
          pagination={false}
          size="small"
          expandable={{
            defaultExpandAllRows: true,
            childrenColumnName: "children",
          }}
          scroll={{
            x: "max-content",
            y: "calc(70vh - 180px)", // ✅ предотвращает скачки layout при больших деревьях
          }}
        />
      )}
    </div>
  )
}
