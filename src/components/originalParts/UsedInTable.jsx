import React, { useEffect, useState } from "react"
import { Table, message, Empty } from "antd"
import axios from "@/api/axiosInstance"

export default function UsedInTable({ partId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!partId) return
    setLoading(true)
    try {
      const { data } = await axios.get("/original-part-bom/used-in", { params: { child_id: partId } })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Ошибка загрузки списка родителей")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [partId])

  const columns = [
    { title: "Parent Cat #", dataIndex: "parent_cat_number", width: 200 },
    {
      title: "Родитель",
      dataIndex: "parent_description_ru",
      ellipsis: true,
      render: (v, r) => v || r.parent_description_en || "—",
    },
    { title: "Кол-во", dataIndex: "quantity", align: "right", width: 140 },
  ]

  return rows.length === 0 && !loading ? (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Не используется ни в одной сборке" />
  ) : (
    <Table
      className="op-table"
      rowKey={(r) => `${r.parent_id}:${r.child_id}`}
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
