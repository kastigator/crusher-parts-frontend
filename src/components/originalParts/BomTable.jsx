import React, { useState, useEffect, useCallback } from "react"
import { Table, Button, InputNumber, message } from "antd"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"
import BomChildPickerDrawer from "./BomChildPickerDrawer"

export default function BomTable({ parentId, modelId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const load = useCallback(async () => {
    if (!parentId) return
    setLoading(true)
    try {
      const { data } = await axios.get("/bom-items", { params: { parent_part_id: parentId } })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить состав BOM")
    } finally {
      setLoading(false)
    }
  }, [parentId])

  useEffect(() => {
    load()
  }, [load])

  const handlePickParts = async (items) => {
    if (!items?.length) return
    try {
      const body = items.map((p) => ({
        parent_part_id: parentId,
        child_part_id: p.id,
        quantity: p.qty,
      }))
      await axios.post("/bom-items", body)
      message.success("Детали добавлены в BOM")
      setDrawerOpen(false)
      load()
    } catch (e) {
      console.error(e)
      message.error("Ошибка при добавлении в BOM")
    }
  }

  const handleDelete = async (row) => {
    const { confirmed } = await confirmAction("Удалить запись из BOM?")
    if (!confirmed) return
    try {
      await axios.delete(`/bom-items/${row.id}`)
      message.success("Удалено из BOM")
      load()
    } catch (e) {
      console.error(e)
      message.error("Ошибка при удалении")
    }
  }

  const columns = [
    { title: "Part number", dataIndex: "cat_number", width: 180 },
    { title: "Описание", dataIndex: "description_ru", render: (v) => v || "—" },
    {
      title: "Кол-во",
      width: 120,
      render: (_, r) => (
        <InputNumber
          value={r.quantity}
          min={0.0001}
          step={0.0001}
          onChange={async (val) => {
            try {
              await axios.put(`/bom-items/${r.id}`, { quantity: val })
              setRows((prev) => prev.map((p) => (p.id === r.id ? { ...p, quantity: val } : p)))
            } catch {
              message.error("Ошибка при обновлении количества")
            }
          }}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Действия",
      width: 100,
      render: (_, r) => (
        <Button danger size="small" onClick={() => handleDelete(r)}>
          Удалить
        </Button>
      ),
    },
  ]

  return (
    <div className="parts-table-wrap">
      <Button type="primary" onClick={() => setDrawerOpen(true)} style={{ marginBottom: 8 }}>
        Добавить позицию
      </Button>

      <Table
        rowKey="id"
        className="op-table"
        columns={columns}
        dataSource={rows}
        loading={loading}
        size="small"
        pagination={false}
      />

      <BomChildPickerDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        parentPartId={parentId}
        modelId={modelId}
        excludeIds={rows.map((r) => r.child_part_id)}
        onPick={handlePickParts}
      />
    </div>
  )
}
