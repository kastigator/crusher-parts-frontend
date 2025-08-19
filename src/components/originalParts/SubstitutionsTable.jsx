import React, { useEffect, useState } from "react"
import { Table, message, Empty } from "antd"
import axios from "@/api/axiosInstance"

export default function SubstitutionsTable({ part }) {
  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!part?.id) return
    setLoading(true)
    try {
      const { data } = await axios.get("/original-part-substitutions", { params: { part_id: part.id } })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      if (e?.response?.status === 404) {
        setRows([])
      } else {
        console.error(e); message.error("Не удалось загрузить замены")
        setRows([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [part?.id]) // eslint-disable-line

  if (rows && rows.length === 0) return <Empty description="Замен пока нет" />

  return (
    <Table
      rowKey={(r) => r.id}
      size="small"
      loading={loading}
      pagination={false}
      dataSource={rows || []}
      columns={[
        { title: "Группа", dataIndex: "group_code", width: 140 },
        { title: "Тип", dataIndex: "relation_type", width: 120 },
        { title: "Cat #", dataIndex: "cat_number", width: 160 },
        { title: "Описание", dataIndex: "description", ellipsis: true },
      ]}
    />
  )
}
