import React, { useEffect, useState } from "react"
import { Table, Button, message, Empty } from "antd"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"

export default function SubstitutionsTable({ originalPartId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!originalPartId) return
    setLoading(true)
    try {
      const { data } = await axios.get("/original-part-substitutions", { params: { original_id: originalPartId } })
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      message.error("Ошибка загрузки замен")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [originalPartId])

  const deleteRow = async (rec) => {
    const { confirmed } = await confirmAction("Удалить замену?")
    if (!confirmed) return
    try {
      await axios.delete(`/original-part-substitutions/${rec.id}`)
      message.success("Удалено")
      setRows(prev => prev.filter(r => r.id !== rec.id))
    } catch (err) {
      console.error(err)
      message.error("Ошибка удаления")
    }
  }

  const columns = [
    { title: "Код комплекта", dataIndex: "kit_code", width: 180 },
    { title: "Описание", dataIndex: "description", ellipsis: true },
    {
      title: "Действия",
      width: 100,
      render: (_, r) => (
        <Button danger size="small" onClick={() => deleteRow(r)}>
          Удалить
        </Button>
      ),
    },
  ]

  return rows.length === 0 && !loading ? (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Нет замен (комплектов)" />
  ) : (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={rows}
      loading={loading}
      pagination={false}
      size="small"
      tableLayout="fixed"
    />
  )
}
