// src/components/originalParts/BomTree.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Card, Empty, Tree, Space, Button, Typography, message, InputNumber, Tooltip, Tag } from "antd"
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"
import BomChildPickerDrawer from "./BomChildPickerDrawer"

const { Text } = Typography

/**
 * Ожидается backend-ответ /original-part-bom/tree/:id
 * c полями: node_id, parent_part_id, edge_qty, cat_number,
 *           description_ru, description_en, level, path, mult_qty
 */
export default function BomTree({ part, manufacturerName, modelName, onOpenPart }) {
  const rootId = part?.id || null
  const modelId = part?.equipment_model_id || null
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [expandedKeys, setExpandedKeys] = useState([])
  const [selectedKeys, setSelectedKeys] = useState([])
  const [pickerOpen, setPickerOpen] = useState(false)

  // загрузка дерева
  const load = useCallback(async () => {
    let ignore = false
    if (!rootId) {
      setRows([])
      setExpandedKeys([])
      setSelectedKeys([])
      return () => {}
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
    return () => { ignore = true }
  }, [rootId])

  useEffect(() => {
    let cleanup = () => {}
    load().then((c) => { if (typeof c === "function") cleanup = c })
    return () => cleanup()
  }, [load])

  const updateQty = useCallback(async (parentId, childId, nextQty) => {
    if (!parentId || !childId) return
    const qtyNum = Number(nextQty)
    if (!(qtyNum > 0)) {
      message.warning("Количество должно быть > 0")
      return
    }
    try {
      await axios.put("/original-part-bom", {
        parent_part_id: parentId,
        child_part_id: childId,
        quantity: qtyNum,
      })
      await load()
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось обновить количество")
    }
  }, [load])

  const removeRow = useCallback(async (parentId, childId) => {
    const { confirmed } = await confirmAction("Удалить позицию из BOM?")
    if (!confirmed) return
    try {
      await axios.delete("/original-part-bom", {
        data: { parent_part_id: parentId, child_part_id: childId },
      })
      message.success("Удалено")
      await load()
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось удалить позицию")
    }
  }, [load])

  // построение иерархии AntD Tree из плоского списка
  const { treeData, allKeys, totalCount, rowById, rootRow } = useMemo(() => {
    if (!Array.isArray(rows) || rows.length === 0) {
      return { treeData: [], allKeys: [], totalCount: 0, rowById: new Map(), rootRow: null }
    }

    // создаём узлы и карта по id
    const nodeMap = new Map()
    const childrenMap = new Map() // id -> массив детей
    const rowMap = new Map()
    const keys = []

    // подготовка всех узлов
    for (const r of rows) {
      rowMap.set(r.node_id, r)
      const qty = Number(r.mult_qty ?? 0)
      const desc = r.description_ru || r.description_en || ""

      const node = {
        key: r.node_id,
        title: (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <Space size={8} wrap>
              <Button
                type="link"
                size="small"
                style={{ padding: 0, height: "auto", fontWeight: 700 }}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onOpenPart?.(r.node_id)
                }}
              >
                {r.cat_number || "—"}
              </Button>
              {desc ? <Text type="secondary">— {desc}</Text> : null}
              {r.level > 0 && qty > 0 ? <Text type="secondary">× {qty}</Text> : null}
            </Space>
            {r.level > 0 ? (
              <Space size={6}>
                <Text type="secondary">Кол-во:</Text>
                <InputNumber
                  min={0.0001}
                  step={0.0001}
                  precision={4}
                  size="small"
                  style={{ width: 120 }}
                  value={Number(r.edge_qty ?? 1)}
                  onPressEnter={(e) => updateQty(r.parent_part_id, r.node_id, e.target.value)}
                  onBlur={(e) => updateQty(r.parent_part_id, r.node_id, e.target.value)}
                />
                <Tooltip title="Удалить позицию">
                  <Button
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => removeRow(r.parent_part_id, r.node_id)}
                  />
                </Tooltip>
              </Space>
            ) : null}
          </div>
        ),
        isLeaf: false, // решим позже, когда узнаем детей
        raw: r,
      }
      nodeMap.set(r.node_id, node)
      childrenMap.set(r.node_id, [])
      keys.push(r.node_id)
    }

    // собрать древо по path
    let rootNode = null
    let rootRow = null
    for (const r of rows) {
      const node = nodeMap.get(r.node_id)
      // родитель — последний id в path до текущего
      const parts = String(r.path || "").split(">").filter(Boolean)
      if (parts.length <= 1) {
        // это корень
        rootNode = node
        rootRow = r
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

    return { treeData, allKeys: keys, totalCount, rowById: rowMap, rootRow }
  }, [rows, removeRow, updateQty, onOpenPart])

  // по умолчанию разворачиваем всё при смене данных
  useEffect(() => {
    setExpandedKeys(allKeys)
    if (rootRow?.node_id) {
      setSelectedKeys((prev) => (prev?.length ? prev : [rootRow.node_id]))
    }
  }, [allKeys, rootRow?.node_id])

  const selectedId = Number(selectedKeys?.[0] || rootId || 0)
  const selectedRow = rowById.get(selectedId) || rootRow

  const excludeIds = useMemo(
    () =>
      rows
        .filter((r) => Number(r.parent_part_id) === Number(selectedId))
        .map((r) => Number(r.node_id))
        .filter(Boolean),
    [rows, selectedId]
  )

  const handlePickParts = async (pickedRows) => {
    if (!selectedId || !Array.isArray(pickedRows) || !pickedRows.length) return
    try {
      const items = pickedRows.map((r) => ({
        child_part_id: r.id,
        quantity: 1,
      }))
      const { data } = await axios.post("/original-part-bom/bulk", {
        parent_part_id: selectedId,
        items,
      })
      const inserted = Number(data?.inserted || 0)
      if (inserted) message.success(`Добавлено позиций: ${inserted}`)
      if (Array.isArray(data?.errors) && data.errors.length) {
        const txt = data.errors.slice(0, 5).map((e) => e.reason).join("; ")
        message.warning(`Часть строк пропущена: ${data.errors.length}. ${txt}`)
      }
      setPickerOpen(false)
      await load()
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось добавить позиции")
    }
  }

  if (!rootId) {
    return <Empty description="Выберите деталь выше" />
  }

  return (
    <Card
      size="small"
      bodyStyle={{ padding: 12 }}
      title={
        <Space size={8} wrap>
          <Text type="secondary">BOM</Text>
          <Text type="secondary">•</Text>
          <Text type="secondary">Позиции: {totalCount}</Text>
        </Space>
      }
      extra={
        <Space wrap>
          <Tag color="geekblue">
            Родитель: {selectedRow?.cat_number || part?.cat_number || "—"}
          </Tag>
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setPickerOpen(true)}
            disabled={!selectedId}
          >
            Добавить позицию
          </Button>
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
          selectable
          treeData={treeData}
          expandedKeys={expandedKeys}
          onExpand={setExpandedKeys}
          selectedKeys={selectedKeys}
          onSelect={(keys) => setSelectedKeys(keys)}
        />
      )}

      <BomChildPickerDrawer
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        parentPartId={selectedId}
        parentCatNumber={selectedRow?.cat_number || part?.cat_number}
        parentDescription={selectedRow?.description_ru || selectedRow?.description_en}
        manufacturerName={manufacturerName}
        modelName={modelName}
        modelId={modelId || null}
        excludeIds={excludeIds}
        onPick={handlePickParts}
      />
    </Card>
  )
}
