// src/components/originalParts/BomTable.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button, InputNumber, Space, Table, Typography, Tag, message, Tooltip } from "antd"
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"
import BomChildPickerDrawer from "./BomChildPickerDrawer"
import { runTrashDeleteFlow } from "@/utils/trashUi"

const { Text } = Typography

export default function BomTable({ part }) {
  const parentId = part?.id || null
  const modelId = part?.equipment_model_id || null

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const abortRef = useRef(null)

  const load = useCallback(async () => {
    if (!parentId) {
      setRows([])
      return
    }
    try {
      abortRef.current?.abort?.()
    } catch {
      // ignore abort errors
    }
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const { data } = await axios.get("/original-part-bom", {
        params: { parent_id: parentId },
        signal: controller.signal,
      })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      const name = e?.name || e?.code
      if (name !== "AbortError" && name !== "ERR_CANCELED") {
        console.error(e)
        message.error("Не удалось загрузить состав BOM")
      }
    } finally {
      setLoading(false)
    }
  }, [parentId])

  useEffect(() => {
    const t = setTimeout(load, 100)
    return () => {
      clearTimeout(t)
      try {
        abortRef.current?.abort?.()
      } catch {
        // ignore abort errors
      }
    }
  }, [load, parentId])

  // ===== Добавление через Drawer-пикер =====
  const handlePickParts = async (pickedRows) => {
    if (!parentId || !Array.isArray(pickedRows) || !pickedRows.length) return
    try {
      const items = pickedRows.map((r) => ({
        child_part_id: r.id,
        quantity: 1,
      }))

      const { data } = await axios.post("/original-part-bom/bulk", {
        parent_part_id: parentId,
        items,
      })
      const inserted = Number(data?.inserted || 0)
      if (inserted) message.success(`Добавлено позиций: ${inserted}`)
      if (Array.isArray(data?.errors) && data.errors.length) {
        const txt = data.errors.slice(0, 5).map((e) => e.reason).join("; ")
        message.warning(`Часть строк пропущена: ${data.errors.length}. ${txt}`)
      }
      setPickerOpen(false)
      load()
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось добавить позиции")
    }
  }

  // ===== Обновление количества =====
  const updateQty = useCallback(async (childId, nextQty) => {
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
      load()
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось обновить количество")
    }
  }, [parentId, load])

  // ===== Удаление строки =====
  const removeRow = useCallback(async (childId) => {
    const { confirmed } = await confirmAction("Удалить позицию из BOM?")
    if (!confirmed) return
    try {
      const result = await runTrashDeleteFlow({
        entityType: "oem_part_model_bom",
        entityId: parentId,
        previewParams: { child_part_id: childId },
        deleteUrl: "/original-part-bom",
        deleteParams: { parent_part_id: parentId, child_part_id: childId },
        successMessage: "Строка BOM удалена",
      })
      if (result?.deleted) {
        load()
      }
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось удалить позицию")
    }
  }, [parentId, load])

  const columns = useMemo(
    () => [
      {
        title: "Номер детали",
        dataIndex: "child_cat_number",
        width: 220,
        render: (v) => <Text strong>{v}</Text>,
      },
      {
        title: "Описание",
        dataIndex: "child_description_ru",
        ellipsis: true,
        render: (v, r) => v || r.child_description_en || "—",
      },
      {
        title: "Кол-во",
        dataIndex: "quantity",
        align: "right",
        width: 160,
        render: (v, r) => (
          <InputNumber
            min={0.0001}
            step={0.0001}
            precision={4}
            value={Number(v)}
            style={{ width: 120 }}
            onPressEnter={(e) => updateQty(r.child_part_id, e.target.value)}
            onBlur={(e) => updateQty(r.child_part_id, e.target.value)}
          />
        ),
      },
      {
        title: "Действия",
        key: "actions",
        width: 110,
        render: (_, r) => (
          <Space>
            <Tooltip title="Удалить строку">
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => removeRow(r.child_part_id)}
              />
            </Tooltip>
          </Space>
        ),
      },
    ],
    [updateQty, removeRow]
  )

  // уже находящиеся в составе — чтобы скрыть их в пикере
  const excludeIds = useMemo(
    () => rows.map((r) => Number(r.child_part_id)).filter(Boolean),
    [rows]
  )

  const header = (
    <Space style={{ width: "100%", marginBottom: 8 }} wrap>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        disabled={!parentId}
        onClick={() => setPickerOpen(true)}
      >
        Добавить позицию
      </Button>

      <Tag>Показано: {rows.length}</Tag>

      {part?.manufacturer_name || part?.model_name ? (
        <Tag color="geekblue">
          {part?.manufacturer_name ? `${part.manufacturer_name}` : ""}
          {part?.model_name ? ` / ${part.model_name}` : ""}
        </Tag>
      ) : null}
    </Space>
  )

  return (
    <div className="table-section">
      {header}

      <Table
        className="op-table"
        rowKey={(r) => `${r.parent_part_id}:${r.child_part_id}`}
        dataSource={rows}
        columns={columns}
        loading={loading}
        size="small"
        pagination={false}
        tableLayout="fixed"
        locale={{ emptyText: "Нет дочерних позиций" }}
      />

      {/* Drawer-пикер дочерних деталей */}
      <BomChildPickerDrawer
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        parentPartId={parentId}
        parentCatNumber={part?.cat_number}
        parentDescription={part?.description_ru || part?.description_en}
        manufacturerName={part?.manufacturer_name}
        modelName={part?.model_name}
        modelId={modelId || null}
        excludeIds={excludeIds}
        onPick={handlePickParts}
      />
    </div>
  )
}
