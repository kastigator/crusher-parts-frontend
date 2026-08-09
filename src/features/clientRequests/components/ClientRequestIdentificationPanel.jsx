import React, { useCallback, useEffect, useState } from "react"
import { Alert, Button, Form, Input, Modal, Select, Space, Table, Tag, message } from "antd"
import axios from "@/api/axiosInstance"
import useCapabilities from "@/hooks/useCapabilities"
import { getIdentification, saveIdentification, saveRequirements } from "../api/clientRequestsApi"

const STATUS_VALUES = [
  "unprocessed", "suggested", "needs_review", "confirmed",
  "needs_client_clarification", "technical_task_open", "not_required",
]
const STATUS_LABELS = {
  unprocessed: "Не обработано", suggested: "Предложено", needs_review: "Требует проверки",
  confirmed: "Подтверждено", needs_client_clarification: "Нужно уточнение клиента",
  technical_task_open: "Открыта техническая задача", not_required: "Не требуется",
}
const STATUS_OPTIONS = STATUS_VALUES.map((value) => ({ value, label: STATUS_LABELS[value] }))
const POLICY_VALUES = [
  "exact_only", "equivalent_requires_approval", "equivalent_allowed",
  "open_to_proposals", "unspecified",
]
const POLICY_LABELS = {
  exact_only: "Только точное совпадение", equivalent_requires_approval: "Аналог после согласования",
  equivalent_allowed: "Разрешены аналоги", open_to_proposals: "Рассмотреть предложения",
  unspecified: "Не определено",
}
const POLICY_OPTIONS = POLICY_VALUES.map((value) => ({ value, label: POLICY_LABELS[value] }))
const READINESS_LABELS = { ready: "Готово к выпуску", blocked: "Есть блокеры", inactive: "Неактивно" }

const catalogLabel = (row) => [
  row.manufacturer_part_number || row.position_code,
  row.display_name_ru || row.display_name || row.display_name_en,
].filter(Boolean).join(" · ")

export default function ClientRequestIdentificationPanel({ revisionId }) {
  const { can } = useCapabilities()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(null)
  const [catalogOptions, setCatalogOptions] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [form] = Form.useForm()

  const load = useCallback(async () => {
    if (!revisionId) return
    setLoading(true)
    try { setRows(await getIdentification(revisionId)) }
    catch (error) { message.error(error?.response?.data?.message || "Ошибка загрузки идентификации") }
    finally { setLoading(false) }
  }, [revisionId])
  useEffect(() => { load() }, [load])

  const openEditor = (row) => {
    setEditing(row)
    form.setFieldsValue({
      catalog_position_id: row.identification_catalog_position_id,
      identification_status: row.identification_catalog_position_id ? "confirmed" : (row.identification_status || "unprocessed"),
      match_method: row.match_method || "manual",
      basis_note: row.basis_note,
      substitution_policy: row.substitution_policy || "unspecified",
      technical_requirements: row.technical_requirements,
      procurement_note: row.procurement_note,
    })
    if (row.identification_catalog_position_id) {
      setCatalogOptions([{ value: Number(row.identification_catalog_position_id), label: row.catalog_position_name || `Catalog Position ${row.identification_catalog_position_id}` }])
    } else setCatalogOptions([])
  }
  const searchCatalog = async (query) => {
    if (String(query || "").trim().length < 2) return
    setCatalogLoading(true)
    try {
      const { data } = await axios.get("/catalog-positions", { params: { q: query, limit: 50 } })
      setCatalogOptions((Array.isArray(data) ? data : []).map((row) => ({ value: Number(row.id), label: catalogLabel(row), row })))
    } catch (error) { message.error(error?.response?.data?.message || "Не удалось найти позицию каталога") }
    finally { setCatalogLoading(false) }
  }
  const save = async () => {
    const values = await form.validateFields()
    if (can("client_requests.identify_items")) {
      await saveIdentification(editing.id, values)
    }
    if (can("client_requests.manage_requirements")) {
      await saveRequirements(editing.id, values)
    }
    message.success("Идентификация и требования сохранены")
    setEditing(null)
    await load()
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Alert type="info" showIcon message="Выберите существующую позицию каталога" description="Здесь сохраняется только идентификация строки заявки. Классификатор и инженерные данные не изменяются." />
      <Table
        rowKey="id" loading={loading} dataSource={rows} pagination={false}
        columns={[
          { title: "Строка", dataIndex: "line_number", width: 80 },
          { title: "Описание клиента", dataIndex: "client_description" },
          { title: "Позиция каталога", render: (_, row) => row.catalog_position_name || "—" },
          { title: "Идентификация", render: (_, row) => <Tag>{STATUS_LABELS[row.identification_status] || row.identification_status || STATUS_LABELS.unprocessed}</Tag> },
          { title: "Замены", render: (_, row) => <Tag>{POLICY_LABELS[row.substitution_policy] || POLICY_LABELS.unspecified}</Tag> },
          { title: "Готовность", render: (_, row) => <Tag color={row.readiness?.ready ? "green" : "orange"}>{READINESS_LABELS[row.readiness?.readiness_status] || row.readiness?.readiness_status}</Tag> },
          { title: "", render: (_, row) => <Button onClick={() => openEditor(row)} disabled={!can("client_requests.identify_items", "client_requests.manage_requirements")}>Открыть</Button> },
        ]}
      />
      <Modal title={`Строка ${editing?.line_number || ""}`} open={!!editing} onCancel={() => setEditing(null)} onOk={save} okText="Сохранить">
        <Form form={form} layout="vertical">
          <Form.Item name="catalog_position_id" label="Позиция каталога" rules={[{ required: true, message: "Выберите позицию из каталога" }]}>
            <Select showSearch filterOption={false} onSearch={searchCatalog} loading={catalogLoading} options={catalogOptions} placeholder="Введите номер или описание (минимум 2 символа)" />
          </Form.Item>
          <Form.Item name="identification_status" label="Статус"><Select options={STATUS_OPTIONS} /></Form.Item>
          <Form.Item name="match_method" label="Метод"><Select options={[["manual","Выбрано вручную"],["exact_number","Точное совпадение артикула"],["client_part_link","Связь с артикулом клиента"],["bom_match","Совпадение по составу оборудования"],["property_match","Совпадение по свойствам"],["import_hint","Подсказка из импорта"],["legacy_link","Ранее сохранённая связь"],["other","Другой"]].map(([value,label]) => ({ value, label }))} /></Form.Item>
          <Form.Item name="basis_note" label="Основание"><Input.TextArea /></Form.Item>
          <Form.Item name="substitution_policy" label="Политика замен"><Select options={POLICY_OPTIONS} /></Form.Item>
          <Form.Item name="technical_requirements" label="Технические требования"><Input.TextArea /></Form.Item>
          <Form.Item name="procurement_note" label="Примечание для закупки"><Input.TextArea /></Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}
