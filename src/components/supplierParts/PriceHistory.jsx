// src/components/supplierParts/PriceHistory.jsx
import React, { useEffect, useState } from "react"
import { Table, message, Empty } from "antd"
import axios from "@/api/axiosInstance"

export default function PriceHistory({ supplierPartId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!supplierPartId) return
      setLoading(true)
      try {
        const { data } = await axios.get("/supplier-part-prices", {
          params: { supplier_part_id: supplierPartId }
        })
        setRows(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error(e); message.error("Не удалось загрузить историю цен")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [supplierPartId])

  if (!supplierPartId) return <Empty />

  return (
    <Table
      rowKey="id"
      size="small"
      loading={loading}
      dataSource={rows}
      pagination={{ pageSize: 10 }}
      columns={[
        { title: "Дата", dataIndex: "date", width: 180 },
        { title: "Цена", dataIndex: "price", width: 120 },
        { title: "Валюта", dataIndex: "currency", width: 100 },
        { title: "Комментарий", dataIndex: "comment" },
      ]}
    />
  )
}
