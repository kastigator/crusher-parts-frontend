import React, { useCallback, useEffect, useState } from "react"
import { Alert, Button, Checkbox, Space, Table, Tag, message } from "antd"
import { useNavigate } from "react-router-dom"
import useCapabilities from "@/hooks/useCapabilities"
import { createProcurementRelease, finalizeRevision, getReadiness } from "../api/clientRequestsApi"

export default function ClientRequestReleasePanel({ revisionId }) {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const [model, setModel] = useState(null)
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!revisionId) return
    setLoading(true)
    try {
      const next = await getReadiness(revisionId)
      setModel(next)
      setSelected(next.items.filter((item) => item.readiness?.ready).map((item) => item.id))
    } catch (error) { message.error(error?.response?.data?.message || "Ошибка расчёта готовности") }
    finally { setLoading(false) }
  }, [revisionId])
  useEffect(() => { load() }, [load])

  const finalize = async () => {
    await finalizeRevision(revisionId)
    message.success("Ревизия зафиксирована")
    await load()
  }
  const release = async () => {
    const result = await createProcurementRelease({
      client_request_revision_id: revisionId,
      item_ids: selected,
      idempotency_key: `ui-release-${revisionId}-${selected.slice().sort().join("-")}`,
    })
    message.success(`Procurement Release #${result.release.release_number} создан`)
    await load()
    navigate(`/sourcing?release=${result.release.id}`)
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Alert type="info" showIcon message="Релиз в закупку — неизменяемый снимок выбранных готовых строк" description="Создание релиза не запускает запросы поставщикам и не меняет ответственность за заявку клиента." />
      <Space wrap>
        <Tag>Всего: {model?.summary?.total_active || 0}</Tag>
        <Tag color="green">Готово: {model?.summary?.ready_count || 0}</Tag>
        <Tag color="orange">Блокеры: {model?.summary?.blocked_count || 0}</Tag>
        <Tag color={model?.summary?.revision_finalized ? "blue" : "default"}>{model?.summary?.revision_finalized ? "Ревизия зафиксирована" : "Черновик ревизии"}</Tag>
        {!model?.summary?.revision_finalized ? <Button onClick={finalize} disabled={!can("client_requests.manage_revisions")}>Зафиксировать ревизию</Button> : null}
        <Button type="primary" onClick={release} disabled={!model?.summary?.revision_finalized || !selected.length || !can("client_requests.release_to_procurement")}>Создать Procurement Release</Button>
      </Space>
      <Table
        rowKey="id" loading={loading} dataSource={model?.items || []} pagination={false}
        rowSelection={{ selectedRowKeys: selected, onChange: setSelected, getCheckboxProps: (row) => ({ disabled: !row.readiness?.ready }) }}
        columns={[
          { title: "Строка", dataIndex: "line_number", width: 80 },
          { title: "Описание", dataIndex: "client_description" },
          { title: "Готовность", render: (_, row) => <Tag color={row.readiness?.ready ? "green" : "orange"}>{row.readiness?.ready ? "Готово к выпуску" : "Требует внимания"}</Tag> },
          { title: "Блокеры", render: (_, row) => (row.readiness?.blockers || row.readiness?.blocker_codes || []).map((blocker) => { const code = typeof blocker === "string" ? blocker : blocker.code; return <Tag key={code} title={code}>{typeof blocker === "string" ? blocker.replaceAll("_", " ").toLowerCase() : blocker.message || code}</Tag> }) },
        ]}
      />
      <Checkbox checked={selected.length > 0 && selected.length === model?.summary?.ready_count} disabled>Выбраны все готовые строки</Checkbox>
    </Space>
  )
}
