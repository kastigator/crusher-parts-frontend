import React, { useEffect, useState } from "react"
import { Table, message } from "antd"
import axios from "@/api/axiosInstance"

export default function BomTree({ root }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!root?.id) return
    setLoading(true)
    try {
      const { data } = await axios.get(`/original-part-bom/tree/${root.id}`)
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e); message.error("Не удалось загрузить дерево BOM")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [root?.id]) // eslint-disable-line

  return (
    <Table
      rowKey={(r) => r.path}
      size="small"
      loading={loading}
      pagination={false}
      dataSource={rows}
      columns={[
        { title: "Уровень", dataIndex: "level", width: 90 },
        { title: "Cat #", dataIndex: "cat_number", width: 160 },
        { title: "Описание", render: (_, r) => r.description_ru || r.description_en || "—" },
        { title: "Mult.Qty", dataIndex: "mult_qty", width: 120 }
      ]}
    />
  )
}
