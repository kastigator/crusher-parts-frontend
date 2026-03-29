import React, { useCallback, useEffect, useState } from "react"
import { Table, message, Empty, Alert } from "antd"
import axios from "@/api/axiosInstance"

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
      title: "Статус",
      width: 220,
      render: () => "Legacy replacements отключены",
    },
  ]

  return rows.length === 0 && !loading ? (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Нет замен (комплектов)" />
  ) : (
    <>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="Legacy substitutions больше не поддерживаются"
        description="Таблица оставлена только для чтения. Удаление и редактирование старых substitution-групп отключено."
      />
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
    </>
  )
}
