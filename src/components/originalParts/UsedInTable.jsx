import React, { useEffect, useState } from "react"
import { Table, message, Empty } from "antd"
import axios from "@/api/axiosInstance"

export default function UsedInTable({ child }) {
  const [rows, setRows] = useState(null) // null пока грузим; [] если пусто
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!child?.id) return
    setLoading(true)
    try {
      const { data } = await axios.get("/original-part-bom/parents", { params: { child_id: child.id } })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      if (e?.response?.status === 404) {
        setRows([]) // нет эндпоинта — аккуратно показываем пусто
      } else {
        console.error(e); message.error("Не удалось загрузить 'Где используется'")
        setRows([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [child?.id]) // eslint-disable-line

  if (rows && rows.length === 0) {
    return <Empty description="Данных пока нет" />
  }

  return (
    <Table
      rowKey={(r) => `${r.parent_id}:${r.child_id}`}
      size="small"
      loading={loading}
      pagination={false}
      dataSource={rows || []}
      columns={[
        { title: "Родитель Cat #", dataIndex: "parent_cat_number", width: 160 },
        { title: "Родитель", render: (_, r) => r.parent_description_ru || r.parent_description_en || "—" },
        { title: "Кол-во", dataIndex: "quantity", width: 120 },
      ]}
    />
  )
}

