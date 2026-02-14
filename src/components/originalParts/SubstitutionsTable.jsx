import React, { useCallback, useEffect, useState } from "react"
import { Table, Button, message, Empty } from "antd"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"

export default function SubstitutionsTable({ originalPartId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!originalPartId) return
    setLoading(true)
    try {
      const { data } = await axios.get("/original-part-substitutions", {
        params: { original_part_id: originalPartId }, // важно: original_part_id
      })
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      message.error("Ошибка загрузки замен")
    } finally {
      setLoading(false)
    }
  }, [originalPartId])

  useEffect(() => { load() }, [originalPartId, load])

  const deleteGroup = async (row) => {
    const { confirmed } = await confirmAction("Удалить группу замен?")
    if (!confirmed) return
    try {
      await axios.delete(`/original-part-substitutions/${row.id}`)
      message.success("Удалено")
      setRows(prev => prev.filter(r => r.id !== row.id))
    } catch (err) {
      console.error(err)
      message.error("Ошибка удаления")
    }
  }

  const columns = [
    { title: "Название", dataIndex: "name", ellipsis: true },
    { title: "Комментарий", dataIndex: "comment", ellipsis: true },
    { title: "Режим", dataIndex: "mode", width: 100 },
    {
      title: "Позиции",
      width: 140,
      render: (_, r) => (Array.isArray(r.items) ? r.items.length : 0),
    },
    {
      title: "Действия",
      width: 100,
      render: (_, r) => (
        <Button danger size="small" onClick={() => deleteGroup(r)}>
          Удалить
        </Button>
      ),
    },
  ]

  return rows.length === 0 && !loading ? (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Нет замен (комплектов)" />
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
  )
}
