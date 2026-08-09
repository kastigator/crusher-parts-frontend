import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert, Button, Card, Col, Descriptions, Empty, Form, Input, InputNumber,
  Modal, Row, Select, Skeleton, Space, Statistic, Table, Tabs, Tag, Timeline, Typography,
} from "antd"
import { useSearchParams } from "react-router-dom"
import PageWrapper from "@/components/common/PageWrapper"
import useCapabilities from "@/hooks/useCapabilities"
import { appMessage } from "@/utils/uiFeedback"
import {
  approveClientPrices, calculateRouteVariant, createCalculationGroup, createPricingCase,
  createRouteVariant, finalizePricingDecision, fixPricingInput, getPricingWorkspace,
  listPricingCases, listPricingRouteTemplates, requestPriceOverride,
  listPricingSourcingDecisions,
  requestSourcingRework, revealPricingSupplierIdentity, reviewPriceOverride,
  reviseRouteVariantParameters, selectRouteVariant,
} from "@/features/pricing/api/pricingApi"

const { Text, Title } = Typography
const STATUS_COLOR = {
  INTAKE_REVIEW: "blue", ROUTING: "cyan", PARAMETER_COLLECTION: "gold",
  CALCULATED: "processing", COMPARISON: "purple", APPROVAL: "orange",
  FIXED: "green", BLOCKED: "red", OUTDATED: "default",
  SELECTED: "green", APPROVED: "green", OVERRIDE_PENDING: "orange",
}
const STATUS_LABEL = {
  INTAKE_REVIEW: "Проверка входных данных", ROUTING: "Настройка маршрута",
  PARAMETER_COLLECTION: "Сбор параметров", CALCULATED: "Рассчитано", COMPARISON: "Сравнение",
  APPROVAL: "Согласование", FIXED: "Цена зафиксирована", BLOCKED: "Заблокировано",
  OUTDATED: "Требует пересчёта", READY: "Готов к расчёту", SELECTED: "Выбран",
  APPROVED: "Утверждено", OVERRIDE_PENDING: "Запрошено изменение", FIXED_INPUT: "Вход зафиксирован", DRAFT: "Черновик", OPEN: "Открыто", RESOLVED: "Обработано",
}
const EVENT_LABEL = {
  PricingCaseCreated:"Расчёт цены создан",PricingInputFixed:"Входные данные зафиксированы",CalculationGroupCreated:"Группа расчёта создана",
  RouteVariantCreated:"Вариант маршрута создан",RouteVariantParametersRevised:"Параметры маршрута изменены",RouteVariantCalculated:"Расчёт выполнен",
  RouteVariantSelected:"Вариант выбран",ClientPriceApproved:"Цена клиенту утверждена",PriceOverrideRequested:"Запрошено изменение цены",
  PriceOverrideReviewed:"Изменение цены рассмотрено",PricingDecisionFixed:"Решение по цене зафиксировано",SourcingReworkRequested:"Запрошена повторная закупочная проработка",
}
const ALLOCATION_LABEL = {
  BY_VALUE: "По стоимости товара", BY_WEIGHT: "По весу", BY_QUANTITY: "По количеству",
  EQUAL: "Поровну между строками", MANUAL: "Ручное распределение",
}
const ALLOCATION_HINT = {
  BY_VALUE: "Общие расходы распределяются пропорционально закупочной стоимости каждой позиции.",
  BY_WEIGHT: "Общие расходы распределяются пропорционально весу; укажите вес единицы для каждой позиции.",
  BY_QUANTITY: "Общие расходы распределяются пропорционально количеству единиц.",
  EQUAL: "Каждая позиция получает одинаковую долю общих расходов.",
  MANUAL: "Доли задаются вручную коэффициентами для логистики и прочих расходов.",
}
const BLOCK_LABEL = {
  INITIAL_COST: "Стоимость поставщика", FX_CONVERSION: "Конвертация валюты",
  GROUP_FIXED_COST: "Логистика и общие расходы", CUSTOMS_DUTY: "Таможенная пошлина (ТН ВЭД)",
  TARGET_MARKUP: "Целевая наценка", ROUNDING: "Округление", VALIDATION_CHECKPOINT: "Контроль результата",
}
const errorText = (reason) => reason?.response?.data?.error?.message || reason?.response?.data?.message || reason?.message || "Операция не выполнена"
const fmt = (value, digits = 2) => value == null ? "—" : Number(value).toLocaleString("ru-RU", { maximumFractionDigits: digits })

function Status({ value }) {
  return <Tag color={STATUS_COLOR[value]} title={value}>{STATUS_LABEL[value] || value || "—"}</Tag>
}

export default function PricingWorkspacePage() {
  const { can } = useCapabilities()
  const [searchParams, setSearchParams] = useSearchParams()
  const caseId = Number(searchParams.get("case")) || null
  const [cases, setCases] = useState([])
  const [model, setModel] = useState(null)
  const [templates, setTemplates] = useState([])
  const [sourcingDecisions, setSourcingDecisions] = useState([])
  const [loading, setLoading] = useState(true)
  const [caseLoading, setCaseLoading] = useState(false)
  const [error, setError] = useState("")
  const [dialog, setDialog] = useState(null)
  const [revealedSupplier, setRevealedSupplier] = useState(null)
  const [createForm] = Form.useForm()
  const [groupForm] = Form.useForm()
  const [variantForm] = Form.useForm()
  const [overrideForm] = Form.useForm()
  const [reworkForm] = Form.useForm()

  const loadCases = useCallback(async () => {
    setLoading(true)
    try {
      const [caseRows, templateRows, decisionRows] = await Promise.all([listPricingCases(), can("pricing.groups.manage") ? listPricingRouteTemplates() : Promise.resolve([]), listPricingSourcingDecisions()])
      setCases(caseRows)
      setTemplates(templateRows)
      setSourcingDecisions(decisionRows)
      setError("")
    } catch (reason) { setError(errorText(reason)) }
    finally { setLoading(false) }
  }, [can])

  const loadCase = useCallback(async (id) => {
    if (!id) { setModel(null); return }
    setCaseLoading(true)
    try { setModel(await getPricingWorkspace(id)); setError("") }
    catch (reason) { setError(errorText(reason)) }
    finally { setCaseLoading(false) }
  }, [])

  useEffect(() => { loadCases() }, [loadCases])
  useEffect(() => {
    if (caseId) loadCase(caseId)
    else if (!loading && cases.length) setSearchParams({ case: String(cases[0].id) }, { replace: true })
  }, [caseId, cases, loadCase, loading, setSearchParams])

  const refresh = useCallback(async () => {
    await Promise.all([loadCases(), caseId ? loadCase(caseId) : Promise.resolve()])
  }, [caseId, loadCase, loadCases])

  const run = async (operation, success, close = true) => {
    try {
      const result = await operation()
      appMessage.success(success)
      if (close) setDialog(null)
      await refresh()
      return result
    } catch (reason) { appMessage.error(errorText(reason)); return null }
  }

  const inputOptions = (model?.input_lines || []).map((line) => ({
    value: Number(line.id),
    label: `#${line.line_number_snapshot} · ${line.technical_identity_snapshot_json?.catalog_name || line.requested_identity_snapshot_json?.source_data?.client_description || line.stable_item_key_snapshot}`,
  }))
  const groupOptions = (model?.groups || []).map((group) => ({ value: Number(group.id), label: `${group.group_code} · ${group.title}` }))
  const templateOptions = templates.map((template) => ({ value: Number(template.revision_id), label: `${template.name} · r${template.revision_number}` }))
  const variants = useMemo(() => (model?.groups || []).flatMap((group) => (group.variants || []).map((variant) => ({ ...variant, group }))), [model])
  const calculations = useMemo(() => variants.flatMap((variant) => (variant.calculation_revisions || []).map((revision) => ({ ...revision, variant }))), [variants])
  const inputById = useMemo(() => new Map((model?.input_lines || []).map((line) => [Number(line.id), line])), [model])
  const selectedPriceIds = (model?.client_prices || []).filter((price) => price.status === "CALCULATED" && calculations.some((revision) => Number(revision.id) === Number(price.pricing_calculation_revision_id) && revision.status === "SELECTED")).map((price) => Number(price.id))

  const createCase = async (values) => {
    const result = await run(() => createPricingCase(values), "Расчёт цены создан")
    if (result?.case_id) setSearchParams({ case: String(result.case_id) })
  }
  const createGroup = (values) => run(() => createCalculationGroup(model.case.id, values), "Группа расчёта создана")
  const variantPayload = (values) => ({
    pricing_route_template_revision_id: values.pricing_route_template_revision_id,
    title: values.title,
    parameters: {
      fx_rates: values.fx_currency && values.fx_rate ? { [String(values.fx_currency).toUpperCase()]: values.fx_rate } : {},
      FREIGHT_TOTAL: values.freight_total,
      FREIGHT_CURRENCY: values.freight_currency,
      OTHER_TOTAL: values.other_total || 0,
      DUTY_RATE_PCT: values.duty_rate_pct,
      TARGET_MARKUP_PCT: values.target_markup_pct || 0,
      ROUNDING_INCREMENT: values.rounding_increment || 0.01,
      TOTAL_WEIGHT_KG: values.total_weight_kg || 0,
      TOTAL_VOLUME_CBM: values.total_volume_cbm || 0,
      lines: values.lines || {},
    },
  })
  const saveVariant = (values) => dialog?.variantId
    ? run(() => reviseRouteVariantParameters(dialog.variantId, { parameters: variantPayload(values).parameters }), "Новая ревизия параметров создана")
    : run(() => createRouteVariant(values.group_id, variantPayload(values)), "Вариант маршрута создан")
  const reveal = async (lineId) => {
    try { setRevealedSupplier(await revealPricingSupplierIdentity(lineId)) }
    catch (reason) { appMessage.error(errorText(reason)) }
  }

  const intakeTab = <Space direction="vertical" size={16} style={{ width: "100%" }}>
    <Alert type="info" showIcon message="Зафиксированные исходные позиции" description="Источник — только завершённое решение закупочной проработки. Запрос клиента, техническая позиция и предложение поставщика сохранены раздельно; поставщик раскрывается только пользователям с соответствующим правом." />
    {model?.input_snapshots?.map((snapshot) => <Descriptions key={snapshot.id} size="small" bordered column={{ xs: 1, md: 3 }}>
      <Descriptions.Item label="Версия">{snapshot.revision_number}</Descriptions.Item>
      <Descriptions.Item label="Состояние"><Status value={snapshot.status} /></Descriptions.Item>
      <Descriptions.Item label="Зафиксировано">{snapshot.snapshot_hash ? "Да" : "Нет"}</Descriptions.Item>
    </Descriptions>)}
    {model?.case?.status === "INTAKE_REVIEW" && can("pricing.cases.manage") ? <Button type="primary" onClick={() => run(() => fixPricingInput(model.case.id), "Исходные позиции зафиксированы")}>Зафиксировать исходные позиции</Button> : null}
    <Table rowKey="id" size="small" pagination={false} dataSource={model?.input_lines || []} columns={[
      { title: "№", dataIndex: "line_number_snapshot", width: 60 },
      { title: "Запрос клиента", render: (_, line) => <Space direction="vertical" size={0}><Text strong>{line.requested_identity_snapshot_json?.source_data?.client_part_number || "Без артикула"}</Text><Text type="secondary">{line.requested_identity_snapshot_json?.source_data?.client_description || "—"}</Text></Space> },
      { title: "Позиция каталога", render: (_, line) => <Space direction="vertical" size={0}><Text>{line.technical_identity_snapshot_json?.catalog_name || "—"}</Text><Text type="secondary">{line.technical_identity_snapshot_json?.catalog_part_number || "Позиция подтверждена"}</Text></Space> },
      { title: "Количество", render: (_, line) => `${fmt(line.client_quantity, 3)} ${line.uom_snapshot}` },
      { title: "Предложение поставщика", render: (_, line) => <Space direction="vertical" size={0}><Space><Tag>{line.supplier_alias}</Tag>{can("pricing.supplier_identity.reveal") ? <Button size="small" onClick={() => reveal(line.id)}>Показать поставщика</Button> : null}</Space><Text type="secondary">{line.supply_projection?.supplier_part_number || "Артикул не указан"}</Text>{model?.projection?.costs_visible ? <Text>{fmt(line.purchase_unit_price, 4)} {line.purchase_currency} / ед.</Text> : null}</Space> },
      { title: "Раскрытие клиенту", render: (_, line) => <Tag>{line.commercial_disclosure_snapshot_json?.type === "DISCLOSED" ? "Разрешено" : "Ограничено"}</Tag> },
    ]} />
  </Space>

  const groupsTab = <Space direction="vertical" size={16} style={{ width: "100%" }}>
    <Space wrap>
      {can("pricing.groups.manage") && model?.input_snapshots?.some((snapshot) => snapshot.status === "FIXED") ? <Button type="primary" onClick={() => { groupForm.resetFields(); groupForm.setFieldsValue({ input_line_ids: inputOptions.map((item) => item.value), allocation_method: "BY_VALUE" }); setDialog("group") }}>Новая группа расчёта</Button> : null}
      {can("pricing.groups.manage") && model?.groups?.length ? <Button onClick={() => { variantForm.resetFields(); variantForm.setFieldsValue({ group_id: model.groups[0].id, freight_currency: model.case.calculation_currency, fx_currency: "EUR", duty_rate_pct: 0, target_markup_pct: 0, rounding_increment: 0.01 }); setDialog("variant") }}>Новый вариант маршрута</Button> : null}
    </Space>
    {(model?.groups || []).map((group) => <Card key={group.id} size="small" title={<Space><Text strong>{group.title || group.group_code}</Text><Status value={group.status} /><Tag title={group.allocation_method}>{ALLOCATION_LABEL[group.allocation_method] || group.allocation_method}</Tag></Space>}>
      <Space direction="vertical" size={0}><Text type="secondary">{ALLOCATION_HINT[group.allocation_method]}</Text><Text type="secondary">Позиции: {(group.lines || []).map((line) => inputOptions.find((item) => item.value === Number(line.pricing_input_line_id))?.label).filter(Boolean).join(", ")}</Text></Space>
      <Table style={{ marginTop: 12 }} rowKey="id" size="small" pagination={false} dataSource={group.variants || []} columns={[
        { title: "Вариант маршрута", render: (_, variant) => <Space direction="vertical" size={0}><Text strong>{variant.title}</Text><Text type="secondary">{variant.template_name}</Text></Space> },
        { title: "Состояние", dataIndex: "status", render: (value) => <Status value={value} /> },
        { title: "Параметры маршрута", render: (_, variant) => { const p = variant.parameter_revisions?.at(-1)?.parameter_snapshot_json || {}; return <Space direction="vertical" size={0}><Text>Логистика: {fmt(p.FREIGHT_TOTAL)} {p.FREIGHT_CURRENCY || model.case.calculation_currency} · прочие: {fmt(p.OTHER_TOTAL)}</Text><Text>FX {Object.entries(p.fx_rates || {}).map(([currency, rate]) => `${currency} ${rate}`).join(", ") || "не требуется"} · пошлина {fmt(p.DUTY_RATE_PCT)}%</Text><Text>Наценка {fmt(p.TARGET_MARKUP_PCT)}% · округление {fmt(p.ROUNDING_INCREMENT, 4)}</Text></Space> } },
        { title: "Действия", render: (_, variant) => <Space wrap>{can("pricing.groups.manage") && ["READY", "CALCULATED", "RESERVE", "OUTDATED"].includes(variant.status) ? <Button size="small" onClick={() => { const current = variant.parameter_revisions?.at(-1)?.parameter_snapshot_json || {}; variantForm.resetFields(); variantForm.setFieldsValue({ ...current, fx_currency: Object.keys(current.fx_rates || {})[0], fx_rate: Object.values(current.fx_rates || {})[0], freight_total: current.FREIGHT_TOTAL, freight_currency: current.FREIGHT_CURRENCY, other_total: current.OTHER_TOTAL, duty_rate_pct: current.DUTY_RATE_PCT, target_markup_pct: current.TARGET_MARKUP_PCT, rounding_increment: current.ROUNDING_INCREMENT, total_weight_kg: current.TOTAL_WEIGHT_KG, total_volume_cbm: current.TOTAL_VOLUME_CBM }); setDialog({ type: "variant", variantId: variant.id }) }}>Изменить параметры</Button> : null}{can("pricing.calculate") && ["READY", "CALCULATED", "RESERVE", "OUTDATED"].includes(variant.status) ? <Button size="small" type="primary" onClick={() => run(() => calculateRouteVariant(variant.id), "Расчёт выполнен", false)}>Рассчитать</Button> : null}{can("pricing.calculate") && variant.status === "CALCULATED" ? <Button size="small" onClick={() => run(() => selectRouteVariant(variant.id), "Вариант маршрута выбран", false)}>Выбрать</Button> : null}</Space> },
      ]} />
    </Card>)}
    {!model?.groups?.length ? <Empty description="Группы расчёта ещё не созданы" /> : null}
  </Space>

  const calculationsTab = <Space direction="vertical" size={16} style={{ width: "100%" }}>
    <Alert type="info" showIcon message="Каждая версия расчёта воспроизводима" description="Система сохраняет исходные позиции, маршрут, параметры, курсы валют, состав цены до и после округления. Новая версия не перезаписывает предыдущую." />
    <Table rowKey="id" size="small" pagination={false} dataSource={calculations} columns={[
      { title: "Вариант маршрута", render: (_, revision) => revision.variant.title },
      { title: "Версия", render: (_, revision) => revision.revision_number },
      { title: "Состояние", dataIndex: "status", render: (value) => <Status value={value} /> },
      { title: "Итоговая себестоимость", render: (_, revision) => revision.totals_snapshot_json?.landed ? `${fmt(revision.totals_snapshot_json.landed)} ${model.case.calculation_currency}` : model.projection?.costs_visible ? "—" : "Доступ ограничен" },
    ]} />
    <Table rowKey="id" size="small" pagination={false} dataSource={model?.calculation_line_results || []} columns={[
      { title: "Позиция", render: (_, line) => { const input = inputById.get(Number(line.pricing_input_line_id)); return input ? <Space direction="vertical" size={0}><Text strong>Строка {input.line_number_snapshot} · {input.technical_identity_snapshot_json?.catalog_name || input.requested_identity_snapshot_json?.source_data?.client_description}</Text><Text type="secondary">{input.supply_projection?.supplier_part_number || "Без артикула поставщика"} · {fmt(input.client_quantity, 3)} {input.uom_snapshot}</Text></Space> : "Позиция" } },
      { title: "Из чего сложилась цена", render: (_, line) => { const input=inputById.get(Number(line.pricing_input_line_id)); const quantity=Number(input?.client_quantity||1); const unitCost=Number(line.landed_amount_raw||0)/quantity; const markup=Number(line.calculated_client_unit_price_raw||0)-unitCost; return <Space direction="vertical" size={0}><Text>Партия: товар {fmt(line.goods_amount_raw)} + логистика {fmt(line.freight_amount_raw)} + пошлина {fmt(line.duty_amount_raw)} + прочие {fmt(line.other_amount_raw)}</Text><Text>Себестоимость партии: {fmt(line.landed_amount_raw)} {line.currency}; за единицу: {fmt(unitCost)} {line.currency}</Text><Text>Наценка на единицу: {fmt(markup)} {line.currency}</Text></Space> } },
      { title: "До округления, за единицу", render: (_, line) => `${fmt(line.calculated_client_unit_price_raw)} ${line.currency}` },
      { title: "Цена клиенту, за единицу", render: (_, line) => <Text strong>{fmt(line.rounded_client_unit_price)} {line.currency}</Text> },
    ]} />
    <Card size="small" title="Прозрачная структура цены">
      <Table rowKey="id" size="small" pagination={false} dataSource={model?.calculation_block_results || []} columns={[
        { title: "Позиция", render: (_, block) => { const input = inputById.get(Number(block.pricing_input_line_id)); return input ? `Строка ${input.line_number_snapshot}` : "Вся группа" } },
        { title: "Компонент", render: (_, block) => <Text strong>{BLOCK_LABEL[block.block_key] || "Дополнительный компонент"}</Text> },
        { title: "Результат", render: (_, block) => block.raw_amount == null ? "Проверка выполнена" : `${fmt(block.raw_amount, 4)} ${block.currency || model.case.calculation_currency}` },
        { title: "После округления", render: (_, block) => block.rounded_amount == null ? "—" : `${fmt(block.rounded_amount, 4)} ${block.currency || model.case.calculation_currency}` },
      ]} />
    </Card>
  </Space>

  const pricesTab = <Space direction="vertical" size={16} style={{ width: "100%" }}>
    <Space wrap>{can("pricing.client_prices.manage") ? <Button type="primary" disabled={!selectedPriceIds.length} onClick={() => run(() => approveClientPrices(model.case.id, { price_line_ids: selectedPriceIds }), "Цены утверждены", false)}>Утвердить цены выбранного расчёта</Button> : null}</Space>
    <Table rowKey="id" size="small" pagination={false} dataSource={model?.client_prices || []} columns={[
      { title: "Позиция", render: (_, price) => { const input = inputById.get(Number(price.pricing_input_line_id)); return input ? `Строка ${input.line_number_snapshot} · ${input.technical_identity_snapshot_json?.catalog_name || "позиция"}` : "Позиция" } },
      { title: "Расчёт", render: (_, price) => `Ревизия ${calculations.find((item) => Number(item.id) === Number(price.pricing_calculation_revision_id))?.revision_number || "—"}` },
      { title: "До округления", render: (_, price) => `${fmt(price.calculated_unit_price)} ${price.currency}` },
      { title: "После округления", render: (_, price) => `${fmt(price.rounded_unit_price)} ${price.currency}` },
      { title: "Утверждено", render: (_, price) => price.approved_unit_price == null ? "—" : `${fmt(price.approved_unit_price)} ${price.currency}` },
      { title: "Состояние", dataIndex: "status", render: (value) => <Status value={value} /> },
      { title: "Изменение цены", render: (_, price) => can("pricing.client_prices.manage") && ["CALCULATED", "APPROVED"].includes(price.status) ? <Button size="small" onClick={() => { overrideForm.resetFields(); overrideForm.setFieldsValue({ requested_unit_price: price.approved_unit_price || price.rounded_unit_price }); setDialog({ type: "override", priceLineId: price.id }) }}>Запросить</Button> : "—" },
    ]} />
    {(model?.price_overrides || []).map((override) => <Alert key={override.id} type={override.status === "PENDING" ? "warning" : override.status === "APPROVED" ? "success" : "info"} showIcon message={`Изменение цены · ${STATUS_LABEL[override.status] || "На рассмотрении"}`} description={<Space wrap><Text>{fmt(override.previous_unit_price)} → {fmt(override.requested_unit_price)} · {override.reason}</Text>{override.status === "PENDING" && can("pricing.overrides.approve") ? <><Button size="small" type="primary" onClick={() => run(() => reviewPriceOverride(override.id, { approve: true }), "Изменение цены утверждено", false)}>Утвердить</Button><Button size="small" danger onClick={() => run(() => reviewPriceOverride(override.id, { approve: false }), "Изменение цены отклонено", false)}>Отклонить</Button></> : null}</Space>} />)}
  </Space>

  const decisionTab = <Space direction="vertical" size={16} style={{ width: "100%" }}>
    <Alert type="info" showIcon message="Зафиксированный расчёт передаётся в коммерческое предложение" description="Представления для продавца и клиента не раскрывают поставщика. Закупочные данные остаются внутри зафиксированного решения." />
    <Space wrap>{can("pricing.decisions.finalize") && model?.case?.status !== "FIXED" ? <Button type="primary" onClick={() => run(() => finalizePricingDecision(model.case.id), "Решение по цене зафиксировано", false)}>Зафиксировать решение по цене</Button> : null}{can("pricing.cases.manage") && model?.case?.status !== "FIXED" ? <Button danger onClick={() => { reworkForm.resetFields(); setDialog("rework") }}>Вернуть на закупочную проработку</Button> : null}</Space>
    {(model?.decisions || []).map((decision) => <Card key={decision.id} size="small" title={<Space><Text strong>Решение по цене, версия {decision.revision_number}</Text><Status value={decision.status} /></Space>}>
      <Table rowKey="id" size="small" pagination={false} dataSource={decision.lines || []} columns={[
        { title: "Позиция", render: (_, line) => line.client_projection_snapshot_json?.line_number },
        { title: "Описание", render: (_, line) => line.client_projection_snapshot_json?.description || "—" },
        { title: "Раскрытие", render: (_, line) => <Tag>{line.client_projection_snapshot_json?.disclosure_type === "DISCLOSED" ? "Разрешено" : "Ограничено"}</Tag> },
        { title: "Цена", render: (_, line) => `${fmt(line.approved_unit_price)} ${line.currency}` },
      ]} />
    </Card>)}
    {(model?.rework_signals || []).map((signal) => <Alert key={signal.id} type="warning" showIcon message={`Возврат на закупочную проработку · ${STATUS_LABEL[signal.status]||'Открыто'}`} description={signal.reason_code||"Требуется проверить исходные данные; зафиксированное решение поставщика не изменено."} />)}
    <Timeline items={(model?.history || []).map((event) => ({ children: <Space direction="vertical" size={0}><Text strong>{EVENT_LABEL[event.event_type]||"Действие с расчётом цены"}</Text><Text type="secondary">{event.created_at ? new Date(event.created_at).toLocaleString("ru-RU") : ""} · {event.actor_name || "Система"}</Text></Space> }))} />
  </Space>

  return <PageWrapper title="Расчёт цены">
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {error ? <Alert type="error" showIcon message={error} closable onClose={() => setError("")} /> : null}
      <Card><Space wrap style={{ width: "100%", justifyContent: "space-between" }}><Space direction="vertical" size={0}><Title level={3} style={{ margin: 0 }}>Расчёт цены</Title><Text type="secondary">Исходные позиции → группы расчёта → варианты маршрута → структура цены → решение</Text></Space>{can("pricing.cases.manage") ? <Button type="primary" onClick={() => { createForm.resetFields(); createForm.setFieldsValue({ calculation_currency: "USD" }); setDialog("case") }}>Принять решение закупочной проработки</Button> : null}</Space></Card>
      <Card title="Очередь расчётов" bodyStyle={{ padding: 0 }}><Table rowKey="id" size="small" loading={loading} pagination={{ pageSize: 8 }} dataSource={cases} columns={[
        { title: "Расчёт", render: (_, item) => <Space direction="vertical" size={0}><Text strong>{item.case_number}</Text><Text type="secondary">{item.title}</Text></Space> },
        { title: "Состояние", dataIndex: "status", render: (value) => <Status value={value} /> },
        { title: "Позиций", dataIndex: "input_line_count" }, { title: "Групп", dataIndex: "group_count" }, { title: "Решений", dataIndex: "decision_count" },
      ]} onRow={(row) => ({ onClick: () => setSearchParams({ case: String(row.id) }), style: { cursor: "pointer", background: Number(row.id) === caseId ? "#e6f4ff" : undefined } })} /></Card>
      {caseLoading ? <Skeleton active paragraph={{ rows: 8 }} /> : model ? <Card title={<Space><Text strong>{model.case.case_number}</Text><Status value={model.case.status} /><Text type="secondary">Источник: решение закупочной проработки, версия {model.case.sourcing_decision_revision}</Text></Space>}>
        <Row gutter={16} style={{ marginBottom: 16 }}><Col xs={12} md={6}><Statistic title="Исходных позиций" value={model.input_lines.length} /></Col><Col xs={12} md={6}><Statistic title="Групп расчёта" value={model.groups.length} /></Col><Col xs={12} md={6}><Statistic title="Версий расчёта" value={calculations.length} /></Col><Col xs={12} md={6}><Statistic title="Решений" value={model.decisions.length} /></Col></Row>
        <Tabs items={[
          { key: "intake", label: "Исходные позиции", children: intakeTab },
          { key: "groups", label: "Группы и маршруты", children: groupsTab },
          { key: "calculations", label: "Структура цены", children: calculationsTab },
          { key: "prices", label: "Цены клиенту", children: pricesTab },
          { key: "decision", label: "Решение и история", children: decisionTab },
        ]} />
      </Card> : <Empty description="Выберите расчёт цены" />}
    </Space>

    <Modal open={dialog === "case"} title="Новый расчёт цены" onCancel={() => setDialog(null)} onOk={() => createForm.submit()}><Form form={createForm} layout="vertical" onFinish={createCase}><Form.Item name="sourcing_decision_id" label="Решение закупочной проработки" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={sourcingDecisions.map((item) => ({ value: Number(item.id), label: `${item.client_name} · ${item.request_number} · ${item.case_number} · версия ${item.revision_number} · ${item.line_count} поз.` }))} placeholder="Выберите бизнес-документ" /></Form.Item><Form.Item name="title" label="Название"><Input /></Form.Item><Form.Item name="calculation_currency" label="Валюта расчёта" rules={[{ required: true }]}><Input maxLength={3} /></Form.Item></Form></Modal>
    <Modal open={dialog === "group"} title="Группа расчёта" onCancel={() => setDialog(null)} onOk={() => groupForm.submit()} width={680}><Form form={groupForm} layout="vertical" onFinish={createGroup}><Form.Item name="title" label="Название"><Input /></Form.Item><Form.Item name="input_line_ids" label="Позиции" rules={[{ required: true }]}><Select mode="multiple" options={inputOptions} /></Form.Item><Form.Item name="allocation_method" label="Как распределять логистику и общие расходы" rules={[{ required: true }]}><Select options={Object.entries(ALLOCATION_LABEL).map(([value, label]) => ({ value, label }))} /></Form.Item><Card size="small" title="Как выбрать режим"><Space direction="vertical" size={4}>{Object.entries(ALLOCATION_LABEL).map(([value,label])=><Text key={value}><Text strong>{label}:</Text> {ALLOCATION_HINT[value]}</Text>)}</Space></Card></Form></Modal>
    <Modal open={dialog === "variant" || dialog?.type === "variant"} title={dialog?.variantId ? "Новая ревизия параметров" : "Вариант логистического маршрута"} onCancel={() => setDialog(null)} onOk={() => variantForm.submit()} width={820}><Form form={variantForm} layout="vertical" onFinish={saveVariant}><Alert type="info" showIcon style={{ marginBottom: 12 }} message="Все суммы будут показаны в структуре цены" description="FX конвертирует закупочную и логистическую валюту; логистика и прочие расходы распределяются методом группы; пошлина, наценка и округление применяются последовательно." /><Row gutter={12}>{!dialog?.variantId ? <><Col span={12}><Form.Item name="group_id" label="Группа расчёта" rules={[{ required: true }]}><Select options={groupOptions} /></Form.Item></Col><Col span={12}><Form.Item name="pricing_route_template_revision_id" label="Шаблон маршрута" rules={[{ required: true }]}><Select options={templateOptions} /></Form.Item></Col><Col span={24}><Form.Item name="title" label="Название варианта"><Input /></Form.Item></Col></> : null}<Col span={6}><Form.Item name="fx_currency" label="Валюта закупки"><Input maxLength={3} /></Form.Item></Col><Col span={6}><Form.Item name="fx_rate" label="Курс в валюту расчёта"><InputNumber min={0} precision={8} style={{ width: "100%" }} /></Form.Item></Col><Col span={6}><Form.Item name="freight_total" label="Логистика, всего"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col><Col span={6}><Form.Item name="freight_currency" label="Валюта логистики"><Input maxLength={3} /></Form.Item></Col><Col span={6}><Form.Item name="other_total" label="Прочие общие расходы"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col><Col span={6}><Form.Item name="duty_rate_pct" label="Таможенная пошлина, %" extra="По ТН ВЭД позиции" rules={[{ required: true }]}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col><Col span={6}><Form.Item name="target_markup_pct" label="Целевая наценка, %"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col><Col span={6}><Form.Item name="rounding_increment" label="Шаг округления"><InputNumber min={0.0001} precision={4} style={{ width: "100%" }} /></Form.Item></Col><Col span={12}><Form.Item name="total_weight_kg" label="Вес маршрута, кг"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col><Col span={12}><Form.Item name="total_volume_cbm" label="Объём маршрута, м³"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col></Row><Card size="small" title="Параметры распределения по позициям"><Text type="secondary">Вес используется для режима «По весу». Ручные коэффициенты используются только в режиме «Ручное распределение».</Text>{inputOptions.map((item) => <Row gutter={12} key={item.value} style={{ marginTop: 8 }}><Col span={12}><Text>{item.label}</Text></Col><Col span={4}><Form.Item name={["lines", String(item.value), "WEIGHT_KG"]} label="Вес/ед., кг" style={{ marginBottom: 0 }}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col><Col span={4}><Form.Item name={["lines", String(item.value), "FREIGHT_ALLOCATION_WEIGHT"]} label="Коэф. логистики" style={{ marginBottom: 0 }}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col><Col span={4}><Form.Item name={["lines", String(item.value), "OTHER_ALLOCATION_WEIGHT"]} label="Коэф. прочих" style={{ marginBottom: 0 }}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col></Row>)}</Card></Form></Modal>
    <Modal open={dialog?.type === "override"} title="Запрос на изменение цены" onCancel={() => setDialog(null)} onOk={() => overrideForm.submit()}><Form form={overrideForm} layout="vertical" onFinish={(values) => run(() => requestPriceOverride(dialog.priceLineId, values), "Запрос на изменение цены создан")}><Form.Item name="requested_unit_price" label="Новая цена за единицу" rules={[{ required: true }]}><InputNumber min={0} precision={4} style={{ width: "100%" }} /></Form.Item><Form.Item name="reason" label="Обоснование" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item></Form></Modal>
    <Modal open={dialog === "rework"} title="Вернуть на закупочную проработку" onCancel={() => setDialog(null)} onOk={() => reworkForm.submit()} okText="Зафиксировать возврат" cancelText="Отмена"><Form form={reworkForm} layout="vertical" onFinish={(values) => run(() => requestSourcingRework(model.case.id, values), "Возврат на закупочную проработку зафиксирован")}><Alert style={{ marginBottom: 12 }} type="warning" showIcon message="Зафиксированное решение поставщика останется неизменным; будет создан запрос на проверку исходных данных." /><Form.Item name="reason_code" label="Причина возврата" rules={[{ required: true }]}><Input placeholder="Опишите, какие исходные данные требуется проверить" /></Form.Item><Form.Item name="sourcing_demand_id" label="Позиция (необязательно)"><Select allowClear options={(model?.input_lines||[]).map(line=>({value:Number(line.sourcing_demand_id),label:line.catalog_position_name||line.catalog_part_number||line.stable_item_key_snapshot||`Позиция ${line.line_number}`}))}/></Form.Item></Form></Modal>
    <Modal open={Boolean(revealedSupplier)} title="Данные поставщика" footer={null} onCancel={() => setRevealedSupplier(null)}><Alert type="warning" showIcon message="Просмотр записан в историю расчёта" /><Descriptions bordered column={1} style={{ marginTop: 12 }}><Descriptions.Item label="Поставщик">{revealedSupplier?.supplier_name || revealedSupplier?.name || "—"}</Descriptions.Item><Descriptions.Item label="Артикул поставщика">{revealedSupplier?.supplier_part_number || revealedSupplier?.part_number || "—"}</Descriptions.Item></Descriptions></Modal>
  </PageWrapper>
}
