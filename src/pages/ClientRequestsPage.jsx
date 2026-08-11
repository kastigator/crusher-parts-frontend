import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert, Badge, Button, Card, Descriptions, Divider, Drawer,
  Empty, Form, Input, Modal, Progress, Segmented, Select, Skeleton,
  Space, Table, Tag, Tooltip, Typography, message,
} from "antd"
import {
  ArrowLeftOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
  LinkOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, SendOutlined,
} from "@ant-design/icons"
import dayjs from "dayjs"
import { useNavigate, useSearchParams } from "react-router-dom"
import PageWrapper from "@/components/common/PageWrapper"
import ClientRequestIntakeWizard from "@/features/clientRequests/components/ClientRequestIntakeWizard"
import useCapabilities from "@/hooks/useCapabilities"
import {
  createClientRequestRevision,
  createProcurementRelease, finalizeRevision, getClientRequestWorkspace, getIdentification,
  getClientRequestRegistry, listClients, listUsers, saveIdentification, saveRequirements,
  searchCatalogPositions,
} from "@/features/clientRequests/api/clientRequestsApi"
import "./clientRequestsV2.css"

const { Text, Title, Paragraph } = Typography

const WORK_VIEWS = [
  { label: "Все", value: "all" },
  { label: "Требуют действия", value: "attention" },
  { label: "Требуют идентификации", value: "identification" },
  { label: "Ожидают клиента", value: "client" },
  { label: "Готовы к закупке", value: "ready" },
  { label: "Архив", value: "archive" },
]

const STATUS_LABELS = {
  unprocessed: "Не идентифицировано", suggested: "Найдено совпадение", needs_review: "Нужно подтверждение",
  confirmed: "Позиция подтверждена", needs_client_clarification: "Ожидаются данные клиента",
  technical_task_open: "Нужна техническая идентификация", not_required: "Идентификация не требуется",
  draft: "Черновик", finalized: "Зафиксирована", intake: "Регистрация", identification: "Идентификация",
  released: "Передано в закупку", archived: "Архив",
}

const BLOCKER_LABELS = {
  INVALID_QUANTITY: "Укажите количество больше нуля",
  MISSING_UOM: "Укажите единицу измерения",
  IDENTIFICATION_NOT_CONFIRMED: "Подтвердите позицию каталога",
  OPEN_CRITICAL_CLARIFICATION: "Закройте критическое уточнение клиента",
  MISSING_REQUIRED_DOCUMENT: "Приложите обязательный документ",
  INVALID_REQUIREMENTS: "Заполните требования для закупки",
  ALREADY_RELEASED: "Строка уже передана в закупку",
  REVISION_NOT_FINALIZED: "Зафиксируйте ревизию",
}

const POLICY_OPTIONS = [
  { value: "unspecified", label: "Уточнить позже" },
  { value: "exact_only", label: "Только точное соответствие" },
  { value: "equivalent_requires_approval", label: "Аналог после согласования" },
  { value: "equivalent_allowed", label: "Аналоги разрешены" },
  { value: "open_to_proposals", label: "Рассмотреть предложения" },
]

const formatDate = (value) => value && dayjs(value).isValid() ? dayjs(value).format("DD.MM.YYYY") : "—"
const statusLabel = (value) => STATUS_LABELS[String(value || "").toLowerCase()] || "Требует внимания"
const blockerText = (blocker) => {
  const code = typeof blocker === "string" ? blocker : blocker?.code
  return (typeof blocker === "object" && blocker?.message) || BLOCKER_LABELS[String(code || "").toUpperCase()] || "Проверьте данные строки"
}
const catalogLabel = (row) => [
  row.manufacturer_name, row.manufacturer_part_number || row.position_code,
  row.display_name_ru || row.display_name || row.display_name_en,
].filter(Boolean).join(" · ")

function ItemDrawer({ item, open, readOnly, onClose, onSaved, requestId }) {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const [form] = Form.useForm()
  const [options, setOptions] = useState([])
  const [catalogQuery, setCatalogQuery] = useState("")
  const [selectedCatalogId, setSelectedCatalogId] = useState(null)
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!item) return
    const selected = item.identification_catalog_position_id ? [{ value: Number(item.identification_catalog_position_id), label: [item.catalog_position_part_number || item.catalog_position_code, item.catalog_position_name].filter(Boolean).join(" · ") }] : []
    setOptions(selected)
    setCatalogQuery("")
    setSelectedCatalogId(item.identification_catalog_position_id ? Number(item.identification_catalog_position_id) : null)
    form.setFieldsValue({
      catalog_position_id: item.identification_catalog_position_id ? Number(item.identification_catalog_position_id) : undefined,
      substitution_policy: item.substitution_policy || "exact_only",
      technical_requirements: item.technical_requirements || "",
      procurement_note: item.procurement_note || "",
    })
  }, [item, form])

  const search = async (query) => {
    if (String(query || "").trim().length < 2) return
    setSearching(true)
    try { setOptions((await searchCatalogPositions(query)).map((row) => ({ value: Number(row.id), label: catalogLabel(row), row }))) }
    catch { message.error("Не удалось выполнить поиск по каталогу") }
    finally { setSearching(false) }
  }
  const save = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      if (can("client_requests.identify_items")) await saveIdentification(item.id, { catalog_position_id: values.catalog_position_id, identification_status: "confirmed", match_method: "manual", basis_note: "Подтверждено менеджером в рабочей области заявки" })
      if (can("client_requests.manage_requirements")) await saveRequirements(item.id, { substitution_policy: values.substitution_policy, technical_requirements: values.technical_requirements || null, procurement_note: values.procurement_note || null })
      message.success("Позиция и требования подтверждены")
      await onSaved()
      onClose()
    } catch (error) { message.error(error?.response?.data?.message || "Не удалось сохранить строку") }
    finally { setSaving(false) }
  }

  if (!item) return null
  const released = Number(item.already_released_count) > 0
  const blockers = released ? [] : (item.readiness?.blockers || item.readiness?.blocker_codes || [])
  return <Drawer width={620} open={open} onClose={onClose} title={`Позиция ${item.line_number}: ${item.client_description || "без описания"}`} extra={<Tag color={released ? "blue" : item.readiness?.ready ? "green" : "orange"}>{released ? "Передана в закупку" : item.readiness?.ready ? "Готова к закупке" : "Требует действия"}</Tag>}>
    <Space direction="vertical" size={18} style={{ width: "100%" }}>
      {readOnly && <Alert showIcon type="warning" message="Предыдущая ревизия открыта только для просмотра" />}
      <section><Title level={5}>Исходные данные клиента</Title><Descriptions size="small" column={2} bordered>
        <Descriptions.Item label="Описание" span={2}>{item.client_description || item.client_line_text || "—"}</Descriptions.Item>
        <Descriptions.Item label="Производитель">{item.client_manufacturer_text || "—"}</Descriptions.Item>
        <Descriptions.Item label="Модель">{item.client_equipment_model_text || "—"}</Descriptions.Item>
        <Descriptions.Item label="Номер">{item.client_catalog_number || item.client_part_number || "—"}</Descriptions.Item>
        <Descriptions.Item label="Количество">{item.requested_qty || "—"} {item.uom || ""}</Descriptions.Item>
        <Descriptions.Item label="Комментарий" span={2}>{item.client_comment || "—"}</Descriptions.Item>
      </Descriptions></section>
      <section><Title level={5}>Готовность и следующее действие</Title>
        {released ? <Alert type="info" showIcon message="Строка уже передана в закупку" description="Снимок передачи неизменяем. Для новых данных создайте следующую ревизию." /> : blockers.length ? <Space direction="vertical" size={6}>{blockers.map((x, i) => <Alert key={`${blockerText(x)}-${i}`} type="warning" showIcon message={blockerText(x)} />)}</Space> : <Alert type="success" showIcon message="Все обязательные данные заполнены" />}
      </section>
      <section><Title level={5}>Позиция каталога и требования</Title>
        <Form form={form} layout="vertical" disabled={readOnly}>
          <Form.Item name="catalog_position_id" hidden rules={[{required:true,message:"Выберите подтверждённую позицию каталога"}]}><Input /></Form.Item>
          <Form.Item label="Найти существующую позицию" required>
            <Space.Compact style={{ width: "100%" }}>
              <Input value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} onPressEnter={() => search(catalogQuery)} placeholder="Номер, производитель или описание" />
              <Button type="primary" loading={searching} onClick={() => search(catalogQuery)}>Найти</Button>
            </Space.Compact>
          </Form.Item>
          {options.length ? <div className="cr-catalog-results">{options.map((option) => <Button key={option.value} type={selectedCatalogId === option.value ? "primary" : "default"} onClick={() => { setSelectedCatalogId(option.value); form.setFieldValue("catalog_position_id", option.value) }}>{option.label}</Button>)}</div> : <Text type="secondary">Введите не менее двух символов и нажмите «Найти».</Text>}
          <Form.Item name="substitution_policy" label="Допустимость замены" rules={[{required:true}]}><Select options={POLICY_OPTIONS} /></Form.Item>
          <Form.Item name="technical_requirements" label="Технические требования"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="procurement_note" label="Комментарий для закупки"><Input.TextArea rows={2} /></Form.Item>
        </Form>
        <Space wrap>
          {!readOnly && <Button type="primary" loading={saving} onClick={save} disabled={!can("client_requests.identify_items", "client_requests.manage_requirements")}>Подтвердить позицию</Button>}
          <Button icon={<LinkOutlined />} onClick={() => navigate(`/equipment-classifier?mode=identification${item.active_identification_task_id ? `&task=${item.active_identification_task_id}` : `&client_request=${requestId}&item=${item.id}`}`)}>Открыть очередь идентификации</Button>
        </Space>
        {!item.identification_catalog_position_id && <Alert className="cr-inline-note" type="info" showIcon message="Если подходящей позиции нет" description="Откройте классификатор с контекстом этой строки. Создание позиции выполняется только в Classifier & Engineering." />}
      </section>
    </Space>
  </Drawer>
}

function ReleasePreview({ open, items, revision, onCancel, onConfirm, loading }) {
  return <Modal width={820} open={open} onCancel={onCancel} onOk={onConfirm} confirmLoading={loading} okText={`Передать ${items.length} позиций`} cancelText="Вернуться" title="Проверка передачи в закупку">
    <Alert showIcon type="info" message={`Источник: ревизия №${revision?.rev_number || "—"}`} description="После подтверждения будет создан неизменяемый снимок только выбранных строк. Запросы поставщикам здесь не создаются." />
    <Table className="cr-preview-table" size="small" rowKey="id" pagination={false} dataSource={items} columns={[
      { title: "№", dataIndex: "line_number", width: 56 },
      { title: "Запрос клиента", dataIndex: "client_description" },
      { title: "Позиция каталога", render: (_, x) => [x.catalog_position_part_number || x.catalog_position_code, x.catalog_position_name].filter(Boolean).join(" · ") || "—" },
      { title: "Количество", render: (_, x) => `${x.requested_qty} ${x.uom || ""}` },
      { title: "Замена", render: (_, x) => POLICY_OPTIONS.find((p) => p.value === x.substitution_policy)?.label || "—" },
    ]} />
  </Modal>
}

function RequestWorkspace({ requestId, onBack, onChanged }) {
  const { can } = useCapabilities()
  const canRelease = can("client_requests.release_to_procurement")
  const [searchParams, setSearchParams] = useSearchParams()
  const [model, setModel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState([])
  const [activeItem, setActiveItem] = useState(null)
  const [releaseOpen, setReleaseOpen] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const revisionIdFromUrl = Number(searchParams.get("revision") || 0) || null

  const load = useCallback(async () => {
    setLoading(true); setError("")
    try { setModel(await getClientRequestWorkspace(requestId)) }
    catch (reason) { setError(reason?.response?.data?.message || "Не удалось загрузить заявку") }
    finally { setLoading(false) }
  }, [requestId])
  useEffect(() => { load() }, [load])

  const revisions = model?.revisions || []
  const currentRevisionId = Number(model?.current_revision_id || 0) || null
  const activeRevisionId = revisionIdFromUrl && revisions.some((x) => Number(x.id) === revisionIdFromUrl) ? revisionIdFromUrl : currentRevisionId
  const activeRevision = revisions.find((x) => Number(x.id) === Number(activeRevisionId))
  const readOnly = Number(activeRevisionId) !== Number(currentRevisionId)
  const [revisionItems, setRevisionItems] = useState([])
  useEffect(() => {
    if (!model || !activeRevisionId) return
    if (Number(activeRevisionId) === Number(currentRevisionId)) setRevisionItems(model.items || [])
    else getIdentification(activeRevisionId).then(setRevisionItems).catch(() => setRevisionItems([]))
    setSelected([])
  }, [model, activeRevisionId, currentRevisionId])

  const readyRows = revisionItems.filter((x) => x.readiness?.ready && !Number(x.already_released_count))
  const selectedRows = revisionItems.filter((x) => selected.includes(x.id))
  const blockedRows = revisionItems.filter((x) => !x.readiness?.ready && !Number(x.already_released_count))
  const linkedCount = revisionItems.filter((x) => x.identification_catalog_position_id).length
  const releasedCount = revisionItems.filter((x) => Number(x.already_released_count) > 0).length

  const refresh = async () => { await load(); onChanged?.() }
  const primaryAction = async () => {
    if (selected.length) return setReleaseOpen(true)
    if (activeRevision?.status === "draft") {
      try { await finalizeRevision(activeRevisionId); message.success("Ревизия зафиксирована"); await refresh() }
      catch (error) { message.error(error?.response?.data?.message || "Не удалось зафиксировать ревизию") }
      return
    }
    if (blockedRows.length) setActiveItem(blockedRows[0])
  }
  const primaryLabel = selected.length ? `Передать ${selected.length} позиций в закупку` : activeRevision?.status === "draft" ? "Зафиксировать ревизию" : blockedRows.length ? "Устранить первый блокер" : "Нет действий"
  const release = async () => {
    if (!canRelease) return message.warning("Недостаточно прав для передачи в закупку")
    setReleasing(true)
    try {
      const result = await createProcurementRelease({ client_request_revision_id: activeRevisionId, item_ids: selected, title: `Передача ${model.request.internal_number}`, idempotency_key: `client-ui-${activeRevisionId}-${[...selected].sort().join("-")}` })
      message.success(`Передача в закупку №${result.release.release_number} создана`)
      setReleaseOpen(false); setSelected([]); await refresh()
    } catch (error) { message.error(error?.response?.data?.message || "Не удалось передать позиции") }
    finally { setReleasing(false) }
  }
  const createRevision = async () => {
    try {
      const revision = await createClientRequestRevision(requestId, { mode: "COPY_CURRENT", change_reason: "client_update", note: "Новая версия потребности клиента" })
      message.success(`Ревизия №${revision.rev_number} создана`)
      await refresh()
      const next = new URLSearchParams(searchParams); next.set("request", requestId); next.set("revision", revision.id); setSearchParams(next)
    } catch (error) { message.error(error?.response?.data?.message || "Не удалось создать ревизию") }
  }

  if (loading) return <Skeleton active paragraph={{ rows: 12 }} />
  if (error) return <Alert type="error" message={error} action={<Button onClick={load}>Повторить</Button>} />
  const request = model.request
  const completion = revisionItems.length ? Math.round((linkedCount / revisionItems.length) * 100) : 0

  return <div className="cr-workspace">
    <div className="cr-workspace-header">
      <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack}>К реестру</Button>
      <div className="cr-header-main">
        <div><Space wrap><Title level={3}>{request.internal_number}</Title><Tag color={blockedRows.length ? "orange" : "green"}>{blockedRows.length ? `${blockedRows.length} требуют действия` : "Без блокеров"}</Tag>{readOnly && <Tag color="gold">Только просмотр</Tag>}</Space><Text type="secondary">{request.client_name} · {request.client_reference || "Без темы"}</Text></div>
        <Space wrap>
              <Select aria-label="Ревизия" value={activeRevisionId} style={{ width: 150 }} options={revisions.map((x) => ({ value: Number(x.id), label: `Ревизия №${x.rev_number}${Number(x.id) === currentRevisionId ? " · текущая" : ""}` }))} onChange={(value) => { const next = new URLSearchParams(searchParams); next.set("request", requestId); next.set("revision", value); setSearchParams(next) }} />
              {!readOnly && activeRevision?.status !== "draft" && can("client_requests.manage_revisions") && <Button onClick={createRevision}>Новая ревизия</Button>}
              {!readOnly && <Button type="primary" icon={selected.length ? <SendOutlined /> : undefined} onClick={primaryAction} disabled={(selected.length > 0 && !canRelease) || (!selected.length && activeRevision?.status !== "draft" && !blockedRows.length)}>{primaryLabel}</Button>}
        </Space>
      </div>
      <div className="cr-header-meta">
        <span><Text type="secondary">Ответственный</Text><strong>{request.owner_name || request.assigned_to_name || "Не назначен"}</strong></span>
        <span><Text type="secondary">Срок ответа</Text><strong>{formatDate(request.processing_deadline)}</strong></span>
        <span><Text type="secondary">Состояние</Text><strong>{statusLabel(request.lifecycle_stage)}</strong></span>
        <span><Text type="secondary">Ревизия</Text><strong>№{activeRevision?.rev_number} · {statusLabel(activeRevision?.status)}</strong></span>
      </div>
    </div>

    <div className="cr-progress-strip">
      <div><Text type="secondary">Идентифицировано</Text><Progress percent={completion} size="small" /></div>
      <div className="cr-metric"><strong>{revisionItems.length}</strong><span>всего строк</span></div>
      <div className="cr-metric cr-metric-success"><strong>{readyRows.length}</strong><span>готовы к передаче</span></div>
      <div className="cr-metric cr-metric-warning"><strong>{blockedRows.length}</strong><span>требуют действия</span></div>
      <div className="cr-metric"><strong>{releasedCount}</strong><span>уже переданы</span></div>
    </div>

    <Card className="cr-lines-card" title={<div><Title level={4}>Работа со строками</Title><Text type="secondary">Что запросил клиент, что уже определено и что нужно сделать дальше</Text></div>} extra={<Button icon={<ReloadOutlined />} onClick={refresh}>Обновить</Button>}>
      {readOnly && <Alert className="cr-readonly-alert" type="warning" showIcon message={`Ревизия №${activeRevision?.rev_number} зафиксирована и открыта только для просмотра`} description="Ранее созданные передачи в закупку остаются неизменными." />}
      <Table rowKey="id" size="middle" pagination={false} dataSource={revisionItems} onRow={(row) => ({ onClick: () => setActiveItem(row) })}
        rowClassName={(row) => Number(row.already_released_count) ? "" : row.readiness?.ready ? "cr-row-ready" : "cr-row-blocked"}
        rowSelection={readOnly ? undefined : { selectedRowKeys: selected, onChange: setSelected, getCheckboxProps: (row) => ({ disabled: !canRelease || !row.readiness?.ready || Number(row.already_released_count) > 0, "aria-label": row.readiness?.ready ? `Выбрать строку ${row.line_number}` : `Строка ${row.line_number} не готова` }) }}
        columns={[
          { title: "№", dataIndex: "line_number", width: 58 },
          { title: "Запрос клиента", width: 290, render: (_, row) => <div className="cr-source-cell"><strong>{row.client_description || row.client_line_text || "Без описания"}</strong><span>{[row.client_manufacturer_text, row.client_equipment_model_text, row.client_catalog_number || row.client_part_number].filter(Boolean).join(" · ") || "Технический контекст не указан"}</span></div> },
          { title: "Количество", width: 110, render: (_, row) => `${row.requested_qty || "—"} ${row.uom || ""}` },
          { title: "Позиция каталога", width: 250, render: (_, row) => row.identification_catalog_position_id ? <div className="cr-source-cell"><strong>{row.catalog_position_part_number || row.catalog_position_code}</strong><span>{row.catalog_position_name}</span></div> : <Text type="secondary">Не выбрана</Text> },
          { title: "Идентификация", width: 170, render: (_, row) => <Tag color={row.identification_status === "confirmed" ? "green" : "gold"}>{statusLabel(row.identification_status)}</Tag> },
          { title: "Готовность и действие", render: (_, row) => Number(row.already_released_count) ? <Tag color="blue">Передана в закупку</Tag> : row.readiness?.ready ? <Space><CheckCircleOutlined className="cr-success-icon" /><span>Можно передать в закупку</span></Space> : <div className="cr-blocker-cell"><span><ExclamationCircleOutlined /> {blockerText((row.readiness?.blockers || row.readiness?.blocker_codes || [])[0])}</span><Button size="small" onClick={(event) => { event.stopPropagation(); setActiveItem(row) }}>{readOnly ? "Просмотреть" : "Исправить"}</Button></div> },
        ]} />
      {!revisionItems.length && <Empty description="В этой ревизии пока нет позиций" />}
    </Card>

    <div className="cr-context-grid">
      <Card size="small" title="Передачи в закупку"><Space direction="vertical">{model.procurement_releases?.length ? model.procurement_releases.map((x) => <Tag key={x.id} color="blue">Передача №{x.release_number} · {x.item_count} поз.</Tag>) : <Text type="secondary">Пока не создавались</Text>}</Space></Card>
      <Card size="small" title="Дальнейшая работа"><Text type="secondary">Закупочная проработка, расчёт цены, КП и договор ведутся в своих разделах.</Text><Divider /><Space wrap>{(model.downstream?.sourcing_cases || []).map((x) => <Button key={x.id} type="link" href={`/sourcing?case=${x.id}`}>Открыть {x.case_number}</Button>)}</Space></Card>
      <Card size="small" title="История и документы"><Space direction="vertical"><Text type="secondary">Источники, уточнения и события относятся к выбранной ревизии.</Text><Button disabled>Открыть историю</Button></Space></Card>
    </div>

    <ItemDrawer item={activeItem} open={!!activeItem} readOnly={readOnly || Number(activeItem?.already_released_count) > 0} onClose={() => setActiveItem(null)} onSaved={refresh} requestId={requestId} />
    <ReleasePreview open={releaseOpen} items={selectedRows} revision={activeRevision} onCancel={() => setReleaseOpen(false)} onConfirm={release} loading={releasing} />
  </div>
}

export default function ClientRequestsPage() {
  const { can } = useCapabilities()
  const [searchParams, setSearchParams] = useSearchParams()
  const [requests, setRequests] = useState([])
  const [clients, setClients] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [view, setView] = useState("all")
  const [createOpen, setCreateOpen] = useState(false)
  const requestId = Number(searchParams.get("request") || 0) || null

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [registryResult, clientRows, userRows] = await Promise.all([
        getClientRequestRegistry({ view, q: search || undefined, page: 1, page_size: 100 }),
        listClients(),
        listUsers(),
      ])
      setRequests(registryResult.items || []); setClients(clientRows); setUsers(userRows)
    } catch (error) { message.error(error?.response?.data?.message || "Не удалось загрузить реестр заявок") }
    finally { setLoading(false) }
  }, [search, view])
  useEffect(() => { const timer = setTimeout(load, 300); return () => clearTimeout(timer) }, [load])

  const filtered = useMemo(() => requests, [requests])

  const openRequest = (id) => { const next = new URLSearchParams(); next.set("request", id); setSearchParams(next) }
  const closeRequest = () => setSearchParams(new URLSearchParams())
  if (requestId) return <PageWrapper><RequestWorkspace requestId={requestId} onBack={closeRequest} onChanged={load} /></PageWrapper>

  return <PageWrapper>
    <div className="cr-registry">
      <div className="cr-page-heading"><div><Title level={2}>Заявки клиентов</Title><Paragraph type="secondary">Понимание потребности клиента и подготовка готовых позиций к закупке</Paragraph></div>{can("client_requests.create") && <Button size="large" type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Новая заявка</Button>}</div>
      <Card className="cr-registry-card">
        <div className="cr-registry-toolbar"><Input allowClear prefix={<SearchOutlined />} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Номер, клиент, тема или контакт" /><Segmented options={WORK_VIEWS} value={view} onChange={setView} /><Tooltip title="Обновить"><Button icon={<ReloadOutlined />} onClick={load} /></Tooltip></div>
        <Table rowKey="id" loading={loading} dataSource={filtered} pagination={{ pageSize: 15, showSizeChanger: false }} onRow={(row) => ({ onClick: () => openRequest(row.id) })} columns={[
          { title: "Заявка", width: 150, render: (_, row) => <div className="cr-source-cell"><strong>{row.internal_number}</strong><span>{formatDate(row.received_at || row.created_at)}</span></div> },
          { title: "Клиент и тема", render: (_, row) => <div className="cr-source-cell"><strong>{row.client_name}</strong><span>{row.client_reference || "Без темы"}</span></div> },
          { title: "Позиции", width: 150, render: (_, row) => <span>{row.confirmed_lines} из {row.total_lines} определены</span> },
          { title: "Рабочее состояние", width: 180, render: (_, row) => <Tag color={row.lifecycle_stage === "released" ? "blue" : "default"}>{statusLabel(row.lifecycle_stage || row.status)}</Tag> },
          { title: "Ответственный", width: 170, render: (_, row) => row.owner_name || row.assigned_to_name || users.find((x) => Number(x.id) === Number(row.assigned_to_user_id))?.full_name || "Не назначен" },
          { title: "Срок ответа", width: 125, render: (_, row) => formatDate(row.processing_deadline) },
          { title: "Сейчас", width: 230, render: (_, row) => row.waiting_client_lines ? <Badge status="warning" text={`${row.waiting_client_lines} поз. ждут уточнения`} /> : row.open_task_lines ? <Badge status="processing" text={`${row.open_task_lines} поз. в идентификации`} /> : row.ready_for_release_lines ? <Badge status="success" text={`${row.ready_for_release_lines} поз. готовы к закупке`} /> : <Badge status="default" text="Откройте заявку" /> },
        ]} />
      </Card>
    </div>
    <ClientRequestIntakeWizard open={createOpen} clients={clients} users={users} onClose={() => setCreateOpen(false)} onCreated={async (result) => { setCreateOpen(false); await load(); openRequest(result.request_id) }} />
  </PageWrapper>
}
