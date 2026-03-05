import React, { useEffect, useMemo, useRef, useState } from "react"
import { Card, Empty, Space, Tree, Typography, message, Skeleton } from "antd"
import axios from "@/api/axiosInstance"

const { Text } = Typography

const PartNumberLink = ({ id, value, onOpenDetail }) => (
  <Text
    strong
    style={{
      color: "#1677ff",
      cursor: "pointer",
      textDecoration: "underline",
      textUnderlineOffset: 2,
    }}
    onClick={(e) => {
      e.preventDefault()
      e.stopPropagation()
      onOpenDetail?.(id)
    }}
  >
    {value || "—"}
  </Text>
)

const fmtQty = (v) => {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return null
  // avoid noise for integer values
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n))
  return n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")
}

const buildBomChildren = (rows, onOpenDetail) => {
  if (!Array.isArray(rows) || rows.length === 0) return { rootId: null, children: [] }

  const nodeMap = new Map()
  const childrenMap = new Map()
  let rootId = null

  for (const r of rows) {
    const id = Number(r.node_id)
    if (!id) continue
    const qty = fmtQty(r.edge_qty)
    const desc = r.description_ru || r.description_en || ""
    const title = (
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Space size={8} wrap>
          <PartNumberLink id={id} value={r.cat_number} onOpenDetail={onOpenDetail} />
          {desc ? <Text type="secondary">— {desc}</Text> : null}
          {r.parent_part_id != null && qty ? <Text type="secondary">× {qty}</Text> : null}
        </Space>
      </div>
    )
    nodeMap.set(id, { key: id, title, children: [] })
    childrenMap.set(id, [])
    if (r.parent_part_id == null) rootId = id
  }

  // attach children by parent_part_id
  for (const r of rows) {
    const id = Number(r.node_id)
    const parentId = r.parent_part_id == null ? null : Number(r.parent_part_id)
    if (!id || !parentId) continue
    const parentChildren = childrenMap.get(parentId)
    const node = nodeMap.get(id)
    if (parentChildren && node) parentChildren.push(node)
  }

  // finalize children + isLeaf
  for (const [id, arr] of childrenMap.entries()) {
    const node = nodeMap.get(id)
    if (!node) continue
    node.children = arr
    node.isLeaf = arr.length === 0
  }

  const children = rootId ? childrenMap.get(rootId) || [] : []
  return { rootId, children }
}

const updateNodeByKey = (nodes, targetKey, updater) => {
  const walk = (arr) =>
    arr.map((n) => {
      if (n.key === targetKey) return updater(n)
      if (!n.children?.length) return n
      return { ...n, children: walk(n.children) }
    })
  return walk(nodes)
}

export default function OriginalPartsRootsTree({
  manufacturer,
  model,
  loading,
  rows,
  focusId,
  onOpenDetail,
}) {
  const treeRef = useRef(null)

  const roots = useMemo(() => {
    const arr = Array.isArray(rows) ? rows : []
    return arr
      .filter(
        (r) =>
          Number(r.children_count || 0) > 0 &&
          Number(r.parent_count || 0) === 0 &&
          Number(r.id || 0) > 0
      )
      .sort((a, b) => String(a.cat_number || "").localeCompare(String(b.cat_number || "")))
  }, [rows])

  const modelKey = model?.id ? `model:${model.id}` : "model"
  const rootsKey = useMemo(() => roots.map((r) => r.id).join("|"), [roots])

  const [treeData, setTreeData] = useState([])
  const [expandedKeys, setExpandedKeys] = useState([modelKey])
  const [selectedKeys, setSelectedKeys] = useState([])
  const [loadedIds, setLoadedIds] = useState(() => new Set())

  const findPath = (nodes, targetKey) => {
    const walk = (arr, path) => {
      for (const n of arr || []) {
        const next = [...path, n.key]
        if (n.key === targetKey) return next
        if (n.children?.length) {
          const found = walk(n.children, next)
          if (found) return found
        }
      }
      return null
    }
    return walk(nodes, [])
  }

  // reset tree when model/roots change (search/filter)
  useEffect(() => {
    if (!model?.id) {
      setTreeData([])
      setExpandedKeys([modelKey])
      setLoadedIds(new Set())
      return
    }

    const title = (
      <Space size={8} wrap>
        <Text strong>
          {manufacturer?.name ? `${manufacturer.name} • ` : ""}
          {model?.model_name || "Модель"}
        </Text>
        <Text type="secondary">— корневые узлы: {roots.length}</Text>
      </Space>
    )

    const children = roots.map((r) => {
      const desc = r.description_ru || r.description_en || ""
      return {
        key: Number(r.id),
        title: (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Space size={8} wrap>
              <PartNumberLink id={Number(r.id)} value={r.cat_number} onOpenDetail={onOpenDetail} />
              {desc ? <Text type="secondary">— {desc}</Text> : null}
            </Space>
          </div>
        ),
        isLeaf: false,
        children: [],
      }
    })

    setTreeData([{ key: modelKey, title, children }])
    setExpandedKeys([modelKey])
    setSelectedKeys([])
    setLoadedIds(new Set())
  }, [model?.id, model?.model_name, manufacturer?.name, rootsKey, modelKey, roots, onOpenDetail])

  // Focus a node (best-effort): works for root nodes and for already-loaded children.
  useEffect(() => {
    const id = Number(focusId)
    if (!model?.id) return
    if (!Number.isFinite(id) || id <= 0) return
    if (!treeData?.length) return

    const path = findPath(treeData, id)
    if (!path) {
      // If it's a root node, it should exist immediately; if not found, just ignore.
      return
    }

    // Expand all ancestors (keep user expansions as much as possible)
    setExpandedKeys((prev) => {
      const s = new Set([...(prev || [])])
      for (const k of path) s.add(k)
      return Array.from(s)
    })
    setSelectedKeys([id])

    // Smooth scroll to the node in the tree
    setTimeout(() => {
      try {
        treeRef.current?.scrollTo?.({ key: id, align: "top" })
        // If scrollTo isn't available, fall back to DOM.
      } catch {
        // ignore scroll API errors
      }
      try {
        const el = document.querySelector(`.op-roots-tree [data-node-key="${id}"]`)
        el?.scrollIntoView?.({ block: "center", behavior: "smooth" })
      } catch {
        // ignore DOM scroll errors
      }
    }, 0)
  }, [focusId, model?.id, rootsKey, treeData])

  const loadData = async (node) => {
    const rawKey = node?.key
    const id = Number(rawKey)
    if (!Number.isFinite(id) || id <= 0) return
    if (loadedIds.has(id)) return

    try {
      const { data } = await axios.get(`/original-part-bom/tree/${id}`)
      const { children } = buildBomChildren(Array.isArray(data) ? data : [], onOpenDetail)

      setTreeData((prev) =>
        updateNodeByKey(prev, id, (n) => ({
          ...n,
          children,
          isLeaf: children.length === 0,
        }))
      )
      setLoadedIds((prev) => new Set([...prev, id]))
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить структуру BOM")
      setLoadedIds((prev) => new Set([...prev, id]))
    }
  }

  const emptyMessage = !model
    ? "Выберите производителя и модель"
    : "Нет корневых узлов. Соберите BOM (добавьте позиции в состав) — тогда узлы появятся."

  return (
    <Card
      size="small"
      bodyStyle={{ padding: 12 }}
      className="op-roots-tree"
      style={{ width: "100%" }}
    >
      {!model?.id ? (
        <Empty description={emptyMessage} />
      ) : roots.length === 0 ? (
        <Empty description={emptyMessage} />
      ) : loading ? (
        <div style={{ padding: "4px 2px" }}>
          <Skeleton active title={false} paragraph={{ rows: 6 }} />
        </div>
      ) : (
        <Tree
          ref={treeRef}
          showLine
          blockNode
          treeData={treeData}
          expandedKeys={expandedKeys}
          onExpand={setExpandedKeys}
          selectedKeys={selectedKeys}
          onSelect={(keys) => setSelectedKeys(keys)}
          loadData={loadData}
        />
      )}
    </Card>
  )
}
