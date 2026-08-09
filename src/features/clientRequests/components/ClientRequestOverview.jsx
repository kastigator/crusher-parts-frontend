import React, { useEffect, useState } from "react"
import { Alert, Button, Descriptions, Skeleton, Space, Statistic, Tag, Typography } from "antd"
import { useNavigate } from "react-router-dom"
import { getClientRequestWorkspace } from "../api/clientRequestsApi"

const { Text } = Typography

export default function ClientRequestOverview({ requestId }) {
  const navigate = useNavigate()
  const [model, setModel] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!requestId) return
    setError("")
    getClientRequestWorkspace(requestId).then(setModel).catch((reason) => {
      setError(reason?.response?.data?.message || "Не удалось загрузить рабочую область заявки")
    })
  }, [requestId])

  if (error) return <Alert type="error" message={error} />
  if (!model) return <Skeleton active paragraph={{ rows: 4 }} />

  const downstream = model.downstream || {}
  const counts = downstream.counts || {}
  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Descriptions size="small" column={{ xs: 1, md: 2 }} bordered>
        <Descriptions.Item label="Клиент">{model.request?.client_name || "—"}</Descriptions.Item>
        <Descriptions.Item label="Контакт">{model.request?.client_contact_name || "—"}</Descriptions.Item>
        <Descriptions.Item label="Установка">{model.request?.client_installation_name || "—"}</Descriptions.Item>
        <Descriptions.Item label="Стадия"><Tag>{model.request?.lifecycle_stage}</Tag></Descriptions.Item>
        <Descriptions.Item label="Текущая ревизия">{model.current_revision_id || "—"}</Descriptions.Item>
        <Descriptions.Item label="Релизов в закупку">{model.procurement_releases?.length || 0}</Descriptions.Item>
      </Descriptions>

      <Alert
        type="info"
        showIcon
        message="Состояние последующих этапов — только для чтения"
        description="Закупочная проработка, расчёт цены, коммерческое предложение и договор принадлежат своим разделам. Здесь показано только их текущее состояние."
      />
      <Space wrap>
        <Statistic title="Закупочных проработок" value={counts.sourcing || 0} />
        <Statistic title="Подборов" value={counts.selections || 0} />
        <Statistic title="Предложений" value={counts.offers || 0} />
        <Statistic title="Договоров" value={counts.contracts || 0} />
      </Space>
      <Space wrap>
        {(downstream.sourcing_cases || []).map((item) => (
          <Button type="primary" key={`sourcing-${item.id}`} onClick={() => navigate(`/sourcing?case=${item.id}`)}>
            Открыть {item.case_number || "закупочную проработку"}
          </Button>
        ))}
        {downstream.rfqs?.length ? <Text type="secondary">Исторические RFQ доступны только как архивная трассировка; рабочая навигация ведёт через раздел закупочной проработки.</Text> : null}
        {!downstream.sourcing_cases?.length && !downstream.rfqs?.length ? <Text type="secondary">Связанных закупочных проработок пока нет.</Text> : null}
      </Space>
    </Space>
  )
}
