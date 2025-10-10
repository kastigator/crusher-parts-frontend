import React, { useEffect, useState } from "react"
import { Table, InputNumber, message, Button, Space } from "antd"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"
import BomChildPickerDrawer from "./BomChildPickerDrawer"

export default function BomTable({ parent, modelId, onReload }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const load = async () => {
    if (!parent?.id) return
    setLoading(true)
    try {
      const { data } = await axios.get(`/original-part-bom`, {
        params: { parent_id: parent.id },
      })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить BOM")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [parent?.id])

  const updateQty = async (rec, val) => {
    try {
      await axios.put(`/original-part-bom/${rec.id}`, { mult_qty: val })
      message.success("Количество обновлено")
      setRows((prev) =>
        prev.map((r) => (r.id === rec.id ? { ...r, mult_qty: val } : r))
      )
      onReload?.()
    } catch (e) {
      console.error(e)
      message.error("Ошибка обновления количества")
    }
  }

  const deleteRow = async (rec) => {
    const { confirmed } = await confirmAction("Удалить позицию из сборки?")
    if (!confirmed) return
    try {
      await axios.delete(`/original-part-bom/${rec.id}`)
      message.success("Удалено")
      setRows((prev) => prev.filter((r) => r.id !== rec.id))
      onReload?.()
    } catch (e) {
      console.error(e)
      message.error("Не удалось удалить позицию")
    }
  }

  const columns = [
    {
      title: "Part number",
      dataIndex: "cat_number",
      width: 180,
      render: (v) => v || "—",
    },
    {
      title: "Описание",
      dataIndex: "description_ru",
      ellipsis: true,
      render: (v, r) => v || r.description_en || "—",
    },
    {
      title: "Кол-во",
      dataIndex: "mult_qty",
      align: "right",
      width: 120,
      render: (_, r) => (
        <InputNumber
          min={0.001}
          step={0.001}
          value={r.mult_qty}
          onChange={(v) => updateQty(r, v)}
          style={{ width: "100%" }}
          size="small"
        />
      ),
    },
    {
      title: "Действия",
      key: "act",
      width: 100,
      render: (_, r) => (
        <Button size="small" danger onClick={() => deleteRow(r)}>
          Удалить
        </Button>
      ),
    },
  ]

  return (
    <div className="subtable-shell" style={{ width: "100%" }}>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Button
          type="primary"
          size="small"
          onClick={() => setDrawerOpen(true)}
          style={{ alignSelf: "flex-start" }}
        >
          Добавить позицию
        </Button>

        <Table
          className="op-table"
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={loading}
          pagination={false}
          size="small"
          scroll={{ x: true }} // ✅ устраняет переполнение
        />
      </Space>

      <BomChildPickerDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        parentId={parent?.id}
        modelId={modelId}
        onPicked={load}
      />
    </div>
  )
}
