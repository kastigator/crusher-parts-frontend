// src/components/originalParts/BomTable.jsx
import React, { useEffect, useMemo, useRef, useState } from "react"
import { Table, Button, InputNumber, Space, message, Empty } from "antd"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"
import BomChildPickerDrawer from "./BomChildPickerDrawer"

export default function BomTable({ parentId, parentPart, modelId, manufacturerName, modelName }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const qtyDraft = useRef(new Map())

  const load = async () => {
    if (!parentId) return
    setLoading(true)
    try {
      const { data } = await axios.get("/original-part-bom", { params: { parent_id: parentId } })
      setRows(Array.isArray(data) ? data : [])
      qtyDraft.current.clear()
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить состав BOM")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [parentId])

  const handleDelete = async (row) => {
    const { confirmed } = await confirmAction("Удалить позицию из BOM?")
    if (!confirmed) return
    try {
      await axios.delete(`/original-part-bom/${row.id}`)
      message.success("Удалено")
      setRows(prev => prev.filter(r => r.id !== row.id))
      qtyDraft.current.delete(row.id)
    } catch (e) {
      console.error(e)
      message.error("Ошибка удаления")
    }
  }

  const handleQtyChange = (row, val) => {
    setRows(prev => prev.map(r => (r.id === row.id ? { ...r, quantity: val } : r)))
    qtyDraft.current.set(row.id, val)
  }
  const handleQtyBlur = async (row) => {
    const draft = qtyDraft.current.get(row.id)
    if (draft == null) return
    try {
      await axios.put(`/original-part-bom/${row.id}`, { quantity: draft })
      qtyDraft.current.delete(row.id)
      message.success("Количество обновлено")
    } catch (e) {
      console.error(e)
      message.error("Не удалось обновить количество")
      load()
    }
  }

  const excludeIds = useMemo(() => rows.map(r => r.child_part_id), [rows])

  const columns = [
    { title: "Child Cat #", dataIndex: "child_cat_number", width: 200 },
    {
      title: "Описание",
      dataIndex: "child_description_ru",
      ellipsis: true,
      onHeaderCell: () => ({ style: { width: 420, minWidth: 420, maxWidth: 420 } }),
      onCell:       () => ({ style: { width: 420, minWidth: 420, maxWidth: 420 } }),
      render: (v, r) => v || r.child_description_en || "—",
    },
    {
      title: "Кол-во",
      dataIndex: "quantity",
      width: 160,
      align: "right",
      render: (_, r) => (
        <InputNumber
          value={r.quantity}
          min={0}
          step={0.0001}
          precision={4}
          onChange={(v) => handleQtyChange(r, v)}
          onBlur={() => handleQtyBlur(r)}
          style={{ width: 120 }}
        />
      ),
    },
    {
      title: "Действия",
      width: 120,
      render: (_, r) => (
        <Space>
          <Button danger size="small" onClick={() => handleDelete(r)}>
            Удалить
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <Button type="primary" onClick={() => setPickerOpen(true)} disabled={!modelId || !parentId}>
          Добавить позицию
        </Button>
      </div>

      {(!rows.length && !loading) ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Состав не задан" />
      ) : (
        <Table
          className="op-table"
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={loading}
          pagination={false}
          size="small"
          tableLayout="fixed"
          scroll={{ x: true }}
        />
      )}

      <BomChildPickerDrawer
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        parentPartId={parentId}
        parentCatNumber={parentPart?.cat_number}
        parentDescription={parentPart?.description_ru || parentPart?.description_en}
        manufacturerName={manufacturerName}
        modelName={modelName}
        modelId={modelId}
        excludeIds={excludeIds}
        onPick={async (picked) => {
          try {
            await Promise.all(
              picked.map(p =>
                axios.post("/original-part-bom", {
                  parent_id: parentId,
                  child_id: p.id,
                  quantity: 1,
                })
              )
            )
            message.success("Добавлено")
            setPickerOpen(false)
            load()
          } catch (e) {
            console.error(e)
            message.error("Не удалось добавить в BOM")
          }
        }}
      />
    </>
  )
}
