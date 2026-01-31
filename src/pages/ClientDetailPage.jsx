// src/pages/ClientDetailPage.jsx
import React, { useEffect, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Button, Card, Empty, Space, Tag, Typography, message } from "antd"
import axios from "@/api/axiosInstance"
import TabRendererPage from "@/components/common/TabRendererPage"
import ClientMetaCard from "@/components/clients/ClientMetaCard"
import ClientDock from "@/components/clients/ClientDock"

const { Text } = Typography

export default function ClientDetailPage() {
  const { id } = useParams()
  const clientId = Number(id)
  const navigate = useNavigate()
  const location = useLocation()

  const [loading, setLoading] = useState(false)
  const [client, setClient] = useState(null)

  const load = async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const { data } = await axios.get(`/clients/${clientId}`)
      setClient(data || null)
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить клиента")
      setClient(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  const goBack = () => {
    const from = location.state?.from
    const listState = location.state?.listState
    if (from && listState) {
      navigate(from, { state: { restore: listState } })
      return
    }
    navigate("/clients")
  }

  const header = (
    <Space wrap size={8}>
      <Button onClick={goBack}>Назад к списку</Button>
      {client?.company_name ? (
        <Text type="secondary">Клиент: {client.company_name}</Text>
      ) : null}
      {client?.contact_person ? <Tag>Контакт: {client.contact_person}</Tag> : null}
      {client?.phone ? <Tag>{client.phone}</Tag> : null}
      {client?.email ? <Tag>{client.email}</Tag> : null}
    </Space>
  )

  return (
    <TabRendererPage tabKey="clients">
      <Space direction="vertical" style={{ width: "100%" }} size={12}>
        {header}

        {!clientId ? (
          <Card>
            <Empty description="Некорректный идентификатор клиента" />
          </Card>
        ) : !client && !loading ? (
          <Card>
            <Empty description="Клиент не найден" />
          </Card>
        ) : (
          <>
            <ClientMetaCard client={client} onSaved={load} />
            <ClientDock client={client} onChanged={load} />
          </>
        )}
      </Space>
    </TabRendererPage>
  )
}

