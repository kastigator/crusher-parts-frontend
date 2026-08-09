import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert, Button, Card, Checkbox, Col, Descriptions, Divider, Drawer, Empty, Form,
  Input, InputNumber, List, Modal, Popconfirm, Row, Select, Skeleton, Space,
  Statistic, Table, Tabs, Tag, Timeline, Typography,
} from "antd"
import { useSearchParams } from "react-router-dom"
import PageWrapper from "@/components/common/PageWrapper"
import useCapabilities from "@/hooks/useCapabilities"
import { appMessage } from "@/utils/uiFeedback"
import {
  acceptSourcingCase, archiveSourcingCase, createCoverageOption, createSourcingCase,
  createSupplierInquiry, createSupplierOffer, dispatchSupplierInquiry,
  finalizeSourcingDecision, finalizeSupplierInquiry, finalizeSupplierOffer,
  getSourcingWorkspace, listSourcingCases, requestMasterDataPromotion,
  validateSourcingDecision, listSourcingReleaseIntake, listSourcingSuppliers,
} from "@/features/sourcing/api/sourcingApi"

const { Text, Title } = Typography

const STATUS_LABELS = {
  new: "Новый", in_progress: "В работе", waiting_responses: "Ожидаем ответы",
  offer_review: "Разбор предложений", decision_pending: "Покрытие неполное",
  decision_ready: "Готов к решению", decided: "Решение принято",
  released_to_pricing: "Передан в расчёт цены", blocked: "Заблокирован",
  on_hold: "На паузе", archived: "Архив", cancelled: "Отменён", closed: "Закрыт",
}
const STATUS_COLORS = {
  new: "default", in_progress: "processing", waiting_responses: "blue",
  offer_review: "cyan", decision_pending: "orange", decision_ready: "gold",
  decided: "green", released_to_pricing: "purple", blocked: "red",
  archived: "default", cancelled: "red",
}
const NEXT_ACTION_LABELS = {
  accept_case: "Принять кейс", prepare_inquiries: "Подготовить запросы",
  register_supplier_offer: "Зарегистрировать ответ", build_coverage: "Собрать покрытие",
  resolve_coverage_blockers: "Устранить блокеры", finalize_decision: "Зафиксировать решение",
  handoff_to_pricing: "Передать в расчёт цены", resolve_case_blocker: "Снять блокировку",
  resume_case: "Возобновить кейс",
}
const PRIORITY_LABELS = { low: "Низкий", normal: "Обычный", high: "Высокий", urgent: "Срочный" }
const SOURCE_LABELS = { manual: "Введено вручную", email: "Электронная почта", phone: "Телефон", portal: "Портал поставщика", price_list: "Прайс-лист", historic: "Исторические данные", negotiation: "Переговоры" }
const RELATIONSHIP_LABELS = { exact: "Точное соответствие", analog: "Аналог", substitute: "Замена", kit: "Комплект", component: "Компонент", unknown: "Не определено" }
const COVERAGE_TYPE_LABELS = { single: "Один поставщик", split: "Разделение между поставщиками", kit: "Комплект", partial: "Частичное покрытие", mixed: "Смешанный вариант", manual: "Собрано вручную" }
const REQUEST_TYPE_LABELS = { supplier_part: "Деталь поставщика", catalog_relation: "Связь с позицией каталога", supplier_price: "Цена поставщика", supplier_identity: "Карточка поставщика" }
const COUNTRY_OPTIONS = [
  { value: "FI", label: "Финляндия" }, { value: "CN", label: "Китай" },
  { value: "DE", label: "Германия" }, { value: "SE", label: "Швеция" },
  { value: "US", label: "США" }, { value: "RU", label: "Россия" },
]

const errorText = (reason) => reason?.response?.data?.error?.message || reason?.response?.data?.message || reason?.message || "Операция не выполнена"
const parseIds = (value) => String(value || "").split(",").map((item) => Number(item.trim())).filter((item) => Number.isInteger(item) && item > 0)
const fmtQty = (value) => value == null ? "—" : Number(value).toLocaleString("ru-RU", { maximumFractionDigits: 3 })
const dateToIso = (value) => {
  const match = String(value || "").trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value
}

function StatusTag({ value }) {
  return <Tag color={STATUS_COLORS[value]}>{STATUS_LABELS[value] || value || "—"}</Tag>
}

export default function SourcingWorkspacePage() {
  const { can } = useCapabilities()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedCaseId = Number(searchParams.get("case")) || null
  const requestedReleaseId = Number(searchParams.get("release")) || null
  const [cases, setCases] = useState([])
  const [model, setModel] = useState(null)
  const [loadingCases, setLoadingCases] = useState(true)
  const [loadingCase, setLoadingCase] = useState(false)
  const [error, setError] = useState("")
  const [drawer, setDrawer] = useState(null)
  const [releaseIntake, setReleaseIntake] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [createForm] = Form.useForm()
  const [inquiryForm] = Form.useForm()
  const [offerForm] = Form.useForm()
  const [coverageForm] = Form.useForm()
  const [decisionForm] = Form.useForm()
  const [promotionForm] = Form.useForm()

  const loadCases = useCallback(async () => {
    setLoadingCases(true)
    try {
      const [caseRows, releaseRows, supplierRows] = await Promise.all([
        listSourcingCases(), listSourcingReleaseIntake(), listSourcingSuppliers(),
      ])
      setCases(caseRows); setReleaseIntake(releaseRows); setSuppliers(supplierRows)
    }
    catch (reason) { setError(errorText(reason)) }
    finally { setLoadingCases(false) }
  }, [])

  const loadCase = useCallback(async (caseId) => {
    if (!caseId) { setModel(null); return }
    setLoadingCase(true)
    try { setModel(await getSourcingWorkspace(caseId)); setError("") }
    catch (reason) { setError(errorText(reason)) }
    finally { setLoadingCase(false) }
  }, [])

  useEffect(() => { loadCases() }, [loadCases])
  useEffect(() => {
    if (requestedCaseId) loadCase(requestedCaseId)
    else if (!loadingCases && cases.length) setSearchParams({ case: String(cases[0].id) }, { replace: true })
  }, [cases, loadCase, loadingCases, requestedCaseId, setSearchParams])
  useEffect(() => {
    if (!requestedReleaseId || loadingCases) return
    const release = releaseIntake.find((item) => Number(item.id) === requestedReleaseId)
    if (!release) return
    createForm.setFieldsValue({
      procurement_release_id: release.id,
      release_item_ids: release.items.map((item) => item.id),
      title: release.title || `${release.client_name} · ${release.request_number}`,
      priority: "normal",
    })
    setDrawer("case")
  }, [createForm, loadingCases, releaseIntake, requestedReleaseId])

  const refresh = useCallback(async () => {
    await Promise.all([loadCases(), requestedCaseId ? loadCase(requestedCaseId) : Promise.resolve()])
  }, [loadCase, loadCases, requestedCaseId])

  const run = async (operation, success, closeDrawer = true) => {
    try {
      const result = await operation()
      appMessage.success(success)
      if (closeDrawer) setDrawer(null)
      await refresh()
      return result
    } catch (reason) {
      appMessage.error(errorText(reason))
      return null
    }
  }

  const demandOptions = (model?.demands || []).map((item) => ({
    label: `#${item.line_number_snapshot} · ${item.catalog_position_name || item.catalog_part_number || item.stable_item_key_snapshot} · ${fmtQty(item.admitted_quantity)} ${item.uom_snapshot}`,
    value: Number(item.id),
  }))
  const inquiryOptions = (model?.inquiries || []).map((item) => ({ label: `${item.supplier_name} · #${item.id}`, value: Number(item.id), supplierId: Number(item.supplier_id) }))
  const supplierOptions = suppliers.map((item) => ({
    value: Number(item.id), label: [item.name, item.public_code, item.country].filter(Boolean).join(" · "),
  }))
  const selectedReleaseId = Form.useWatch("procurement_release_id", createForm)
  const selectedRelease = releaseIntake.find((item) => Number(item.id) === Number(selectedReleaseId))
  const offerLines = useMemo(() => (model?.offers || []).flatMap((offer) =>
    (offer.revisions || []).filter((revision) => revision.status === "finalized").flatMap((revision) =>
      (revision.lines || []).map((line) => ({ ...line, offer, revision }))
    )
  ), [model])
  const optionChoices = (model?.coverage_options || []).filter((item) => item.status === "valid").map((item) => ({ label: `${item.option_code} · ${item.title || item.option_type}`, value: Number(item.id) }))

  const caseColumns = [
    { title: "Кейс", dataIndex: "case_number", render: (value, row) => <Space direction="vertical" size={0}><Text strong>{value}</Text><Text type="secondary" ellipsis style={{ maxWidth: 220 }}>{row.title}</Text></Space> },
    { title: "Статус", dataIndex: "status", width: 150, render: (value) => <StatusTag value={value} /> },
    { title: "Потребности", dataIndex: "demand_count", width: 110 },
    { title: "Следующее действие", dataIndex: "next_action", render: (value) => NEXT_ACTION_LABELS[value] || "—" },
  ]

  const createCase = async (values) => {
    const result = await run(() => createSourcingCase({
      procurement_release_id: values.procurement_release_id,
      release_item_ids: values.release_item_ids || [],
      title: values.title, priority: values.priority, owner_user_id: values.owner_user_id,
    }), "Закупочная проработка создана")
    if (result?.case_id) setSearchParams({ case: String(result.case_id) })
  }

  const createInquiry = (values) => run(() => createSupplierInquiry(model.case.id, values), "Запрос поставщику создан")
  const createOffer = (values) => {
    const selectedDemand = (model?.demands || []).find((item) => Number(item.id) === Number(values.demand_id))
    return run(() => createSupplierOffer(model.case.id, {
    supplier_inquiry_id: values.supplier_inquiry_id,
    supplier_id: values.supplier_id,
    source_type: values.supplier_inquiry_id ? "inquiry" : values.source_type,
    currency: values.currency,
    offer_reference: values.offer_reference,
    lines: [{
      supplier_part_id: values.supplier_part_id,
      offered_catalog_position_id: values.offered_catalog_position_id || selectedDemand?.catalog_position_id_snapshot,
      supplier_part_number: values.supplier_part_number,
      description: values.description,
      relationship_type: values.relationship_type,
      supplier_reply_status: "quoted",
      offered_quantity: values.offered_quantity,
      moq: values.moq,
      pack_quantity: values.pack_quantity,
      unit_price: values.unit_price,
      currency: values.currency,
      lead_time_days: values.lead_time_days,
      validity_until: dateToIso(values.validity_until),
      payment_terms: values.payment_terms,
      incoterms: values.incoterms,
      incoterms_place: values.incoterms_place,
      origin_country: values.origin_country,
      demands: [{ demand_id: values.demand_id, capable_quantity: values.offered_quantity }],
    }],
    }), "Предложение поставщика сохранено как черновик")
  }
  const createCoverage = (values) => run(() => createCoverageOption(model.case.id, {
    option_code: values.option_code, option_type: values.option_type, title: values.title,
    lines: [{ demand_id: values.demand_id, offer_line_id: values.offer_line_id,
      allocated_quantity: values.allocated_quantity, purchase_quantity: values.purchase_quantity,
      approval_reference: values.approval_reference }],
  }), "Вариант покрытия рассчитан")
  const finalizeDecision = async (values) => {
    const validation = await run(() => validateSourcingDecision(model.case.id, values.option_ids), "Проверка решения выполнена", false)
    if (!validation?.valid) { appMessage.error(`Решение заблокировано: ${(validation?.blockers || []).map((item) => item.code).join(", ")}`); return }
    await run(() => finalizeSourcingDecision(model.case.id, values), "Решение закупочной проработки зафиксировано")
  }
  const promote = (values) => run(() => requestMasterDataPromotion(drawer.offerLineId, {
    request_type: values.request_type, proposed_values: { value: values.proposed_value, note: values.note },
  }), "Запрос на проверку справочных данных создан")

  const details = model?.case
  const tabs = model ? [
    {
      key: "summary", label: "Обзор", children: <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Alert type="info" showIcon message={`Следующее действие: ${NEXT_ACTION_LABELS[details.next_action] || "не требуется"}`} description="Закупочная проработка работает только с зафиксированным релизом заявки клиента. Исходная заявка доступна для просмотра, но не изменяется здесь." />
        <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
          <Descriptions.Item label="Ответственный">{details.owner_name || `#${details.owner_user_id || "—"}`}</Descriptions.Item>
          <Descriptions.Item label="Приоритет">{PRIORITY_LABELS[details.priority] || details.priority}</Descriptions.Item>
          <Descriptions.Item label="Релизы в закупку">{(model.release_links || []).map((link) => <Tag key={link.id}>Релиз {link.release_number}</Tag>)}</Descriptions.Item>
        </Descriptions>
        <Row gutter={16}>
          <Col xs={12} md={6}><Statistic title="Позиции" value={model.demands.length} /></Col>
          <Col xs={12} md={6}><Statistic title="Запросы поставщикам" value={model.inquiries.length} /></Col>
          <Col xs={12} md={6}><Statistic title="Предложения" value={model.offers.length} /></Col>
          <Col xs={12} md={6}><Statistic title="Варианты покрытия" value={model.coverage_options.length} /></Col>
        </Row>
      </Space>,
    },
    {
      key: "demands", label: `Позиции (${model.demands.length})`, children: <Table size="small" rowKey="id" pagination={false} dataSource={model.demands} columns={[
        { title: "№", dataIndex: "line_number_snapshot", width: 70 },
        { title: "Потребность", render: (_, row) => <Text strong>{row.catalog_position_name || row.catalog_part_number || row.stable_item_key_snapshot}</Text> },
        { title: "Количество", render: (_, row) => `${fmtQty(row.admitted_quantity)} ${row.uom_snapshot}` },
        { title: "Замены", dataIndex: "substitution_policy_snapshot" },
        { title: "Состояние", dataIndex: "status", render: (value) => <Tag>{value === "active" ? "Активна" : value === "covered" ? "Покрыта" : "На проверке"}</Tag> },
      ]} />,
    },
    {
      key: "inquiries", label: `Запросы (${model.inquiries.length})`, children: <Space direction="vertical" style={{ width: "100%" }}>
        {can("sourcing.inquiries.manage") && <Button type="primary" onClick={() => { inquiryForm.resetFields(); inquiryForm.setFieldsValue({ demand_ids: model.demands.map((item) => Number(item.id)), language: "en" }); setDrawer("inquiry") }}>Новый запрос поставщику</Button>}
        <List bordered dataSource={model.inquiries} locale={{ emptyText: "Запросов пока нет" }} renderItem={(item) => {
          const latest = item.revisions?.at(-1)
          return <List.Item actions={can("sourcing.inquiries.manage") ? [
            latest?.status === "draft" ? <Button key="finalize" onClick={() => run(() => finalizeSupplierInquiry(item.id), "Запрос зафиксирован", false)}>Зафиксировать</Button> : null,
            latest?.status === "finalized" && item.status !== "sent" ? <Button key="dispatch" type="primary" onClick={() => run(() => dispatchSupplierInquiry(item.id, { channel: "email", recipient_snapshot: { supplier_id: item.supplier_id } }), "Отправка зафиксирована", false)}>Отметить отправленным</Button> : null,
          ].filter(Boolean) : []}>
            <List.Item.Meta title={<Space><Text strong>{item.supplier_name}</Text><Tag>{item.status === "sent" ? "Отправлен" : item.status === "draft" ? "Черновик" : "Зафиксирован"}</Tag></Space>} description={`Версий: ${item.revisions?.length || 0} · отправок: ${item.revisions?.reduce((sum, rev) => sum + (rev.dispatches?.length || 0), 0) || 0}`} />
          </List.Item>
        }} />
      </Space>,
    },
    {
      key: "offers", label: `Предложения (${model.offers.length})`, children: <Space direction="vertical" style={{ width: "100%" }}>
        {can("sourcing.offers.manage") && <Button type="primary" onClick={() => { offerForm.resetFields(); offerForm.setFieldsValue({ source_type: "manual", relationship_type: "exact", currency: "EUR" }); setDrawer("offer") }}>Зарегистрировать предложение</Button>}
        <List bordered dataSource={model.offers} locale={{ emptyText: "Предложений пока нет" }} renderItem={(offer) => {
          const latest = offer.revisions?.at(-1)
          return <List.Item actions={can("sourcing.offers.manage") && latest?.status === "draft" ? [<Button key="finalize" type="primary" onClick={() => run(() => finalizeSupplierOffer(offer.id), "Предложение зафиксировано", false)}>Зафиксировать</Button>] : []}>
            <List.Item.Meta title={<Space><Text strong>{offer.supplier_name}</Text><Tag>{offer.status === "draft" ? "Черновик" : "Зафиксировано"}</Tag></Space>} description={<Space wrap>{(latest?.lines || []).map((line) => <Card key={line.id} size="small"><Space direction="vertical" size={2}><Text>{line.supplier_part_number_snapshot || "Без артикула"}</Text><Text>{line.unit_price} {line.currency} · {line.relationship_type === "exact" ? "точное соответствие" : line.relationship_type === "analog" ? "аналог" : "замена"}</Text><Text type="secondary">Срок: {line.lead_time_days ?? "—"} дн. · {line.incoterms || "условия не указаны"} {line.incoterms_place || ""}</Text>{can("sourcing.master_data_promotion.request") && <Button size="small" onClick={() => { promotionForm.resetFields(); promotionForm.setFieldsValue({ request_type: "supplier_part", proposed_value: line.supplier_part_number_snapshot }); setDrawer({ type: "promotion", offerLineId: line.id }) }}>Запросить проверку справочника</Button>}</Space></Card>)}</Space>} />
          </List.Item>
        }} />
      </Space>,
    },
    {
      key: "coverage", label: `Покрытие (${model.coverage_options.length})`, children: <Space direction="vertical" style={{ width: "100%" }}>
        {can("sourcing.coverage.manage") && <Button type="primary" disabled={!offerLines.length} onClick={() => { coverageForm.resetFields(); coverageForm.setFieldsValue({ option_type: "single" }); setDrawer("coverage") }}>Новый вариант покрытия</Button>}
        <Table size="small" rowKey="id" pagination={false} dataSource={model.coverage_options} columns={[
          { title: "Код", dataIndex: "option_code" }, { title: "Тип", dataIndex: "option_type", render: (value) => COVERAGE_TYPE_LABELS[value] || value },
          { title: "Статус", dataIndex: "status", render: (value) => <Tag color={value === "valid" || value === "selected" ? "green" : value === "blocked" ? "red" : "orange"}>{value === "valid" ? "Проверен" : value === "selected" ? "Выбран" : value === "blocked" ? "Заблокирован" : "Черновик"}</Tag> },
          { title: "Строки", render: (_, row) => row.lines?.length || 0 },
          { title: "Причины блокировки", render: (_, row) => { const blockers = Array.isArray(row.blocker_json) ? row.blocker_json : []; return blockers.length ? blockers.map((item) => <Tag color="red" key={`${item.code}-${item.demand_id}`}>Требуются дополнительные данные</Tag>) : "—" } },
        ]} />
      </Space>,
    },
    {
      key: "decision", label: `Решение (${model.decisions.length})`, children: <Space direction="vertical" style={{ width: "100%" }}>
        {details.status === "decided" ? <Alert type="success" showIcon message="Решение закупочной проработки зафиксировано" description="Решение и его строки неизменяемы; дальнейший расчёт выполняется в блоке «Расчёт цены»." /> : null}
        {can("sourcing.decisions.finalize") && details.status !== "decided" && <Button type="primary" disabled={!optionChoices.length} onClick={() => { decisionForm.resetFields(); setDrawer("decision") }}>Проверить и зафиксировать решение</Button>}
        <List bordered dataSource={model.decisions} locale={{ emptyText: "Решение ещё не принято" }} renderItem={(item) => <List.Item><List.Item.Meta title={<Space><Text strong>Решение, версия {item.revision_number}</Text><Tag color="green">Зафиксировано</Tag></Space>} description={`${item.lines?.length || 0} строк · ${item.decision_note || "без примечания"}`} /></List.Item>} />
      </Space>,
    },
    {
      key: "history", label: "История", children: <Timeline items={(model.history || []).map((event) => ({ color: "blue", children: <Space direction="vertical" size={0}><Text strong>{event.event_type}</Text><Text type="secondary">{event.created_at ? new Date(event.created_at).toLocaleString("ru-RU") : ""} · {event.actor_name || `user #${event.actor_user_id || "system"}`}</Text></Space> }))} />,
    },
  ] : []

  return <PageWrapper title="Закупочная проработка">
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {error ? <Alert type="error" showIcon message={error} closable onClose={() => setError("")} /> : null}
      <Card>
        <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
          <Space direction="vertical" size={0}><Title level={3} style={{ margin: 0 }}>Закупочная проработка</Title><Text type="secondary">Потребность → запрос поставщику → предложение → покрытие → решение</Text></Space>
          {can("sourcing.cases.manage") && <Button type="primary" onClick={() => { createForm.resetFields(); createForm.setFieldsValue({ priority: "normal" }); setDrawer("case") }}>Принять релиз в закупку</Button>}
        </Space>
      </Card>
      <Card title="Очередь кейсов" bodyStyle={{ padding: 0 }}>
        <Table rowKey="id" size="small" loading={loadingCases} columns={caseColumns} dataSource={cases} pagination={{ pageSize: 8 }} onRow={(row) => ({ onClick: () => setSearchParams({ case: String(row.id) }), style: { cursor: "pointer", background: Number(row.id) === requestedCaseId ? "#e6f4ff" : undefined } })} />
      </Card>
      {loadingCase ? <Skeleton active paragraph={{ rows: 8 }} /> : details ? <Card title={<Space><Text strong>{details.case_number}</Text><StatusTag value={details.status} /><Text type="secondary">{details.title}</Text></Space>} extra={<Space>
        {details.status === "new" && can("sourcing.cases.manage") ? <Button type="primary" onClick={() => run(() => acceptSourcingCase(details.id), "Кейс принят", false)}>Принять</Button> : null}
        {can("sourcing.cases.manage") && !["archived", "released_to_pricing"].includes(details.status) ? <Popconfirm title="Архивировать кейс?" onConfirm={() => run(() => archiveSourcingCase(details.id, { reason: "Archived from Sourcing workspace" }), "Кейс архивирован", false)}><Button>Архивировать</Button></Popconfirm> : null}
      </Space>}><Tabs items={tabs} /></Card> : <Empty description="Выберите закупочную проработку" />}
    </Space>

    <Drawer title="Новая закупочная проработка" width={520} open={drawer === "case"} onClose={() => setDrawer(null)} destroyOnClose extra={<Button type="primary" onClick={() => createForm.submit()}>Создать</Button>}>
      <Alert type="info" message="Источник — зафиксированный релиз заявки клиента" style={{ marginBottom: 16 }} />
      <Form form={createForm} layout="vertical" onFinish={createCase}>
        <Form.Item name="procurement_release_id" label="Релиз в закупку" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={releaseIntake.map((release) => ({ value: Number(release.id), label: `${release.client_name} · ${release.request_number} · релиз ${release.release_number} · ${release.items.length} поз.` }))} onChange={(value) => { const release = releaseIntake.find((item) => Number(item.id) === Number(value)); createForm.setFieldValue("release_item_ids", release?.items.map((item) => item.id) || []) }} /></Form.Item>
        <Form.Item name="release_item_ids" label="Позиции для закупки" rules={[{ required: true }]}><Checkbox.Group options={(selectedRelease?.items || []).map((item) => ({ value: Number(item.id), label: `Строка ${item.line_number} · ${item.part_number || item.description || "Позиция"} · ${fmtQty(item.quantity)} ${item.uom}` }))} style={{ display: "flex", flexDirection: "column", gap: 8 }} /></Form.Item>
        <Form.Item name="title" label="Название"><Input /></Form.Item>
        <Form.Item name="priority" label="Приоритет"><Select options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))} /></Form.Item>
      </Form>
    </Drawer>

    <Drawer title="Запрос поставщику" width={560} open={drawer === "inquiry"} onClose={() => setDrawer(null)} destroyOnClose extra={<Button type="primary" onClick={() => inquiryForm.submit()}>Создать черновик</Button>}>
      <Form form={inquiryForm} layout="vertical" onFinish={createInquiry}>
        <Form.Item name="supplier_id" label="Поставщик" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={supplierOptions} placeholder="Выберите поставщика" /></Form.Item>
        <Form.Item name="demand_ids" label="Позиции" rules={[{ required: true }]}><Checkbox.Group options={demandOptions} style={{ display: "flex", flexDirection: "column", gap: 8 }} /></Form.Item>
        <Form.Item name="language" label="Язык"><Select options={[{ value: "ru", label: "Русский" }, { value: "en", label: "Английский" }, { value: "fi", label: "Финский" }]} /></Form.Item>
        <Form.Item name="subject" label="Тема"><Input /></Form.Item>
        <Form.Item name="message" label="Сообщение"><Input.TextArea rows={4} /></Form.Item>
      </Form>
    </Drawer>

    <Drawer title="Предложение поставщика" width={620} open={drawer === "offer"} onClose={() => setDrawer(null)} destroyOnClose extra={<Button type="primary" onClick={() => offerForm.submit()}>Сохранить черновик</Button>}>
      <Alert type="warning" showIcon message="Данные фиксируются в предложении поставщика" description="Справочники деталей, цен и позиций каталога этим действием не изменяются." style={{ marginBottom: 16 }} />
      <Form form={offerForm} layout="vertical" onFinish={createOffer}>
        <Form.Item name="supplier_inquiry_id" label="Связанный запрос поставщику"><Select allowClear options={inquiryOptions} onChange={(value) => { const selected = inquiryOptions.find((item) => item.value === value); if (selected) offerForm.setFieldValue("supplier_id", selected.supplierId) }} /></Form.Item>
        <Row gutter={12}><Col span={12}><Form.Item name="supplier_id" label="Поставщик" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={supplierOptions} /></Form.Item></Col><Col span={12}><Form.Item name="source_type" label="Источник"><Select options={Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label }))} /></Form.Item></Col></Row>
        <Form.Item name="demand_id" label="Позиция потребности" rules={[{ required: true }]}><Select options={demandOptions} /></Form.Item>
        <Row gutter={12}><Col span={12}><Form.Item name="supplier_part_number" label="Артикул поставщика"><Input /></Form.Item></Col><Col span={12}><Form.Item name="relationship_type" label="Соответствие потребности"><Select options={Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => ({ value, label }))} /></Form.Item></Col></Row>
        <Form.Item name="description" label="Описание"><Input /></Form.Item>
        <Row gutter={12}><Col span={8}><Form.Item name="offered_quantity" label="Доступно" rules={[{ required: true }]}><InputNumber min={0.001} style={{ width: "100%" }} /></Form.Item></Col><Col span={8}><Form.Item name="moq" label="MOQ"><InputNumber min={0.001} style={{ width: "100%" }} /></Form.Item></Col><Col span={8}><Form.Item name="pack_quantity" label="Упаковка"><InputNumber min={0.001} style={{ width: "100%" }} /></Form.Item></Col></Row>
        <Row gutter={12}><Col span={12}><Form.Item name="unit_price" label="Цена" rules={[{ required: true }]}><InputNumber min={0} precision={4} style={{ width: "100%" }} /></Form.Item></Col><Col span={12}><Form.Item name="currency" label="Валюта" rules={[{ required: true }]}><Input maxLength={3} /></Form.Item></Col></Row>
        <Row gutter={12}><Col span={12}><Form.Item name="lead_time_days" label="Срок поставки, дней" rules={[{ required: true }]}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col><Col span={12}><Form.Item name="validity_until" label="Действует до" rules={[{ required: true }, { pattern: /^\d{2}\.\d{2}\.\d{4}$/, message: "Укажите дату в формате ДД.ММ.ГГГГ" }]}><Input placeholder="ДД.ММ.ГГГГ" /></Form.Item></Col></Row>
        <Row gutter={12}><Col span={12}><Form.Item name="payment_terms" label="Условия оплаты" rules={[{ required: true }]}><Input placeholder="Например: 30% аванс, 70% перед отгрузкой" /></Form.Item></Col><Col span={12}><Form.Item name="origin_country" label="Страна происхождения" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={COUNTRY_OPTIONS} /></Form.Item></Col></Row>
        <Row gutter={12}><Col span={8}><Form.Item name="incoterms" label="Incoterms" rules={[{ required: true }]}><Select options={["EXW", "FCA", "FOB", "CIF", "DAP", "DDP"].map((value) => ({ value, label: value }))} /></Form.Item></Col><Col span={16}><Form.Item name="incoterms_place" label="Место по Incoterms" rules={[{ required: true }]}><Input /></Form.Item></Col></Row>
        <Form.Item name="offer_reference" label="Ссылка/номер предложения"><Input /></Form.Item>
      </Form>
    </Drawer>

    <Drawer title="Вариант покрытия" width={560} open={drawer === "coverage"} onClose={() => setDrawer(null)} destroyOnClose extra={<Button type="primary" onClick={() => coverageForm.submit()}>Проверить и сохранить</Button>}>
      <Form form={coverageForm} layout="vertical" onFinish={createCoverage}>
        <Form.Item name="option_code" label="Код варианта"><Input /></Form.Item>
        <Form.Item name="option_type" label="Тип"><Select options={Object.entries(COVERAGE_TYPE_LABELS).map(([value, label]) => ({ value, label }))} /></Form.Item>
        <Form.Item name="title" label="Название"><Input /></Form.Item>
        <Form.Item name="demand_id" label="Потребность" rules={[{ required: true }]}><Select options={demandOptions} /></Form.Item>
        <Form.Item name="offer_line_id" label="Предложение поставщика" rules={[{ required: true }]}><Select options={offerLines.map((line) => ({ value: Number(line.id), label: `${line.offer.supplier_name} · ${line.supplier_part_number_snapshot || "без артикула"} · ${line.unit_price} ${line.currency}` }))} /></Form.Item>
        <Row gutter={12}><Col span={12}><Form.Item name="allocated_quantity" label="Покрываемое количество" rules={[{ required: true }]}><InputNumber min={0.001} style={{ width: "100%" }} /></Form.Item></Col><Col span={12}><Form.Item name="purchase_quantity" label="Закупаемое количество"><InputNumber min={0.001} style={{ width: "100%" }} /></Form.Item></Col></Row>
        <Form.Item name="approval_reference" label="Подтверждение замены"><Input placeholder="Обязательно, если аналог или замена требуют согласования" /></Form.Item>
      </Form>
    </Drawer>

    <Modal title="Решение закупочной проработки" open={drawer === "decision"} onCancel={() => setDrawer(null)} onOk={() => decisionForm.submit()} okText="Проверить и зафиксировать" destroyOnClose>
      <Form form={decisionForm} layout="vertical" onFinish={finalizeDecision}>
        <Form.Item name="option_ids" label="Валидные варианты покрытия" rules={[{ required: true }]}><Checkbox.Group options={optionChoices} style={{ display: "flex", flexDirection: "column", gap: 8 }} /></Form.Item>
        <Divider />
        <Form.Item name="note" label="Примечание"><Input.TextArea rows={3} /></Form.Item>
        <Form.Item name="rationale" label="Обоснование"><Input.TextArea rows={3} /></Form.Item>
      </Form>
    </Modal>

    <Modal title="Запрос на проверку справочных данных" open={drawer?.type === "promotion"} onCancel={() => setDrawer(null)} onOk={() => promotionForm.submit()} okText="Создать запрос" cancelText="Отмена" destroyOnClose>
      <Form form={promotionForm} layout="vertical" onFinish={promote}>
        <Alert type="info" message="Запрос не изменяет справочник поставщиков автоматически" style={{ marginBottom: 16 }} />
        <Form.Item name="request_type" label="Тип" rules={[{ required: true }]}><Select options={Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => ({ value, label }))} /></Form.Item>
        <Form.Item name="proposed_value" label="Предлагаемое значение" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="note" label="Основание"><Input.TextArea rows={3} /></Form.Item>
      </Form>
    </Modal>
  </PageWrapper>
}
