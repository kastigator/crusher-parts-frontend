// src/components/originalParts/BomTree.jsx
import React, { useEffect, useMemo, useState } from "react"
import { Card, Empty, Tree, Space, Button, Typography, message } from "antd"
import axios from "@/api/axiosInstance"

const { Text } = Typography

/**
 * Ожидается backend-ответ /original-part-bom/tree/:id
 * c полями: node_id, cat_number, description_ru, description_en, level, path, mult_qty
 */
export default function BomTree({ originalPartId }) {
  const rootId = originalPartId
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [expandedKeys, setExpandedKeys] = useState([])

  // загрузка дерева
  useEffect(() => {
    let ignore = false
    async function load() {
      if (!rootId) {
        setRows([])
        setExpandedKeys([])
        return
      }
      setLoading(true)
      try {
        const { data } = await axios.get(`/original-part-bom/tree/${rootId}`)
        if (!ignore) {
          const arr = Array.isArray(data) ? data : []
          setRows(arr)
        }
      } catch (e) {
        console.error(e)
        message.error("Не удалось загрузить дерево BOM")
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [rootId])

  // построение иерархии AntD Tree из плоского списка
  const { treeData, allKeys, totalCount } = useMemo(() => {
    if (!Array.isArray(rows) || rows.length === 0) {
      return { treeData: [], allKeys: [], totalCount: 0 }
    }

    // создаём узлы и карта по id
    const nodeMap = new Map()
    const childrenMap = new Map() // id -> массив детей
    const keys = []

    // подготовка всех узлов
    for (const r of rows) {
      const qty = Number(r.mult_qty ?? 0)
      const title =
        (r.cat_number || "—") +
        (r.description_ru
          ? ` — ${r.description_ru}`
          : r.description_en
          ? ` — ${r.description_en}`
          : "") +
        (r.level > 0 && qty > 0 ? ` × ${qty}` : "")

      const node = {
        key: r.node_id,
        title,
        isLeaf: false, // решим позже, когда узнаем детей
        raw: r,
      }
      nodeMap.set(r.node_id, node)
      childrenMap.set(r.node_id, [])
      keys.push(r.node_id)
    }

    // собрать древо по path
    let rootNode = null
    for (const r of rows) {
      const node = nodeMap.get(r.node_id)
      // родитель — последний id в path до текущего
      const parts = String(r.path || "").split(">").filter(Boolean)
      if (parts.length <= 1) {
        // это корень
        rootNode = node
        continue
      }
      const parentId = Number(parts[parts.length - 2])
      const parentChildren = childrenMap.get(parentId)
      if (parentChildren) parentChildren.push(node)
    }

    // выставляем children и isLeaf
    for (const [id, arr] of childrenMap.entries()) {
      const node = nodeMap.get(id)
      node.children = arr
      node.isLeaf = arr.length === 0
    }

    const treeData = rootNode ? [rootNode] : []
    const totalCount = rows.length - 1 /* без корня */

    return { treeData, allKeys: keys, totalCount }
  }, [rows])

  // по умолчанию разворачиваем всё при смене данных
  useEffect(() => {
    setExpandedKeys(allKeys)
  }, [allKeys.join("|")]) // простая зависимость по ключам

  if (!rootId) {
    return <Empty description="Выберите деталь выше" />
  }

  return (
    <Card
      size="small"
      bodyStyle={{ padding: 12 }}
      title={
        <Space size={8} wrap>
          <Text type="secondary">Дерево BOM</Text>
          <Text type="secondary">•</Text>
          <Text type="secondary">Позиции: {totalCount}</Text>
        </Space>
      }
      extra={
        <Space>
          <Button size="small" onClick={() => setExpandedKeys(allKeys)}>
            Развернуть всё
          </Button>
          <Button size="small" onClick={() => setExpandedKeys([])}>
            Свернуть всё
          </Button>
        </Space>
      }
    >
      {treeData.length === 0 && !loading ? (
        <Empty description="Дерево пусто" />
      ) : (
        <Tree
          showLine
          blockNode
          selectable={false}
          treeData={treeData}
          expandedKeys={expandedKeys}
          onExpand={setExpandedKeys}
          loading={loading}
        />
      )}
    </Card>
  )
}
