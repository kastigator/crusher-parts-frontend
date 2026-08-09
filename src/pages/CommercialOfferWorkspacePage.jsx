import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert, Button, Card, Col, Descriptions, Drawer, Empty, Form, Input, InputNumber,
  List, Modal, Row, Select, Skeleton, Space, Statistic, Table, Tabs, Tag, Timeline, Typography,
} from "antd"
import { useSearchParams } from "react-router-dom"
import PageWrapper from "@/components/common/PageWrapper"
import useCapabilities from "@/hooks/useCapabilities"
import { appMessage } from "@/utils/uiFeedback"
import {
  acceptCommercialOffer, assessCommercialFeedback, createCommercialOffer,
  createCommercialOfferRevisionFromPricingDecision,
  createCommercialOfferNextRevision, decideCommercialApproval,
  getCommercialOfferClientPreview, getCommercialOfferReadiness,
  getCommercialOfferWorkspace, listCommercialOffers, listCommercialOfferPricingDecisions, markCommercialOfferReady,
  registerCommercialFeedback, renderCommercialOffer, sendCommercialOffer,
  submitCommercialOfferReview, updateCommercialOfferLine, updateCommercialOfferRevision,
} from "@/features/commercialOffers/api/commercialOfferApi"

const { Text, Title, Paragraph } = Typography
const errorText = (reason) => reason?.response?.data?.error?.message || reason?.response?.data?.message || reason?.message || "Операция не выполнена"
const fmt = (value) => value == null ? "—" : Number(value).toLocaleString("ru-RU", { maximumFractionDigits: 4 })
const STATUS_COLORS = { DRAFT: "default", INTERNAL_REVIEW: "orange", READY_TO_SEND: "gold", ISSUED: "blue", AWAITING_CLIENT: "blue", CHANGE_REQUESTED: "volcano", NEGOTIATION_IN_PROGRESS: "purple", PARTIALLY_ACCEPTED: "cyan", ACCEPTED: "green", REJECTED: "red", SUPERSEDED: "default" }
const STATUS_LABELS = { DRAFT:"Черновик", INTERNAL_REVIEW:"Внутреннее согласование", READY_TO_SEND:"Готово к отправке", ISSUED:"Выпущено", AWAITING_CLIENT:"Ожидается ответ клиента", CHANGE_REQUESTED:"Запрошены изменения", NEGOTIATION_IN_PROGRESS:"Согласование условий", PARTIALLY_ACCEPTED:"Принято частично", ACCEPTED:"Принято", REJECTED:"Отклонено", SUPERSEDED:"Заменено новой версией", REGISTERED:"Зарегистрировано", ASSESSED:"Оценено", CLOSED:"Закрыто", SUBMITTED:"На согласовании", APPROVED:"Утверждено" }
const NEXT_ACTION_LABELS = { DECIDE_APPROVAL:"Рассмотреть согласование", COMPLETE_DRAFT:"Заполнить черновик", RESOLVE_READINESS:"Проверить готовность", ISSUE_OFFER:"Выпустить предложение", REGISTER_CLIENT_FEEDBACK:"Зарегистрировать ответ клиента", ASSESS_CHANGE_IMPACT:"Оценить изменения", CONTINUE_NEGOTIATION_OR_CONTRACT:"Продолжить согласование или создать договор", HANDOFF_TO_CONTRACT:"Передать в договор" }
const FEEDBACK_LABELS = { ACCEPTED_AS_OFFERED:"Принято без изменений", CHANGE_REQUESTED:"Запрошены изменения", REJECTED:"Отклонено", NOT_REQUIRED:"Не требуется", CLARIFICATION:"Требуется уточнение" }
const CHANNEL_LABELS = { EMAIL:"Электронная почта", PORTAL:"Портал", MANUAL:"Вручную", LETTER:"Письмо", MEETING:"Встреча", PHONE:"Телефон", OTHER:"Другое" }

function Status({ value }) { return <Tag color={STATUS_COLORS[value]}>{STATUS_LABELS[value] || "Неизвестное состояние"}</Tag> }

export default function CommercialOfferWorkspacePage() {
  const { can } = useCapabilities()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedOfferId = Number(searchParams.get("offer")) || null
  const [offers, setOffers] = useState([])
  const [pricingDecisions, setPricingDecisions] = useState([])
  const [model, setModel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingOffer, setLoadingOffer] = useState(false)
  const [error, setError] = useState("")
  const [drawer, setDrawer] = useState(null)
  const [preview, setPreview] = useState(null)
  const [readiness, setReadiness] = useState(null)
  const [createForm] = Form.useForm()
  const [termsForm] = Form.useForm()
  const [lineForm] = Form.useForm()
  const [sendForm] = Form.useForm()
  const [feedbackForm] = Form.useForm()
  const [pricingRevisionForm] = Form.useForm()

  const loadOffers = useCallback(async () => {
    setLoading(true)
    try { const [offerRows, decisionRows] = await Promise.all([listCommercialOffers(), listCommercialOfferPricingDecisions()]); setOffers(offerRows); setPricingDecisions(decisionRows); setError("") }
    catch (reason) { setError(errorText(reason)) }
    finally { setLoading(false) }
  }, [])
  const loadOffer = useCallback(async (offerId) => {
    if (!offerId) { setModel(null); return }
    setLoadingOffer(true)
    try { setModel(await getCommercialOfferWorkspace(offerId)); setReadiness(null); setError("") }
    catch (reason) { setError(errorText(reason)) }
    finally { setLoadingOffer(false) }
  }, [])
  useEffect(() => { loadOffers() }, [loadOffers])
  useEffect(() => {
    if (selectedOfferId) loadOffer(selectedOfferId)
    else if (!loading && offers.length) setSearchParams({ offer: String(offers[0].id) }, { replace: true })
  }, [offers, loadOffer, loading, selectedOfferId, setSearchParams])
  const refresh = useCallback(async () => Promise.all([loadOffers(), selectedOfferId ? loadOffer(selectedOfferId) : Promise.resolve()]), [loadOffer, loadOffers, selectedOfferId])
  const run = async (operation, success, close = true) => {
    try { const result = await operation(); appMessage.success(success); if (close) setDrawer(null); await refresh(); return result }
    catch (reason) { appMessage.error(errorText(reason)); return null }
  }

  const offer = model?.offer
  const currentRevision = useMemo(() => model?.revisions?.find((item) => Number(item.id) === Number(offer?.current_revision_id)) || model?.revisions?.at(-1), [model, offer])
  const activeLines = (currentRevision?.lines || []).filter((line) => line.line_status === "ACTIVE")
  const sentSnapshots = (model?.revisions || []).flatMap((revision) => revision.sent_snapshots || [])

  const createOffer = async (values) => {
    const result = await run(() => createCommercialOffer({ ...values, payment_policy_snapshot_json: { due_date: values.payment_due_date }, client_delivery_commitment_days: values.client_delivery_commitment_days == null ? null : Number(values.client_delivery_commitment_days) }), "Коммерческое предложение создано")
    if (result?.offer_id) setSearchParams({ offer: String(result.offer_id) })
  }
  const createRevisionFromPricing = (values) => run(
    () => createCommercialOfferRevisionFromPricingDecision(offer.id, { pricing_decision_id: Number(values.pricing_decision_id) }),
    "Новая версия предложения создана из зафиксированного расчёта цены",
  )
  const editTerms = (values) => run(() => updateCommercialOfferRevision(currentRevision.id, { ...values, payment_policy_snapshot_json: { due_date: values.payment_due_date }, row_version: currentRevision.row_version }), "Условия версии сохранены")
  const editLine = (values) => run(() => updateCommercialOfferLine(drawer.line.id, values), "Позиция для клиента обновлена")
  const showReadiness = async () => {
    try { setReadiness(await getCommercialOfferReadiness(currentRevision.id)) }
    catch (reason) { appMessage.error(errorText(reason)) }
  }
  const showPreview = async () => {
    try { setPreview((await getCommercialOfferClientPreview(currentRevision.id)).payload) }
    catch (reason) { appMessage.error(errorText(reason)) }
  }
  const issue = (values) => run(() => sendCommercialOffer(currentRevision.id, { ...values, recipients: String(values.recipients || "").split(",").map((item) => item.trim()).filter(Boolean) }), "Версия выпущена, точная копия отправки сохранена")
  const registerFeedback = (values) => run(() => registerCommercialFeedback(offer.id, {
    sent_snapshot_id: values.sent_snapshot_id, channel: values.channel, evidence_reference: values.evidence_reference,
    overall_note: values.overall_note, lines: (values.line_ids || []).map((line_id) => ({ line_id, result: values.result,
      requested_quantity: values.requested_quantity, requested_unit_price: values.requested_unit_price,
      requested_execution_text: values.requested_execution_text, requested_delivery_days: values.requested_delivery_days,
      comment: values.comment })),
  }), "Ответ клиента зарегистрирован")

  const queueColumns = [
    { title: "Предложение", dataIndex: "offer_number", render: (value, row) => <Space direction="vertical" size={0}><Text strong>{value}</Text><Text type="secondary">{row.client_name}</Text></Space> },
    { title: "Версия", dataIndex: "current_revision_number", width: 90, render: (value) => value || "—" },
    { title: "Состояние", dataIndex: "aggregate_status", render: (value) => <Status value={value} /> },
    { title: "Сумма", render: (_, row) => `${fmt(row.aggregate_total)} ${row.currency || ""}` },
    { title: "Следующее действие", dataIndex: "next_action", render: (value) => NEXT_ACTION_LABELS[value] || "—" },
  ]

  const lineColumns = [
    { title: "#", dataIndex: "line_number", width: 55 },
    { title: "Позиция для клиента", render: (_, line) => <Space direction="vertical" size={0}><Text strong>{line.client_display_part_number || "Без артикула"}</Text><Text>{line.client_display_description}</Text></Space> },
    { title: "Количество", render: (_, line) => `${fmt(line.offered_quantity)} ${line.uom}` },
    { title: "Цена", render: (_, line) => <Space direction="vertical" size={0}><Text>{fmt(line.offered_unit_price)} {currentRevision.currency}</Text><Text type="secondary">Рекомендовано: {fmt(line.recommended_unit_price_snapshot)}</Text></Space> },
    { title: "Состояние", dataIndex: "line_status", render: (value) => <Tag>{value === "ACTIVE" ? "Активна" : "Исключена"}</Tag> },
    { title: "Действие", render: (_, line) => can("commercial_offers.manage") && currentRevision.status === "DRAFT" ? <Button size="small" onClick={() => { lineForm.setFieldsValue({ ...line, reason: line.override_reason }); setDrawer({ type: "line", line }) }}>Изменить</Button> : "Только просмотр" },
  ]

  const tabs = model && currentRevision ? [
    { key: "summary", label: "Обзор", children: <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Alert type="info" showIcon message="Коммерческое предложение создано из зафиксированного расчёта цены" description="В предложение не переносятся себестоимость, закупочные данные и сведения о поставщике." />
      <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
        <Descriptions.Item label="Источник цены">Зафиксированный расчёт, версия {offer.pricing_decision_revision}</Descriptions.Item>
        <Descriptions.Item label="Клиент">{offer.client_name}</Descriptions.Item>
        <Descriptions.Item label="Ответственный">{offer.owner_name || "Не назначен"}</Descriptions.Item>
        <Descriptions.Item label="Текущая версия"><Status value={currentRevision.status} /> {currentRevision.revision_number}</Descriptions.Item>
        <Descriptions.Item label="Данные клиента">{currentRevision.client_snapshot_json?.available ? "Зафиксированы" : "Недоступны"}</Descriptions.Item>
        <Descriptions.Item label="Реквизиты компании">{currentRevision.company_legal_snapshot_json?.available ? "Зафиксированы" : "Не заполнены"}</Descriptions.Item>
      </Descriptions>
      <Row gutter={16}><Col xs={12} md={6}><Statistic title="Позиций" value={activeLines.length} /></Col><Col xs={12} md={6}><Statistic title="Версий" value={model.revisions.length} /></Col><Col xs={12} md={6}><Statistic title="Отправок" value={sentSnapshots.length} /></Col><Col xs={12} md={6}><Statistic title="Принятых результатов" value={model.accepted_results.length} /></Col></Row>
    </Space> },
    { key: "lines", label: `Позиции (${activeLines.length})`, children: <Table size="small" rowKey="id" pagination={false} dataSource={currentRevision.lines || []} columns={lineColumns} /> },
    { key: "terms", label: "Условия", children: <Space direction="vertical" style={{ width: "100%" }}>
      {can("commercial_offers.manage") && currentRevision.status === "DRAFT" ? <Button type="primary" onClick={() => { termsForm.setFieldsValue({ ...currentRevision, payment_due_date: currentRevision.payment_policy_snapshot_json?.due_date }); setDrawer("terms") }}>Изменить коммерческие условия</Button> : null}
      <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
        <Descriptions.Item label="Валюта">{currentRevision.currency}</Descriptions.Item><Descriptions.Item label="Действует до">{currentRevision.validity_until || "—"}</Descriptions.Item>
        <Descriptions.Item label="Оплата">{currentRevision.payment_terms || "—"}</Descriptions.Item><Descriptions.Item label="Срок оплаты клиентом">{currentRevision.payment_policy_snapshot_json?.due_date || "—"}</Descriptions.Item>
        <Descriptions.Item label="Incoterms">{currentRevision.incoterms || "—"}</Descriptions.Item>
        <Descriptions.Item label="Место поставки">{currentRevision.destination || "—"}</Descriptions.Item><Descriptions.Item label="Срок поставки">{currentRevision.client_delivery_commitment_days ?? "—"} дн.</Descriptions.Item>
        <Descriptions.Item label="Гарантия">{currentRevision.warranty_terms || "—"}</Descriptions.Item><Descriptions.Item label="Частичная поставка">{currentRevision.partial_delivery_terms || "—"}</Descriptions.Item>
      </Descriptions>
    </Space> },
    { key: "readiness", label: "Готовность и вид для клиента", children: <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Space wrap><Button onClick={showReadiness}>Проверить готовность</Button><Button type="primary" onClick={showPreview}>Показать как клиенту</Button>{can("commercial_offers.issue") ? <Button onClick={() => run(() => renderCommercialOffer(currentRevision.id), "Документ сформирован", false)}>Сформировать документ</Button> : null}</Space>
      {readiness ? <Alert type={readiness.ready ? "success" : "error"} showIcon message={readiness.ready ? "Готово к выпуску" : "Выпуск заблокирован"} description={<Space direction="vertical">{readiness.blockers.map((item, index) => <Tag color="red" key={`${item.code}-${index}`}>Не заполнено обязательное поле{item.field ? `: ${item.field}` : ""}</Tag>)}{readiness.warnings.map((item) => <Tag color="orange" key={item.code}>Требуется внимание</Tag>)}</Space>} /> : <Empty description="Выполните проверку готовности" />}
    </Space> },
    { key: "approvals", label: `Согласования (${currentRevision.approvals?.length || 0})`, children: <List bordered dataSource={currentRevision.approvals || []} locale={{ emptyText: "Запросы на согласование отсутствуют" }} renderItem={(approval) => <List.Item actions={approval.status === "SUBMITTED" && can("commercial_offers.approvals.decide") ? [<Button key="approve" type="primary" onClick={() => run(() => decideCommercialApproval(approval.id, { action: "APPROVE", comment: "Согласовано" }), "Согласование утверждено", false)}>Утвердить</Button>,<Button key="reject" danger onClick={() => run(() => decideCommercialApproval(approval.id, { action: "REJECT", comment: "Отклонено" }), "Согласование отклонено", false)}>Отклонить</Button>] : []}><List.Item.Meta title={<Space><Text strong>{approval.approval_type === "PRICE" ? "Цена" : "Представление данных"}</Text><Status value={approval.status} /></Space>} description={`${approval.reason} · версия правил ${approval.policy_version}`} /></List.Item>} /> },
    { key: "communication", label: "Общение с клиентом", children: <Space direction="vertical" size={12} style={{ width: "100%" }}>
      {can("commercial_offers.feedback.manage") && sentSnapshots.length ? <Button type="primary" onClick={() => { feedbackForm.resetFields(); feedbackForm.setFieldsValue({ sent_snapshot_id: sentSnapshots.at(-1).id, line_ids: activeLines.map((line) => Number(line.id)), channel: "EMAIL", result: "ACCEPTED_AS_OFFERED" }); setDrawer("feedback") }}>Зарегистрировать ответ клиента</Button> : null}
      <List bordered dataSource={model.feedback || []} locale={{ emptyText: "Ответы клиента отсутствуют" }} renderItem={(item) => <List.Item actions={[
        item.status === "REGISTERED" && can("commercial_offers.feedback.manage") ? <Button key="impact" onClick={() => run(() => assessCommercialFeedback(item.id), "Влияние изменений оценено", false)}>Оценить изменения</Button> : null,
        item.status === "ASSESSED" && can("commercial_offers.manage") ? <Button key="revision" onClick={() => run(() => createCommercialOfferNextRevision(item.id), "Новая версия согласования создана", false)}>Создать следующую версию</Button> : null,
        item.status !== "CLOSED" && item.lines?.some((line) => line.result === "ACCEPTED_AS_OFFERED") && can("commercial_offers.accept") ? <Button key="accept" type="primary" onClick={() => run(() => acceptCommercialOffer(offer.id, { feedback_id: item.id, accepted_by_external_text: "Подтверждение клиента" }), "Принятый результат зафиксирован", false)}>Зафиксировать принятие</Button> : null,
      ].filter(Boolean)}><List.Item.Meta title={<Space><Text strong>Ответ клиента</Text><Status value={item.status} /></Space>} description={`${CHANNEL_LABELS[item.channel] || "Канал не указан"} · ${item.evidence_reference} · ${(item.lines || []).map((line) => FEEDBACK_LABELS[line.result] || "Уточнение").join(", ")}`} /></List.Item>} />
    </Space> },
    { key: "revisions", label: `Версии (${model.revisions.length})`, children: <Space direction="vertical" style={{ width: "100%" }}>{can("commercial_offers.manage") && !["ACCEPTED","PARTIALLY_ACCEPTED","CLOSED"].includes(offer.aggregate_status) ? <Button onClick={() => { pricingRevisionForm.resetFields(); setDrawer("pricing-revision") }}>Создать версию из нового расчёта цены</Button> : null}<List bordered dataSource={model.revisions} renderItem={(revision) => <List.Item><List.Item.Meta title={<Space><Text strong>Версия {revision.revision_number}</Text><Status value={revision.status} /></Space>} description="Источник: зафиксированный расчёт цены" /></List.Item>} /></Space> },
    { key: "accepted", label: "Принятый результат для договора", children: model.accepted_results.length ? <List bordered dataSource={model.accepted_results} renderItem={(item) => <List.Item><List.Item.Meta title={<Space><Text strong>Принятый результат</Text><Tag color="green">Зафиксирован</Tag></Space>} description={`${item.lines?.length || 0} поз. · ${fmt(item.aggregate_total)} ${item.currency}`} /></List.Item>} /> : <Empty description="Принятый результат ещё не создан" /> },
    { key: "history", label: "История", children: <Timeline items={(model.history || []).map((event) => ({ children: <Space direction="vertical" size={0}><Text strong>{String(event.event_type || "Событие").replaceAll("_", " ").toLowerCase()}</Text><Text type="secondary">{event.created_at ? new Date(event.created_at).toLocaleString("ru-RU") : ""} · {event.actor_name || "Система"}</Text></Space> }))} /> },
  ] : []

  return <PageWrapper title="Коммерческие предложения">
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {error ? <Alert type="error" showIcon message={error} closable onClose={() => setError("")} /> : null}
      <Card><Space wrap style={{ width: "100%", justifyContent: "space-between" }}><Space direction="vertical" size={0}><Title level={3} style={{ margin: 0 }}>Коммерческие предложения</Title><Text type="secondary">Расчёт цены → предложение клиенту → согласование → отправка → ответ клиента → договор</Text></Space>{can("commercial_offers.manage") ? <Button type="primary" onClick={() => { createForm.resetFields(); setDrawer("create") }}>Принять расчёт цены</Button> : null}</Space></Card>
      <Card title="Очередь предложений" bodyStyle={{ padding: 0 }}><Table rowKey="id" size="small" loading={loading} dataSource={offers} columns={queueColumns} pagination={{ pageSize: 8 }} onRow={(row) => ({ onClick: () => setSearchParams({ offer: String(row.id) }), style: { cursor: "pointer", background: Number(row.id) === selectedOfferId ? "#e6f4ff" : undefined } })} /></Card>
      {loadingOffer ? <Skeleton active paragraph={{ rows: 8 }} /> : offer && currentRevision ? <Card title={<Space><Text strong>{offer.offer_number}</Text><Status value={offer.aggregate_status} /><Text type="secondary">R{currentRevision.revision_number}</Text></Space>} extra={<Space wrap>
        {currentRevision.status === "DRAFT" && can("commercial_offers.manage") ? <Button onClick={() => run(() => submitCommercialOfferReview(currentRevision.id), "Версия передана на внутреннее согласование", false)}>Передать на согласование</Button> : null}
        {currentRevision.status === "INTERNAL_REVIEW" && can("commercial_offers.issue") ? <Button type="primary" onClick={() => run(() => markCommercialOfferReady(currentRevision.id), "Версия готова к выпуску", false)}>Подтвердить готовность</Button> : null}
        {currentRevision.status === "READY_TO_SEND" && can("commercial_offers.issue") ? <Button type="primary" onClick={() => { sendForm.resetFields(); sendForm.setFieldsValue({ channel: "MANUAL" }); setDrawer("send") }}>Выпустить и отправить</Button> : null}
      </Space>}><Tabs items={tabs} /></Card> : <Empty description="Выберите коммерческое предложение" />}
    </Space>

    <Drawer open={drawer === "create"} title="Коммерческое предложение из расчёта цены" width={560} onClose={() => setDrawer(null)} extra={<Button type="primary" onClick={() => createForm.submit()}>Создать</Button>}><Form form={createForm} layout="vertical" onFinish={createOffer}><Form.Item name="pricing_decision_id" label="Зафиксированный расчёт цены" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={pricingDecisions.map((item) => ({ value:Number(item.id), disabled:Boolean(item.offer_number), label:`${item.client_name} · ${item.request_number} · ${item.pricing_case_number} · версия ${item.revision_number} · ${item.line_count} поз.${item.offer_number ? ` · уже ${item.offer_number}` : ""}` }))} /></Form.Item><Form.Item name="validity_until" label="Действует до" rules={[{ required: true }]}><Input type="date" /></Form.Item><Form.Item name="payment_terms" label="Условия оплаты для клиента" rules={[{ required: true }]}><Input placeholder="Например: оплата по счёту" /></Form.Item><Form.Item name="payment_due_date" label="Оплатить до" rules={[{ required: true }]}><Input type="date" /></Form.Item><Form.Item name="incoterms" label="Incoterms" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="destination" label="Место поставки" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="client_delivery_commitment_days" label="Срок поставки клиенту, дней" rules={[{ required: true }]}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item><Form.Item name="warranty_terms" label="Гарантия" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="partial_delivery_terms" label="Условия частичной поставки" rules={[{ required: true }]}><Input /></Form.Item></Form></Drawer>
    <Drawer open={drawer === "pricing-revision"} title="Новая версия из пересчитанной цены" width={520} onClose={() => setDrawer(null)} extra={<Button type="primary" onClick={() => pricingRevisionForm.submit()}>Создать версию</Button>}><Form form={pricingRevisionForm} layout="vertical" onFinish={createRevisionFromPricing}><Alert type="info" showIcon message="Используйте после нового зафиксированного расчёта цены" description="Выберите расчёт той же заявки и клиента. Система сохранит новый неизменяемый источник и снимки реквизитов сторон." /><Form.Item name="pricing_decision_id" label="Зафиксированный расчёт цены" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={pricingDecisions.filter((item) => !item.offer_number || item.offer_number === offer?.offer_number).map((item) => ({ value: Number(item.id), label: `${item.client_name} · ${item.request_number} · ${item.pricing_case_number} · версия ${item.revision_number}` }))} /></Form.Item></Form></Drawer>
    <Drawer open={drawer === "terms"} title="Условия предложения" width={560} onClose={() => setDrawer(null)} extra={<Button type="primary" onClick={() => termsForm.submit()}>Сохранить</Button>}><Form form={termsForm} layout="vertical" onFinish={editTerms}>{[["validity_until","Действует до"],["payment_terms","Условия оплаты"],["incoterms","Incoterms"],["destination","Место поставки"],["warranty_terms","Гарантия"],["packaging_terms","Упаковка"],["partial_delivery_terms","Частичная поставка"],["general_text","Дополнительные условия"]].map(([field,label]) => <Form.Item key={field} name={field} label={label}><Input.TextArea autoSize /></Form.Item>)}<Form.Item name="payment_due_date" label="Оплатить до" rules={[{ required: true }]}><Input type="date" /></Form.Item><Form.Item name="client_delivery_commitment_days" label="Срок поставки клиенту, дней"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Form></Drawer>
    <Drawer open={drawer?.type === "line"} title="Позиция для клиента" width={580} onClose={() => setDrawer(null)} extra={<Button type="primary" onClick={() => lineForm.submit()}>Сохранить</Button>}><Form form={lineForm} layout="vertical" onFinish={editLine}><Form.Item name="client_display_part_number" label="Артикул для клиента"><Input /></Form.Item><Form.Item name="client_display_description" label="Описание для клиента" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item><Row gutter={12}><Col span={12}><Form.Item name="offered_quantity" label="Количество"><InputNumber min={0.001} style={{ width: "100%" }} /></Form.Item></Col><Col span={12}><Form.Item name="offered_unit_price" label="Цена за единицу"><InputNumber min={0} precision={4} style={{ width: "100%" }} /></Form.Item></Col></Row><Form.Item name="disclosure_policy" label="Как показать позицию"><Select options={[["SHOW_EXACT_EXECUTION","Показать точное исполнение"],["SHOW_REQUESTED_AND_OFFERED","Показать запрос и предложение"],["SHOW_EQUIVALENT_WITHOUT_SOURCE","Показать эквивалент без источника"],["CUSTOM_APPROVED_PRESENTATION","Согласованное представление"]].map(([value,label]) => ({ value,label }))} /></Form.Item><Form.Item name="line_status" label="Состояние позиции"><Select options={[{value:"ACTIVE",label:"Активна"},{value:"EXCLUDED",label:"Исключена"}]} /></Form.Item><Form.Item name="reason" label="Обоснование изменения цены"><Input.TextArea /></Form.Item></Form></Drawer>
    <Drawer open={drawer === "send"} title="Выпуск и отправка" width={540} onClose={() => setDrawer(null)} extra={<Button type="primary" onClick={() => sendForm.submit()}>Выпустить и отправить</Button>}><Form form={sendForm} layout="vertical" onFinish={issue}><Alert type="warning" showIcon message="После выпуска версия неизменяема" description="Изменения после отправки оформляются новой версией; система сохраняет точную копию отправленного предложения." /><Form.Item name="recipients" label="Получатели через запятую" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="channel" label="Канал"><Select options={["EMAIL","PORTAL","MANUAL","OTHER"].map((value) => ({ value,label:CHANNEL_LABELS[value] }))} /></Form.Item><Form.Item name="subject" label="Тема"><Input /></Form.Item><Form.Item name="body" label="Сообщение"><Input.TextArea /></Form.Item></Form></Drawer>
    <Drawer open={drawer === "feedback"} title="Ответ клиента" width={600} onClose={() => setDrawer(null)} extra={<Button type="primary" onClick={() => feedbackForm.submit()}>Зарегистрировать</Button>}><Form form={feedbackForm} layout="vertical" onFinish={registerFeedback}><Form.Item name="sent_snapshot_id" label="Отправленная версия" rules={[{ required: true }]}><Select options={sentSnapshots.map((item) => ({ value: Number(item.id), label: `Отправка от ${item.sent_at ? new Date(item.sent_at).toLocaleString("ru-RU") : "дата не указана"}` }))} /></Form.Item><Form.Item name="line_ids" label="Позиции предложения" rules={[{ required: true, message: "Выберите хотя бы одну позицию" }]}><Select mode="multiple" optionFilterProp="label" maxTagCount="responsive" options={activeLines.map((line) => ({ value: Number(line.id), label: `Строка ${line.line_number} · ${line.client_display_description} · ${line.offered_quantity} ${line.uom} · ${line.offered_unit_price} ${currentRevision.currency}` }))} /></Form.Item><Paragraph type="secondary">По умолчанию выбраны все активные строки. Исключите строки, к которым ответ не относится.</Paragraph><Form.Item name="result" label="Результат"><Select options={Object.entries(FEEDBACK_LABELS).map(([value, label]) => ({ value, label }))} /></Form.Item><Form.Item name="channel" label="Канал"><Select options={Object.entries(CHANNEL_LABELS).map(([value, label]) => ({ value, label }))} /></Form.Item><Form.Item name="evidence_reference" label="Подтверждение ответа" rules={[{ required: true }]}><Input placeholder="Например: письмо клиента от 09.08.2026" /></Form.Item><Row gutter={12}><Col span={12}><Form.Item name="requested_quantity" label="Запрошенное количество"><InputNumber min={0.001} style={{ width: "100%" }} /></Form.Item></Col><Col span={12}><Form.Item name="requested_unit_price" label="Запрошенная цена"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col></Row><Form.Item name="requested_execution_text" label="Запрошенное исполнение"><Input /></Form.Item><Form.Item name="requested_delivery_days" label="Запрошенный срок, дней"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item><Form.Item name="comment" label="Комментарий к позициям"><Input.TextArea /></Form.Item><Form.Item name="overall_note" label="Общее примечание"><Input.TextArea /></Form.Item></Form></Drawer>
    <Modal open={Boolean(preview)} title="Вид коммерческого предложения для клиента" width={900} footer={null} onCancel={() => setPreview(null)}><Paragraph type="secondary">Безопасное представление сформировано сервером: поставщики, закупочные цены, себестоимость, маржа и внутренние идентификаторы скрыты.</Paragraph>{preview ? <><Descriptions bordered size="small" column={2}><Descriptions.Item label="Предложение">{preview.offer_number} · версия {preview.revision_number}</Descriptions.Item><Descriptions.Item label="Клиент">{preview.client?.company_name || "—"}</Descriptions.Item><Descriptions.Item label="Валюта">{preview.currency}</Descriptions.Item><Descriptions.Item label="Действует до">{preview.validity_until ? new Date(preview.validity_until).toLocaleDateString("ru-RU") : "—"}</Descriptions.Item><Descriptions.Item label="Оплата">{preview.payment_terms || "—"}</Descriptions.Item><Descriptions.Item label="Оплатить до">{preview.payment_due_date ? new Date(preview.payment_due_date).toLocaleDateString("ru-RU") : "—"}</Descriptions.Item><Descriptions.Item label="Срок поставки">{preview.delivery_commitment_days ?? "—"} дн.</Descriptions.Item></Descriptions><Table rowKey="line_number" size="small" pagination={false} dataSource={preview.lines || []} columns={[{ title: "№", dataIndex: "line_number" },{ title: "Артикул", dataIndex: "part_number" },{ title: "Описание", dataIndex: "description" },{ title: "Количество", render: (_, line) => `${line.quantity} ${line.uom}` },{ title: "Цена", render: (_, line) => `${line.unit_price} ${line.currency}` },{ title: "Сумма", render: (_, line) => `${line.line_total} ${line.currency}` }]} /></> : null}</Modal>
  </PageWrapper>
}
