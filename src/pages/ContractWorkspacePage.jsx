import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert, Button, Card, Col, Descriptions, Drawer, Empty, Form, Input, InputNumber, List, Modal,
  Row, Select, Skeleton, Space, Statistic, Table, Tabs, Tag, Timeline, Typography,
} from "antd"
import { useSearchParams } from "react-router-dom"
import PageWrapper from "@/components/common/PageWrapper"
import useCapabilities from "@/hooks/useCapabilities"
import { appMessage } from "@/utils/uiFeedback"
import {
  addContractClause, createContractCase, createContractRevision, decideContractApproval,
  generateContractDocument, getContractPreview, getContractReadiness, getContractWorkspace,
  listAcceptedCommercialResults, listContractCases, makeContractEffective, markContractReadyForSignature, registerContractDocument,
  registerContractSignature, requestContractApproval, sendContractRevision, submitContractReview,
} from "@/features/contracts/api/contractApi"

const { Text, Title, Paragraph } = Typography
const errorText = (reason) => reason?.response?.data?.error?.message || reason?.response?.data?.message || reason?.message || "Операция не выполнена"
const fmt = (value) => value == null ? "—" : Number(value).toLocaleString("ru-RU", { maximumFractionDigits: 4 })
const key = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`
const STATUS_COLORS = { DRAFT:"default",INTERNAL_REVIEW:"orange",EXTERNAL_REVIEW:"blue",READY_FOR_SIGNATURE:"gold",PARTIALLY_SIGNED:"purple",SIGNED:"cyan",EFFECTIVE:"green",SUPERSEDED:"default",TERMINATED:"red",APPROVED:"green",REJECTED:"red",SUBMITTED:"orange" }
const STATUS_LABELS = { DRAFT:"Черновик",INTERNAL_REVIEW:"Внутреннее согласование",EXTERNAL_REVIEW:"Согласование с клиентом",READY_FOR_SIGNATURE:"Готов к подписанию",PARTIALLY_SIGNED:"Подписан одной стороной",SIGNED:"Подписан",EFFECTIVE:"Действует",SUPERSEDED:"Заменён новой версией",TERMINATED:"Прекращён",APPROVED:"Утверждено",REJECTED:"Отклонено",SUBMITTED:"На согласовании",OPEN:"Открыто" }
const READINESS_LABELS = { UOM_UNAVAILABLE_IN_ACCEPTED_INPUT:"Единица измерения недоступна в исходном предложении",CLIENT_CONTACT_UNAVAILABLE:"Не указан контакт клиента",CLIENT_BANK_UNAVAILABLE:"Не указаны банковские реквизиты клиента" }
const PARTY_LABELS = { COMPANY:"Наша компания",CLIENT:"Клиент" }
const SIGNATURE_METHOD_LABELS = { WET_SIGNATURE:"Собственноручная подпись",ELECTRONIC_SIGNATURE:"Электронная подпись",MANUAL_EVIDENCE:"Ручная регистрация подтверждения",ACKNOWLEDGED_PURCHASE_ORDER:"Подтверждённый заказ",SIGNED_QUOTATION:"Подписанное предложение",OTHER:"Другое" }
function Status({ value }) { return <Tag color={STATUS_COLORS[value]}>{STATUS_LABELS[value] || "Неизвестное состояние"}</Tag> }

export default function ContractWorkspacePage() {
  const { can } = useCapabilities()
  const [searchParams,setSearchParams] = useSearchParams()
  const selectedCaseId = Number(searchParams.get("case")) || null
  const [cases,setCases] = useState([])
  const [acceptedResults,setAcceptedResults] = useState([])
  const [model,setModel] = useState(null)
  const [loading,setLoading] = useState(true)
  const [loadingCase,setLoadingCase] = useState(false)
  const [error,setError] = useState("")
  const [drawer,setDrawer] = useState(null)
  const [readiness,setReadiness] = useState(null)
  const [preview,setPreview] = useState(null)
  const [createForm] = Form.useForm()
  const [clauseForm] = Form.useForm()
  const [sendForm] = Form.useForm()
  const [documentForm] = Form.useForm()
  const [signatureForm] = Form.useForm()

  const loadCases = useCallback(async () => {
    setLoading(true)
    try { const [caseRows,resultRows]=await Promise.all([listContractCases(),listAcceptedCommercialResults()]);setCases(caseRows);setAcceptedResults(resultRows);setError("") } catch (reason) { setError(errorText(reason)) } finally { setLoading(false) }
  },[])
  const loadCase = useCallback(async (caseId) => {
    if (!caseId) { setModel(null);return }
    setLoadingCase(true)
    try { setModel(await getContractWorkspace(caseId));setReadiness(null);setError("") } catch (reason) { setError(errorText(reason)) } finally { setLoadingCase(false) }
  },[])
  useEffect(() => { loadCases() },[loadCases])
  useEffect(() => {
    if (selectedCaseId) loadCase(selectedCaseId)
    else if (!loading && cases.length) setSearchParams({ case:String(cases[0].id) },{ replace:true })
  },[cases,loadCase,loading,selectedCaseId,setSearchParams])
  const refresh = useCallback(async () => Promise.all([loadCases(),selectedCaseId ? loadCase(selectedCaseId):Promise.resolve()]),[loadCase,loadCases,selectedCaseId])
  const run = async (operation,success,close=true) => {
    try { const result=await operation();appMessage.success(success);if (close) setDrawer(null);await refresh();return result }
    catch (reason) { appMessage.error(errorText(reason));return null }
  }

  const contractCase = model?.contract_case
  const currentRevision = useMemo(() => model?.revisions?.find((item) => Number(item.id) === Number(contractCase?.current_revision_id)) || model?.revisions?.at(-1),[contractCase,model])
  const activeLines = (currentRevision?.lines || []).filter((line) => line.line_status === "ACTIVE")
  const latestGenerated = (currentRevision?.documents || []).filter((item) => item.document_type === "GENERATED_DRAFT").at(-1)
  const createCase = async (values) => {
    const result=await run(() => createContractCase({
      accepted_commercial_revision_id:Number(values.accepted_commercial_revision_id),legal_form:values.legal_form,
      template_reference:values.template_reference,template_version:values.template_version,request_key:key("contract-create"),
      initial_clauses:values.initial_clause ? [{ type:"GENERAL",title:"General terms",text:values.initial_clause,risk_level:"STANDARD" }]:[],
    }),"Договор создан")
    if (result?.contract_case_id) setSearchParams({ case:String(result.contract_case_id) })
  }
  const showReadiness = async () => { try { setReadiness(await getContractReadiness(currentRevision.id)) } catch (reason) { appMessage.error(errorText(reason)) } }
  const showPreview = async () => { try { setPreview((await getContractPreview(currentRevision.id)).payload) } catch (reason) { appMessage.error(errorText(reason)) } }
  const registerSignedDocument = (values) => run(() => registerContractDocument(currentRevision.id,{ ...values,document_type:"SIGNED_EXECUTED",format:values.format || "PDF",idempotency_key:key("signed-document") }),"Подписанный документ зарегистрирован")
  const registerSignature = (values) => run(() => registerContractSignature(currentRevision.id,{ ...values,idempotency_key:key(`signature-${values.party_role}`) }),"Подтверждение подписи зарегистрировано")
  const send = (values) => run(() => sendContractRevision(currentRevision.id,{ ...values,document_id:latestGenerated?.id,recipients:String(values.recipients || "").split(",").map((item) => item.trim()).filter(Boolean),idempotency_key:key("contract-send") }),"Отправка клиенту зафиксирована")

  const queueColumns = [
    { title:"Договор",dataIndex:"contract_number",render:(value,row) => <Space direction="vertical" size={0}><Text strong>{value}</Text><Text type="secondary">{row.client_name}</Text></Space> },
    { title:"Версия",dataIndex:"current_revision_number",width:90,render:(value) => value || "—" },
    { title:"Состояние",dataIndex:"aggregate_status",render:(value) => <Status value={value} /> },
    { title:"Позиций",dataIndex:"line_count",width:90 },
    { title:"Следующее действие",dataIndex:"next_action",render:() => "Продолжить оформление" },
  ]
  const lineColumns = [
    { title:"#",dataIndex:"line_number",width:50 },
    { title:"Предмет",render:(_,line) => <Space direction="vertical" size={0}><Text strong>{line.client_representation_snapshot_json?.part_number || "—"}</Text><Text>{line.client_representation_snapshot_json?.description || "—"}</Text></Space> },
    { title:"Количество",render:(_,line) => `${fmt(line.quantity)} ${line.uom}` },
    { title:"Цена договора",render:(_,line) => `${fmt(line.unit_price)} ${line.currency}` },
  ]

  const tabs = model && currentRevision ? [
    { key:"overview",label:"Обзор",children:<Space direction="vertical" size={16} style={{ width:"100%" }}>
      <Alert type="info" showIcon message="Источник — зафиксированный принятый результат коммерческого предложения" description="Договор хранит юридические версии, подтверждения и обязательства. Закупка, склад и финансовый учёт выполняются в своих разделах." />
      <Descriptions bordered size="small" column={{ xs:1,md:2 }}>
        <Descriptions.Item label="Клиент">{contractCase.client_name}</Descriptions.Item><Descriptions.Item label="Форма договора">{currentRevision.legal_form === "ONE_OFF_CONTRACT" ? "Разовый договор" : currentRevision.legal_form}</Descriptions.Item>
        <Descriptions.Item label="Коммерческий источник">Принятый результат зафиксирован</Descriptions.Item><Descriptions.Item label="Шаблон">{currentRevision.template_reference} · {currentRevision.template_version}</Descriptions.Item>
        <Descriptions.Item label="Данные клиента">{currentRevision.client_snapshot_json?.available ? "Зафиксированы":"Недоступны"}</Descriptions.Item><Descriptions.Item label="Реквизиты компании">{currentRevision.company_legal_snapshot_json?.available ? "Зафиксированы":"Недоступны"}</Descriptions.Item>
      </Descriptions>
      <Row gutter={16}><Col xs={12} md={6}><Statistic title="Позиций" value={activeLines.length} /></Col><Col xs={12} md={6}><Statistic title="Версий" value={model.revisions.length} /></Col><Col xs={12} md={6}><Statistic title="Документов" value={currentRevision.documents?.length || 0} /></Col><Col xs={12} md={6}><Statistic title="Обязательств" value={model.commitments?.length || 0} /></Col></Row>
    </Space> },
    { key:"subject",label:`Предмет договора (${activeLines.length})`,children:<Table rowKey="id" size="small" pagination={false} dataSource={activeLines} columns={lineColumns} /> },
    { key:"commercial",label:"Коммерческие условия",children:<List bordered dataSource={currentRevision.terms || []} locale={{ emptyText:"Условия отсутствуют" }} renderItem={(term) => <List.Item><List.Item.Meta title={<Text strong>{term.term_type}</Text>} description={Object.entries(term.value_json || {}).map(([k,v]) => `${k}: ${v}`).join(" · ")} /></List.Item>} /> },
    { key:"legal",label:"Юридические условия",children:<Space direction="vertical" style={{ width:"100%" }}>
      {can("contracts.legal_review") && currentRevision.status === "DRAFT" ? <Button type="primary" onClick={() => { clauseForm.resetFields();clauseForm.setFieldsValue({ risk_level:"STANDARD" });setDrawer("clause") }}>Добавить условие</Button>:null}
      <List bordered dataSource={currentRevision.clauses || []} locale={{ emptyText:"Юридические условия отсутствуют" }} renderItem={(clause) => <List.Item><List.Item.Meta title={<Space><Text strong>{clause.title}</Text><Tag>{clause.risk_level === "STANDARD" ? "Стандартное" : "Требует внимания"}</Tag></Space>} description={clause.clause_text} /></List.Item>} />
    </Space> },
    { key:"approvals",label:`Отклонения и согласования (${currentRevision.approvals?.length || 0})`,children:<Space direction="vertical" style={{ width:"100%" }}>
      <List bordered header="Отклонения" dataSource={currentRevision.deviations || []} locale={{ emptyText:"Отклонения отсутствуют" }} renderItem={(item) => <List.Item actions={item.approval_required && item.status === "OPEN" && can("contracts.approvals.request") ? [<Button key="request" onClick={() => run(() => requestContractApproval(currentRevision.id,{ deviation_id:item.id,reason:"Проверка юридического отклонения" }),"Согласование запрошено",false)}>Запросить согласование</Button>]:[]}><List.Item.Meta title={<Space><Text strong>{item.category}</Text><Status value={item.status} /></Space>} description={item.required_action || "Требуется проверка"} /></List.Item>} />
      <List bordered header="Согласования" dataSource={currentRevision.approvals || []} locale={{ emptyText:"Согласования отсутствуют" }} renderItem={(item) => <List.Item actions={item.status === "SUBMITTED" && can("contracts.approvals.decide") ? [<Button key="approve" type="primary" onClick={() => run(() => decideContractApproval(item.id,{ decision:"APPROVED",comment:"Согласовано" }),"Согласование утверждено",false)}>Утвердить</Button>,<Button key="reject" danger onClick={() => run(() => decideContractApproval(item.id,{ decision:"REJECTED",comment:"Отклонено" }),"Согласование отклонено",false)}>Отклонить</Button>]:[]}><List.Item.Meta title={<Space><Text strong>{item.approval_type}</Text><Status value={item.status} /></Space>} description={item.reason} /></List.Item>} />
    </Space> },
    { key:"documents",label:"Документы и подписание",children:<Space direction="vertical" size={12} style={{ width:"100%" }}>
      <List bordered header="Документы" dataSource={currentRevision.documents || []} locale={{ emptyText:"Документы отсутствуют" }} renderItem={(item) => <List.Item><List.Item.Meta title={<Space><Text strong>{item.document_type === "GENERATED_DRAFT" ? "Сформированный проект" : "Подписанный документ"}</Text><Tag>{item.format}</Tag></Space>} description={item.file_reference || "Сформирован системой"} /></List.Item>} />
      <List bordered header="Отправки клиенту" dataSource={currentRevision.sends || []} locale={{ emptyText:"Отправки отсутствуют" }} renderItem={(item) => <List.Item><List.Item.Meta title={`${item.channel} · ${item.sent_at ? new Date(item.sent_at).toLocaleString("ru-RU") : "—"}`} description={`${(item.recipients_json || []).join(", ")} · ${item.evidence_reference}`} /></List.Item>} />
      <List bordered header="Подписи" dataSource={currentRevision.signatures || []} locale={{ emptyText:"Подписи отсутствуют" }} renderItem={(item) => <List.Item><List.Item.Meta title={<Space><Text strong>{PARTY_LABELS[item.party_role] || item.party_role}</Text><Tag color="green">Подтверждено</Tag></Space>} description={`${item.signer_name} · ${SIGNATURE_METHOD_LABELS[item.signature_method] || item.signature_method} · ${item.evidence_reference}`} /></List.Item>} />
    </Space> },
    { key:"revisions",label:`Версии (${model.revisions.length})`,children:<Space direction="vertical" style={{ width:"100%" }}>{currentRevision.status !== "DRAFT" && can("contracts.manage") ? <Button onClick={() => run(() => createContractRevision(contractCase.id,{ reason:"Новая юридическая версия" }),"Новая версия договора создана",false)}>Создать юридическую версию</Button>:null}<List bordered dataSource={model.revisions} renderItem={(revision) => <List.Item><List.Item.Meta title={<Space><Text strong>Версия {revision.revision_number}</Text><Status value={revision.status} /></Space>} description="Источник: зафиксированный принятый результат" /></List.Item>} /></Space> },
    { key:"commitments",label:`Обязательства (${model.commitments?.length || 0})`,children:<><Alert type="warning" showIcon message="Передача в исполнение" description="Каждое обязательство повторно подтверждается в исполнении закупки; договор сам не создаёт заказ поставщику." /><List bordered style={{ marginTop:12 }} dataSource={model.commitments || []} locale={{ emptyText:"Обязательства появятся после вступления договора в силу" }} renderItem={(item) => <List.Item><List.Item.Meta title={<Space><Text strong>Обязательство по позиции договора</Text><Tag>{item.procurement_readiness === "READY" ? "Готово" : "Требует подтверждения"}</Tag></Space>} description={`${fmt(item.quantity)} ${item.uom} · ${fmt(item.line_total)} ${item.currency}`} /></List.Item>} /></> },
    { key:"history",label:"История",children:<Timeline items={(model.history || []).map((event) => ({ children:<Space direction="vertical" size={0}><Text strong>{String(event.event_type || "Событие").replaceAll("_"," ").toLowerCase()}</Text><Text type="secondary">{event.created_at ? new Date(event.created_at).toLocaleString("ru-RU"):""} · {event.actor_name || "Система"}</Text></Space> }))} /> },
  ]:[]

  return <PageWrapper title="Договоры">
    <Space direction="vertical" size={16} style={{ width:"100%" }}>
      {error ? <Alert type="error" showIcon message={error} closable onClose={() => setError("")} />:null}
      <Card><Space wrap style={{ width:"100%",justifyContent:"space-between" }}><Space direction="vertical" size={0}><Title level={3} style={{ margin:0 }}>Договоры</Title><Text type="secondary">Принятое предложение → условия → согласование → документы → подписи → действующие обязательства</Text></Space>{can("contracts.manage") ? <Button type="primary" onClick={() => { createForm.resetFields();createForm.setFieldsValue({ legal_form:"ONE_OFF_CONTRACT",template_reference:"contract-standard",template_version:"v1" });setDrawer("create") }}>Принять коммерческий результат</Button>:null}</Space></Card>
      <Card title="Очередь договоров" styles={{ body:{ padding:0 } }}><Table rowKey="id" size="small" loading={loading} dataSource={cases} columns={queueColumns} pagination={{ pageSize:8 }} onRow={(row) => ({ onClick:() => setSearchParams({ case:String(row.id) }),style:{ cursor:"pointer",background:Number(row.id) === selectedCaseId ? "#e6f4ff":undefined } })} /></Card>
      {loadingCase ? <Skeleton active paragraph={{ rows:8 }} />:contractCase && currentRevision ? <Card title={<Space><Text strong>{contractCase.contract_number}</Text><Status value={contractCase.aggregate_status} /><Text type="secondary">R{currentRevision.revision_number}</Text></Space>} extra={<Space wrap>
        <Button onClick={showReadiness}>Проверить готовность</Button><Button onClick={showPreview}>Предпросмотр</Button>
        {currentRevision.status === "DRAFT" && can("contracts.manage") ? <Button onClick={() => run(() => submitContractReview(currentRevision.id),"Передано на внутреннее согласование",false)}>Передать на согласование</Button>:null}
        {currentRevision.status === "INTERNAL_REVIEW" && can("contracts.documents.manage") ? <Button onClick={() => run(() => generateContractDocument(currentRevision.id,{ idempotency_key:key("contract-document") }),"Документ сформирован",false)}>Сформировать документ</Button>:null}
        {currentRevision.status === "INTERNAL_REVIEW" && latestGenerated && can("contracts.send_external") ? <Button type="primary" onClick={() => { sendForm.resetFields();sendForm.setFieldsValue({ channel:"MANUAL" });setDrawer("send") }}>Отправить клиенту</Button>:null}
        {currentRevision.status === "EXTERNAL_REVIEW" && can("contracts.sign") ? <Button type="primary" onClick={() => run(() => markContractReadyForSignature(currentRevision.id),"Договор готов к подписанию",false)}>Подготовить к подписанию</Button>:null}
        {["READY_FOR_SIGNATURE","PARTIALLY_SIGNED","SIGNED"].includes(currentRevision.status) && can("contracts.documents.manage") ? <Button onClick={() => { documentForm.resetFields();documentForm.setFieldsValue({ format:"PDF" });setDrawer("document") }}>Зарегистрировать подписанный файл</Button>:null}
        {["READY_FOR_SIGNATURE","PARTIALLY_SIGNED"].includes(currentRevision.status) && can("contracts.sign") ? <Button onClick={() => { signatureForm.resetFields();signatureForm.setFieldsValue({ signature_method:"MANUAL_EVIDENCE",signed_at:new Date().toISOString() });setDrawer("signature") }}>Зарегистрировать подпись</Button>:null}
        {currentRevision.status === "SIGNED" && can("contracts.make_effective") ? <Button type="primary" onClick={() => run(() => makeContractEffective(currentRevision.id,{ idempotency_key:key("contract-effective") }),"Договор вступил в силу; обязательства созданы",false)}>Ввести в действие</Button>:null}
      </Space>}><Tabs items={tabs} /></Card>:<Empty description="Выберите договор" />}
    </Space>

    <Drawer open={drawer === "create"} title="Договор из принятого коммерческого предложения" width={600} onClose={() => setDrawer(null)} extra={<Button type="primary" onClick={() => createForm.submit()}>Создать</Button>}><Form form={createForm} layout="vertical" onFinish={createCase}><Alert type="info" showIcon message="Можно выбрать только зафиксированный принятый результат" style={{ marginBottom:16 }} /><Form.Item name="accepted_commercial_revision_id" label="Принятое коммерческое предложение" rules={[{ required:true }]}><Select showSearch optionFilterProp="label" options={acceptedResults.map((item)=>({value:Number(item.id),disabled:Boolean(item.contract_number),label:`${item.client_name} · ${item.request_number} · ${item.offer_number} · ${item.line_count} поз. · ${fmt(item.aggregate_total)} ${item.currency}${item.contract_number ? ` · уже ${item.contract_number}`:""}`}))}/></Form.Item><Form.Item name="legal_form" label="Форма договора" rules={[{ required:true }]}><Select options={[["ONE_OFF_CONTRACT","Разовый договор"],["FRAMEWORK_AGREEMENT","Рамочный договор"],["PURCHASE_ORDER_ACCEPTANCE","Акцепт заказа"],["SIGNED_QUOTATION","Подписанное предложение"],["OTHER","Другое"]].map(([value,label]) => ({ value,label }))} /></Form.Item><Form.Item name="template_reference" label="Шаблон" rules={[{ required:true }]}><Input /></Form.Item><Form.Item name="template_version" label="Версия шаблона" rules={[{ required:true }]}><Input /></Form.Item><Form.Item name="initial_clause" label="Начальное стандартное условие" rules={[{ required:true }]}><Input.TextArea rows={5} /></Form.Item></Form></Drawer>
    <Drawer open={drawer === "clause"} title="Юридическое условие" width={560} onClose={() => setDrawer(null)} extra={<Button type="primary" onClick={() => clauseForm.submit()}>Добавить</Button>}><Form form={clauseForm} layout="vertical" onFinish={(values) => run(() => addContractClause(currentRevision.id,{ ...values,text:values.clause_text }),"Условие добавлено")}><Form.Item name="clause_type" label="Тип условия" rules={[{ required:true }]}><Input /></Form.Item><Form.Item name="title" label="Название" rules={[{ required:true }]}><Input /></Form.Item><Form.Item name="clause_text" label="Текст" rules={[{ required:true }]}><Input.TextArea rows={8} /></Form.Item><Form.Item name="risk_level" label="Уровень риска"><Select options={[["STANDARD","Стандартный"],["LOW","Низкий"],["MEDIUM","Средний"],["HIGH","Высокий"],["CRITICAL","Критический"]].map(([value,label]) => ({ value,label }))} /></Form.Item></Form></Drawer>
    <Drawer open={drawer === "send"} title="Отправка договора клиенту" width={560} onClose={() => setDrawer(null)} extra={<Button type="primary" onClick={() => sendForm.submit()}>Отправить</Button>}><Form form={sendForm} layout="vertical" onFinish={send}><Alert type="warning" showIcon message="После отправки версия блокируется, а точная копия сохраняется" style={{ marginBottom:16 }} /><Form.Item name="recipients" label="Получатели через запятую" rules={[{ required:true }]}><Input /></Form.Item><Form.Item name="channel" label="Канал"><Select options={[["EMAIL","Электронная почта"],["PORTAL","Портал"],["MANUAL","Вручную"],["OTHER","Другое"]].map(([value,label]) => ({ value,label }))} /></Form.Item><Form.Item name="evidence_reference" label="Подтверждение отправки" rules={[{ required:true }]}><Input /></Form.Item><Form.Item name="subject" label="Тема"><Input /></Form.Item><Form.Item name="body" label="Сообщение"><Input.TextArea /></Form.Item></Form></Drawer>
    <Drawer open={drawer === "document"} title="Подписанный документ" width={560} onClose={() => setDrawer(null)} extra={<Button type="primary" onClick={() => documentForm.submit()}>Зарегистрировать</Button>}><Form form={documentForm} layout="vertical" onFinish={registerSignedDocument}><Form.Item name="file_reference" label="Ссылка на файл" rules={[{ required:true }]}><Input /></Form.Item><Form.Item name="document_hash" label="Контрольная сумма SHA-256" rules={[{ required:true,pattern:/^[a-f0-9]{64}$/i }]}><Input /></Form.Item><Form.Item name="evidence_reference" label="Подтверждение документа" rules={[{ required:true }]}><Input /></Form.Item><Form.Item name="format" label="Формат"><Select options={["PDF","DOCX","HTML","OTHER"].map((value) => ({ value,label:value === "OTHER" ? "Другой" : value }))} /></Form.Item></Form></Drawer>
    <Drawer open={drawer === "signature"} title="Подтверждение подписи" width={560} onClose={() => setDrawer(null)} extra={<Button type="primary" onClick={() => signatureForm.submit()}>Зарегистрировать</Button>}><Form form={signatureForm} layout="vertical" onFinish={registerSignature}><Form.Item name="party_role" label="Сторона" rules={[{ required:true }]}><Select options={Object.entries(PARTY_LABELS).map(([value,label]) => ({ value,label }))} /></Form.Item><Form.Item name="signer_name" label="Подписант" rules={[{ required:true }]}><Input /></Form.Item><Form.Item name="signer_role" label="Должность"><Input /></Form.Item><Form.Item name="authority_basis" label="Основание полномочий"><Input /></Form.Item><Form.Item name="signature_method" label="Способ подписания"><Select options={Object.entries(SIGNATURE_METHOD_LABELS).map(([value,label]) => ({ value,label }))} /></Form.Item><Form.Item name="signed_at" label="Дата и время подписания" rules={[{ required:true }]}><Input /></Form.Item><Form.Item name="evidence_document_id" label="Подписанный документ"><Select allowClear placeholder="Выберите зарегистрированный документ" options={(currentRevision?.documents || []).filter((item) => item.document_type === "SIGNED_EXECUTED").map((item) => ({ value:Number(item.id),label:item.file_reference || `Документ от ${new Date(item.created_at).toLocaleString("ru-RU")}` }))} /></Form.Item><Form.Item name="evidence_reference" label="Подтверждение подписи" rules={[{ required:true }]}><Input /></Form.Item></Form></Drawer>
    <Modal open={Boolean(readiness)} title="Готовность договора" footer={null} onCancel={() => setReadiness(null)}><Alert type={readiness?.ready ? "success":"error"} showIcon message={readiness?.ready ? "Договор готов":"Выпуск заблокирован"} description={<Space direction="vertical">{(readiness?.blockers || []).map((item,index) => <Tag color="red" key={`${item.code}-${index}`}>{READINESS_LABELS[item.code] || "Требуется обязательное действие"}</Tag>)}{(readiness?.warnings || []).map((item,index) => <Tag color="orange" key={`${item.code}-${index}`}>{READINESS_LABELS[item.code] || "Требуется внимание"}</Tag>)}</Space>} /></Modal>
    <Modal open={Boolean(preview)} title="Предпросмотр договора" width={900} footer={null} onCancel={() => setPreview(null)}><Paragraph type="secondary">Сервер сформировал представление точной версии договора без технических идентификаторов.</Paragraph>{preview ? <><Descriptions bordered size="small" column={2}><Descriptions.Item label="Договор">{preview.contract_number || contractCase.contract_number}</Descriptions.Item><Descriptions.Item label="Клиент">{preview.client?.company_name || contractCase.client_name}</Descriptions.Item><Descriptions.Item label="Версия">{preview.revision_number || currentRevision.revision_number}</Descriptions.Item><Descriptions.Item label="Состояние"><Status value={currentRevision.status} /></Descriptions.Item></Descriptions><Table style={{ marginTop:16 }} rowKey={(line) => line.line_number || line.id} size="small" pagination={false} dataSource={preview.lines || activeLines} columns={[{title:"№",dataIndex:"line_number"},{title:"Предмет",render:(_,line) => line.description || line.client_representation_snapshot_json?.description || "—"},{title:"Количество",render:(_,line) => `${line.quantity || "—"} ${line.uom || ""}`},{title:"Цена",render:(_,line) => `${line.unit_price || "—"} ${line.currency || ""}`}]} /></> : null}</Modal>
  </PageWrapper>
}
