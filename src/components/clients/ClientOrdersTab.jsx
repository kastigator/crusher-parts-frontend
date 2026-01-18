import React, { useEffect, useState } from "react"
import { Card, Space, Table, message } from "antd"
import axios from "@/api/axiosInstance"

export default function ClientOrdersTab({ clientId }) {
  const [requests, setRequests] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const [reqs, conts] = await Promise.all([
        axios.get("/client-requests", { params: { client_id: clientId } }),
        axios.get("/contracts", { params: { client_id: clientId } }),
      ])
      setRequests(Array.isArray(reqs.data) ? reqs.data : [])
      setContracts(Array.isArray(conts.data) ? conts.data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить историю клиента")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={16}>
      <Card size="small" title="Заявки клиента">
        <Table
          rowKey="id"
          dataSource={requests}
          loading={loading}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: "Статус", dataIndex: "status", width: 140 },
            { title: "Источник", dataIndex: "source_type", width: 140 },
            { title: "Референс", dataIndex: "client_reference" },
            { title: "Контакт", dataIndex: "contact_name" },
            { title: "Создано", dataIndex: "created_at", width: 160 },
          ]}
        />
      </Card>

      <Card size="small" title="Контракты">
        <Table
          rowKey="id"
          dataSource={contracts}
          loading={loading}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: "Номер", dataIndex: "contract_number", width: 160 },
            { title: "Дата", dataIndex: "contract_date", width: 140 },
            { title: "Сумма", dataIndex: "amount", width: 120 },
            { title: "Валюта", dataIndex: "currency", width: 100 },
            { title: "Статус", dataIndex: "status", width: 120 },
          ]}
        />
      </Card>
    </Space>
  )
}
