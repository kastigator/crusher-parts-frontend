// src/components/clients/BankDetailsMain.jsx

import React, { useState, useEffect } from "react"
import { message, Space, Card } from "antd"
import axios from "@/api/axiosInstance"
import BankDetailsTable from "./BankDetailsTable"

export default function BankDetailsMain({ clientId }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const res = await axios.get("/client-bank-details", {
        params: { client_id: clientId }
      })
      setData(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error("Ошибка загрузки банковских реквизитов:", err)
      message.error("Не удалось загрузить банковские реквизиты")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [clientId])

  if (!clientId) return null

  return (
    <Card title="Банковские реквизиты" size="small">
      <Space direction="vertical" style={{ width: "100%" }}>
        <BankDetailsTable
          clientId={clientId}
          data={data}
          setData={setData}
          loading={loading}
        />
      </Space>
    </Card>
  )
}
