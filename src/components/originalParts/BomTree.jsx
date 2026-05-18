// src/components/originalParts/BomTree.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Card, Empty, Tree, Space, Button, Typography, message, Tooltip, Tag } from "antd"
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"
import BomChildPickerDrawer from "./BomChildPickerDrawer"
import BomQuantityInput from "./BomQuantityInput"
import { runTrashDeleteFlow } from "@/utils/trashUi"

const { Text } = Typography

/**
 * Ожидается backend-ответ /original-part-bom/tree/:id
 * c полями: node_id, parent_part_id, edge_qty, cat_number,
 *           description_ru, description_en, level, path, mult_qty
 */
export default function BomTree({ part, modelId: currentModelId, manufacturerName, modelName, onOpenPart }) {
  const rootId = part?.id || null
  const modelId = currentModelId || part?.equipment_model_id || null
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [expandedKeys, setExpandedKeys] = useState([])
  const [selectedKeys, setSelectedKeys] = useState([])
  const [checkedKeys, setCheckedKeys] = useState([])
  const [pickerOpen, setPickerOpen] = useState(false)

  // загрузка дерева
  const load = useCallback(async () => {
    let ignore = false
    if (!rootId) {
      setRows([])
      setExpandedKeys([])
      setSelectedKeys([])
      setCheckedKeys([])
      return () => {}
    }
    setLoading(true)
    try {
      const params = modelId ? { equipment_model_id: modelId } : undefined
      const { data } = await axios.get(`/original-part-bom/tree/${rootId}`, { params })
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
  }, [rootId, modelId])

  useEffect(() => {
    let cleanup = () => {}
    load().then((c) => { if (typeof c === "function") cleanup = c })
    return () => cleanup()
  }, [load])

  const updateQty = useCallback(async (parentId, childId, nextQty) => {
    if (!parentId || !childId) return
    const qtyNum = Number(nextQty)
    if (!Number.isInteger(qtyNum) || qtyNum <= 0) {
      message.warning("Количество должно быть целым числом > 0")
      return
    }
    try {
      await axios.put("/original-part-bom", {
        parent_part_id: parentId,
        child_part_id: childId,
        equipment_model_id: modelId || undefined,
        quantity: qtyNum,
      })
      await load()
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось обновить количество")
    }
  }, [load, modelId])

  const removeRow = useCallback(async (parentId, childId) => {
    const { confirmed } = await confirmAction("Удалить позицию из BOM?")
    if (!confirmed) return
    try {
      const result = await runTrashDeleteFlow({
        entityType: "oem_part_model_bom",
        entityId: parentId,
        previewParams: { child_part_id: childId, equipment_model_id: modelId || undefined },
        deleteUrl: "/original-part-bom",
        deleteParams: { parent_part_id: parentId, child_part_id: childId, equipment_model_id: modelId || undefined },
        successMessage: "Строка BOM удалена",
      })
      if (result?.deleted) {
        await load()
      }
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось удалить позицию")
    }
  }, [load, modelId])

  const removeCheckedRows = useCallback(async () => {
    const selectedRows = checkedKeys
      .map((key) => rows.find((row) => Number(row.node_id) === Number(key)))
      .filter((row) => row && Number(row.level) > 0 && row.parent_part_id)

    if (!selectedRows.length) {
      message.warning("Выберите позиции для удаления")
      return
    }

    const { confirmed } = await confirmAction(`Удалить выбранные позиции из BOM (${selectedRows.length})?`)
    if (!confirmed) return

    try {
      const { data } = await axios.delete("/original-part-bom/bulk", {
        data: {
          items: selectedRows.map((row) => ({
            parent_part_id: row.parent_part_id,
            child_part_id: row.node_id,
            equipment_model_id: modelId || undefined,
          })),
        },
      })
      const deleted = Number(data?.deleted || 0)
      if (deleted) message.success(`Удалено позиций: ${deleted}`)
      if (Array.isArray(data?.skipped) && data.skipped.length) {
        message.warning(`Часть строк не удалена: ${data.skipped.length}`)
      }
      setCheckedKeys([])
      await load()
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось удалить выбранные позиции")
    }
  }, [checkedKeys, rows, load, modelId])

  // построение иерархии AntD Tree из плоского списка
  const { treeData, allKeys, allDeletableKeys, totalCount, rowById, rootRow } = useMemo(() => {
    if (!Array.isArray(rows) || rows.length === 0) {
      return {
        treeData: [],
        allKeys: [],
        allDeletableKeys: [],
        totalCount: 0,
        rowById: new Map(),
        rootRow: null,
      }
    }

    // создаём узлы и карта по id
    const nodeMap = new Map()
    const childrenMap = new Map() // id -> массив детей
    const rowMap = new Map()
    const keys = []
    const deletableKeys = []

    // подготовка всех узлов
    for (const r of rows) {
      rowMap.set(r.node_id, r)
      if (Number(r.level) > 0) deletableKeys.push(r.node_id)
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
                <BomQuantityInput
                  size="small"
                  value={r.edge_qty ?? 1}
                  onCommit={(nextQty) => updateQty(r.parent_part_id, r.node_id, nextQty)}
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
        disableCheckbox: Number(r.level) <= 0,
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

    return { treeData, allKeys: keys, allDeletableKeys: deletableKeys, totalCount, rowById: rowMap, rootRow }
  }, [rows, removeRow, updateQty, onOpenPart])

  // по умолчанию разворачиваем всё при смене данных
  useEffect(() => {
    setExpandedKeys(allKeys)
    if (rootRow?.node_id) {
      setSelectedKeys((prev) => (prev?.length ? prev : [rootRow.node_id]))
    }
  }, [allKeys, rootRow?.node_id])

  useEffect(() => {
    const allowed = new Set(allDeletableKeys.map((key) => Number(key)))
    setCheckedKeys((prev) => prev.filter((key) => allowed.has(Number(key))))
  }, [allDeletableKeys])

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

  const selectedChildKeys = useMemo(
    () =>
      rows
        .filter((row) => Number(row.parent_part_id) === Number(selectedId))
        .map((row) => row.node_id),
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
        equipment_model_id: modelId || undefined,
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
          <Button
            size="small"
            disabled={!selectedChildKeys.length}
            onClick={() => setCheckedKeys(selectedChildKeys)}
          >
            Выделить дочерние
          </Button>
          <Button
            size="small"
            disabled={!allDeletableKeys.length}
            onClick={() => setCheckedKeys(allDeletableKeys)}
          >
            Выделить всё
          </Button>
          <Button
            size="small"
            disabled={!checkedKeys.length}
            onClick={() => setCheckedKeys([])}
          >
            Снять
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            disabled={!checkedKeys.length}
            onClick={removeCheckedRows}
          >
            Удалить выбранные ({checkedKeys.length})
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
          checkable
          checkStrictly
          blockNode
          selectable
          treeData={treeData}
          expandedKeys={expandedKeys}
          onExpand={setExpandedKeys}
          checkedKeys={checkedKeys}
          onCheck={(keys) => setCheckedKeys(Array.isArray(keys) ? keys : keys?.checked || [])}
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
