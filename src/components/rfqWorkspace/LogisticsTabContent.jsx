import React, { useEffect, useMemo, useState } from "react"
import {
  Alert,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd"
import axios from "@/api/axiosInstance"
import { formatIncotermsWithPlace } from "./rfqWorkspaceUtils"
import DraggableColumnsTable from "@/components/common/DraggableColumnsTable"
import { getClientFacingDescription, getClientFacingPartNumber } from "@/components/rfqWorkspace/partDisplay"
import { formatCompactNumber } from "@/utils/numberFormat"

const currencyOptions = [
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "RUB", label: "RUB" },
  { value: "CNY", label: "CNY" },
]

const ROUTE_TYPE_LABELS = {
  MANUAL: "Ручной",
  ROAD: "Авто",
  AIR: "Авиа",
  SEA: "Море",
  RAIL: "Ж/д",
  MULTI: "Мультимодально",
}

const deliveryModeOptions = [
  { value: "MANUAL", label: ROUTE_TYPE_LABELS.MANUAL },
  { value: "ROAD", label: ROUTE_TYPE_LABELS.ROAD },
  { value: "AIR", label: ROUTE_TYPE_LABELS.AIR },
  { value: "SEA", label: ROUTE_TYPE_LABELS.SEA },
  { value: "RAIL", label: ROUTE_TYPE_LABELS.RAIL },
  { value: "MULTI", label: ROUTE_TYPE_LABELS.MULTI },
]

const freightModeOptions = [
  { value: "TOTAL", label: "Общая сумма" },
  { value: "PER_KG", label: "Ставка за кг" },
  { value: "MANUAL_ALLOC", label: "Ручное распределение" },
]

const fmt = (value) => (value === null || value === undefined || value === "" ? "—" : value)
const fmtNumber = (value, maximumFractionDigits = 3) => {
  const digits = Number.isInteger(maximumFractionDigits) ? maximumFractionDigits : 3
  return formatCompactNumber(value, { maximumFractionDigits: digits })
}
const formatRouteType = (value) => ROUTE_TYPE_LABELS[String(value || "").toUpperCase()] || fmt(value)
const { Paragraph, Text } = Typography

const LOGISTICS_WARNING_LABELS = {
  missing_origin_country: "Нет страны происхождения",
  missing_incoterms: "Нет Incoterms",
  missing_incoterms_place: "Нет пункта Incoterms",
  missing_weight: "Нет веса",
  missing_lead_time: "Нет срока",
  missing_tnved: "Нет ТН ВЭД",
  missing_duty_rate: "Нет ставки пошлины",
  mixed_duty_rates: "Смешанные ставки пошлины",
  mixed_origin_countries: "Смешаны страны происхождения",
  mixed_incoterms: "Смешаны разные Incoterms",
  mixed_incoterms_places: "Смешаны разные пункты Incoterms",
  missing_customs_data: "Не хватает данных для таможни",
  missing_fx_rate: "Нет курса валют",
}

const normalizeText = (value) => {
  if (value === undefined || value === null) return ""
  return String(value).trim()
}

const parseWarningsFromSourceNote = (value) => {
  const text = normalizeText(value)
  if (!text.toLowerCase().startsWith("предупреждения:")) return []
  const payload = text.split(":").slice(1).join(":")
  return payload
    .split(",")
    .map((item) => normalizeText(item))
    .filter(Boolean)
}

const buildLineWarnings = (row) => {
  const warnings = []
  if (!normalizeText(row?.origin_country) && !normalizeText(row?.cost_origin_country)) {
    warnings.push("missing_origin_country")
  }
  if (!normalizeText(row?.incoterms)) {
    warnings.push("missing_incoterms")
  }
  if (normalizeText(row?.incoterms) && !normalizeText(row?.incoterms_place)) {
    warnings.push("missing_incoterms_place")
  }
  if (row?.weight_kg === null || row?.weight_kg === undefined || row?.weight_kg === "") {
    warnings.push("missing_weight")
  }
  if (row?.lead_time_days === null || row?.lead_time_days === undefined || row?.lead_time_days === "") {
    warnings.push("missing_lead_time")
  }
  if (!normalizeText(row?.tnved_code) && !normalizeText(row?.cost_tnved_code) && !row?.tnved_code_id && !row?.cost_tnved_code_id) {
    warnings.push("missing_tnved")
  }
  if ((normalizeText(row?.tnved_code) || normalizeText(row?.cost_tnved_code) || row?.tnved_code_id || row?.cost_tnved_code_id) &&
      (row?.duty_rate_pct === null || row?.duty_rate_pct === undefined || row?.duty_rate_pct === "" ) &&
      (row?.cost_duty_rate_pct === null || row?.cost_duty_rate_pct === undefined || row?.cost_duty_rate_pct === "")) {
    warnings.push("missing_duty_rate")
  }
  return warnings
}

const buildGroupWarnings = (row) => {
  const compatibilityWarnings = []
  const lines = Array.isArray(row?.lines) ? row.lines : []
  const uniqueOrigins = Array.from(new Set(lines.map((line) => normalizeText(line?.origin_country_raw || line?.origin_country)).filter(Boolean)))
  const uniqueIncoterms = Array.from(new Set(lines.map((line) => normalizeText(line?.incoterms)).filter(Boolean)))
  const uniqueIncotermsPlaces = Array.from(new Set(lines.map((line) => normalizeText(line?.incoterms_place)).filter(Boolean)))
  const missingCustomsData = lines.some((line) =>
    !normalizeText(line?.tnved_code) && !normalizeText(line?.cost_tnved_code) && !line?.tnved_code_id && !line?.cost_tnved_code_id
  )

  if (uniqueOrigins.length > 1) compatibilityWarnings.push("mixed_origin_countries")
  if (uniqueIncoterms.length > 1) compatibilityWarnings.push("mixed_incoterms")
  if (uniqueIncotermsPlaces.length > 1) compatibilityWarnings.push("mixed_incoterms_places")
  if (missingCustomsData) compatibilityWarnings.push("missing_customs_data")

  const lineWarnings = Array.isArray(row?.lines)
    ? row.lines.flatMap((line) => buildLineWarnings(line))
    : []
  const sourceWarnings = parseWarningsFromSourceNote(row?.source_note)
  return Array.from(new Set([...compatibilityWarnings, ...lineWarnings, ...sourceWarnings]))
}

const renderWarnings = (warnings) => {
  const items = Array.from(new Set((warnings || []).filter(Boolean)))
  if (!items.length) return <Tag color="green">Данных достаточно</Tag>
  return (
    <Space size={[4, 4]} wrap>
      {items.map((warning) => (
        <Tag key={warning} color="orange">
          {LOGISTICS_WARNING_LABELS[warning] || warning}
        </Tag>
      ))}
    </Space>
  )
}

const formatOriginSummary = (row) => {
  const country = normalizeText(row?.from_country || row?.origin_country)
  const place = normalizeText(row?.incoterms_place)
  if (country && place) return `${country} · ${place}`
  return country || place || "—"
}

const renderOriginCell = (row) => {
  const snapshotOrigin = normalizeText(row?.origin_country_raw || row?.origin_country)
  const costBaseOrigin = normalizeText(row?.cost_origin_country)
  const supplierCountry = normalizeText(row?.supplier_country)
  const strictOrigin = snapshotOrigin || costBaseOrigin
  const display = strictOrigin || "не указана"
  let source = "не определён"
  if (snapshotOrigin) source = "из покрытия"
  else if (costBaseOrigin) source = "из ответа / cost base"
  else source = "не заполнена"

  return (
    <Space direction="vertical" size={0}>
      <span>{display}</span>
      <span style={{ color: "#666", fontSize: 12 }}>Источник: {source}</span>
      {!strictOrigin && supplierCountry ? (
        <span style={{ color: "#666", fontSize: 12 }}>Страна поставщика: {supplierCountry}</span>
      ) : null}
    </Space>
  )
}

const LOGISTICS_HELP_SECTIONS = [
  {
    title: "Зачем нужна вкладка",
    body:
      "Логистика собирает строки выбранного сценария в группы отгрузки. Здесь вы определяете, какие позиции едут вместе, каким способом доставки, с каким freight и каким ETA. Именно отсюда данные переходят в Экономику.",
  },
  {
    title: "Откуда берутся данные",
    body:
      "Основа берётся из сценария и ответов поставщиков: страна происхождения, Incoterms, пункт Incoterms, срок и вес. Если страна происхождения не указана, страна поставщика показывается только как справка и не считается полноценной заменой origin.",
  },
  {
    title: "Как работает автогруппировка",
    body:
      "Автогруппировка объединяет строки только если совпадают поставщик, страна происхождения, Incoterms и пункт Incoterms. Если эти признаки различаются, строки автоматически разводятся по разным группам.",
  },
  {
    title: "Когда нужна ручная группа",
    body:
      "Ручная группа нужна, когда вы хотите осознанно объединить или разделить строки не по стандартной логике: отдельная консолидация, особый способ доставки, смешанная поставка, нестандартный freight или отдельный ETA.",
  },
  {
    title: "Что проверить перед расчётом",
    body:
      "Для качественной логистики по строкам должны быть известны как минимум страна происхождения, Incoterms, пункт Incoterms, вес и срок. Если чего-то не хватает, сначала проверьте ответы поставщика или мастер-данные, а потом пересоберите группы.",
  },
]

const REMEDIATION_ACTIONS = {
  missing_origin_country: {
    tabKey: "responses",
    buttonLabel: "Открыть Ответы",
    hint: "Проверьте страну происхождения в ответе поставщика или задайте её в ручном варианте покрытия.",
  },
  missing_weight: {
    tabKey: "responses",
    buttonLabel: "Открыть Ответы",
    hint: "Проверьте вес в детали поставщика на вкладке Ответы. Для ручного варианта покрытия вес можно задать прямо в Покрытии.",
  },
  missing_incoterms: {
    tabKey: "responses",
    buttonLabel: "Открыть Ответы",
    hint: "Проверьте Incoterms в ответе поставщика или заполните их в ручном варианте покрытия.",
  },
  missing_incoterms_place: {
    tabKey: "responses",
    buttonLabel: "Открыть Ответы",
    hint: "Проверьте пункт Incoterms в ответе поставщика или заполните его в ручном варианте покрытия.",
  },
  missing_lead_time: {
    tabKey: "responses",
    buttonLabel: "Открыть Ответы",
    hint: "Проверьте срок поставки в ответе поставщика или задайте его в ручном варианте покрытия.",
  },
  missing_tnved: {
    tabKey: "coverage",
    buttonLabel: "Открыть Покрытие",
    hint: "Проверьте связь покрытия с номенклатурой и ТН ВЭД.",
  },
  missing_duty_rate: {
    tabKey: "coverage",
    buttonLabel: "Открыть Покрытие",
    hint: "ТН ВЭД найден, но ставки пошлины нет. Проверьте справочник ТН ВЭД.",
  },
}

const buildRemediationItems = (warnings = []) =>
  Array.from(new Set((warnings || []).filter(Boolean)))
    .map((warning) => ({ warning, ...(REMEDIATION_ACTIONS[warning] || {}) }))
    .filter((item) => item.hint)

export default function LogisticsTabContent({ rfqId, onNavigateTab }) {
  const [scenarios, setScenarios] = useState([])
  const [selectedScenarioId, setSelectedScenarioId] = useState(null)
  const [groups, setGroups] = useState([])
  const [editingGroupId, setEditingGroupId] = useState(null)
  const [poolRows, setPoolRows] = useState([])
  const [selectedLineIds, setSelectedLineIds] = useState([])
  const [loadingScenarios, setLoadingScenarios] = useState(false)
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [loadingPool, setLoadingPool] = useState(false)
  const [autoBuilding, setAutoBuilding] = useState(false)
  const [savingGroup, setSavingGroup] = useState(false)
  const [savingLines, setSavingLines] = useState(false)
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [groupColumnKeys, setGroupColumnKeys] = useState([])
  const [poolColumnKeys, setPoolColumnKeys] = useState([])
  const [helpOpen, setHelpOpen] = useState(false)
  const [form] = Form.useForm()
  const [manualForm] = Form.useForm()

  const loadScenarios = async () => {
    if (!rfqId) return
    setLoadingScenarios(true)
    try {
      const { data } = await axios.get(`/economics/rfq/${rfqId}/scenarios`)
      const rows = Array.isArray(data?.rows) ? data.rows : []
      setScenarios(rows)
      setSelectedScenarioId((prev) => prev || Number(rows?.[0]?.id || 0) || null)
    } catch (e) {
      setScenarios([])
      setSelectedScenarioId(null)
      message.error(e?.response?.data?.message || "Не удалось загрузить сценарии")
    } finally {
      setLoadingScenarios(false)
    }
  }

  const loadGroups = async (scenarioIdOverride) => {
    const scenarioId = Number(scenarioIdOverride || selectedScenarioId || 0) || null
    if (!rfqId || !scenarioId) {
      setGroups([])
      return
    }
    setLoadingGroups(true)
    try {
      const { data } = await axios.get(`/economics/rfq/${rfqId}/scenarios/${scenarioId}/shipment-groups`)
      setGroups(Array.isArray(data?.rows) ? data.rows : [])
    } catch (e) {
      setGroups([])
      message.error(e?.response?.data?.message || "Не удалось загрузить группы отгрузки")
    } finally {
      setLoadingGroups(false)
    }
  }

  const loadPool = async (groupIdOverride) => {
    const scenarioId = Number(selectedScenarioId || 0) || null
    const groupId = Number(groupIdOverride || editingGroupId || 0) || null
    if (!rfqId || !scenarioId || !groupId) {
      setPoolRows([])
      return
    }
    setLoadingPool(true)
    try {
      const { data } = await axios.get(`/economics/rfq/${rfqId}/scenarios/${scenarioId}/shipment-line-pool`, {
        params: { group_id: groupId },
      })
      const rows = Array.isArray(data?.rows) ? data.rows : []
      setPoolRows(rows)
    } catch (e) {
      setPoolRows([])
      message.error(e?.response?.data?.message || "Не удалось загрузить строки для группы")
    } finally {
      setLoadingPool(false)
    }
  }

  useEffect(() => {
    loadScenarios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId])

  useEffect(() => {
    setEditingGroupId(null)
    setPoolRows([])
    setSelectedLineIds([])
    loadGroups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId, selectedScenarioId])

  useEffect(() => {
    loadPool()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingGroupId])

  const handleAutoBuild = async () => {
    const scenarioId = Number(selectedScenarioId || 0)
    if (!rfqId || !scenarioId) return
    setAutoBuilding(true)
    try {
      const { data } = await axios.post(`/economics/rfq/${rfqId}/scenarios/${scenarioId}/shipment-groups/auto`)
      message.success(data?.message || "Группы отгрузки созданы")
      await loadGroups(scenarioId)
      await loadScenarios()
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось создать группы отгрузки")
    } finally {
      setAutoBuilding(false)
    }
  }

  const currentGroup = useMemo(
    () => groups.find((row) => Number(row?.id || 0) === Number(editingGroupId || 0)) || null,
    [groups, editingGroupId]
  )

  const startEdit = (row) => {
    const nextGroupId = Number(row?.id || 0) || null
    setEditingGroupId(nextGroupId)
    form.setFieldsValue({
      name: row?.name || "",
      route_type: row?.route_type || "MANUAL",
      incoterms: row?.incoterms || null,
      incoterms_place: row?.incoterms_place || null,
      readiness_date: row?.readiness_date || null,
      freight_input_mode: row?.freight_input_mode || "TOTAL",
      freight_total: row?.freight_total ?? null,
      freight_currency: row?.freight_currency || "USD",
      freight_rate_per_kg: row?.freight_rate_per_kg ?? null,
      eta_min_days: row?.eta_min_days ?? null,
      eta_max_days: row?.eta_max_days ?? null,
      source_note: row?.source_note || null,
    })
    setSelectedLineIds(
      Array.isArray(row?.lines)
        ? row.lines.map((line) => Number(line.coverage_option_line_id || 0)).filter(Boolean)
        : []
    )
  }

  const saveGroupHeader = async () => {
    const groupId = Number(editingGroupId || 0)
    if (!groupId) return
    let values
    try {
      values = await form.validateFields()
    } catch (_e) {
      return
    }
    setSavingGroup(true)
    try {
      const { data } = await axios.patch(`/economics/shipment-groups/${groupId}`, values)
      message.success(data?.message || "Группа обновлена")
      await loadGroups()
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось обновить группу")
    } finally {
      setSavingGroup(false)
    }
  }

  const saveGroupLines = async () => {
    const groupId = Number(editingGroupId || 0)
    if (!groupId) return
    const selectedSet = new Set(selectedLineIds.map((id) => Number(id)))
    const lines = poolRows
      .filter((row) => selectedSet.has(Number(row.id)))
      .map((row) => ({
        coverage_option_line_id: Number(row.id),
        qty_allocated: row.qty,
        weight_allocated_kg: row.weight_kg,
        included: 1,
      }))

    setSavingLines(true)
    try {
      const { data } = await axios.put(`/economics/shipment-groups/${groupId}/lines`, { lines })
      message.success(data?.message || "Состав группы обновлён")
      await loadGroups()
      await loadPool(groupId)
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось обновить состав группы")
    } finally {
      setSavingLines(false)
    }
  }

  const openManualModal = () => {
    manualForm.setFieldsValue({
      name: `Ручная группа ${groups.length + 1}`,
      route_type: "MANUAL",
      freight_input_mode: "TOTAL",
      freight_currency: "USD",
      consolidation_mode: "MANUAL",
    })
    setManualModalOpen(true)
  }

  const handleCreateManualGroup = async () => {
    const scenarioId = Number(selectedScenarioId || 0)
    if (!rfqId || !scenarioId) return
    let values
    try {
      values = await manualForm.validateFields()
    } catch (_e) {
      return
    }

    setCreatingGroup(true)
    try {
      const { data } = await axios.post(`/economics/rfq/${rfqId}/scenarios/${scenarioId}/shipment-groups`, values)
      message.success(data?.message || "Ручная группа создана")
      setManualModalOpen(false)
      await loadGroups(scenarioId)
      if (data?.row?.id) startEdit(data.row)
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось создать ручную группу")
    } finally {
      setCreatingGroup(false)
    }
  }

  const poolSelection = {
    selectedRowKeys: selectedLineIds,
    onChange: (keys) => setSelectedLineIds(keys.map((key) => Number(key))),
    getCheckboxProps: (record) => ({
      disabled:
        Number(record.assigned_group_id || 0) > 0 &&
        Number(record.assigned_group_id || 0) !== Number(editingGroupId || 0),
    }),
  }

  const groupColumns = useMemo(
    () => [
      { key: "name", title: "Группа", dataIndex: "name" },
      { key: "supplier", title: "Поставщик", width: 160, render: (_, row) => fmt(row?.lines?.[0]?.supplier_name || row?.supplier_id) },
      { key: "from_country", title: "Откуда", width: 180, render: (_, row) => formatOriginSummary(row) },
      { key: "route_type", title: "Способ доставки", dataIndex: "route_type", width: 140, render: formatRouteType },
      {
        key: "incoterms",
        title: "Incoterms",
        width: 180,
        render: (_, row) => formatIncotermsWithPlace(row?.incoterms, row?.incoterms_place),
      },
      { key: "weight", title: "Вес, кг", dataIndex: "total_weight_kg", width: 120, render: fmtNumber },
      {
        key: "warnings",
        title: "Проблемы",
        width: 260,
        render: (_, row) => renderWarnings(buildGroupWarnings(row)),
      },
      { key: "lines", title: "Строк", width: 90, render: (_, row) => Array.isArray(row?.lines) ? row.lines.length : 0 },
      {
        key: "actions",
        title: "Действия",
        width: 120,
        render: (_, row) => (
          <Button size="small" onClick={() => startEdit(row)}>
            Открыть
          </Button>
        ),
      },
    ],
    [startEdit],
  )

  const poolColumns = useMemo(
    () => [
      {
        key: "rfq_line",
        title: "Строка RFQ",
        width: 260,
        render: (_, row) => (
          <Space direction="vertical" size={0}>
            <span>{fmt(row.line_number)} · {getClientFacingPartNumber(row, `RFQ ${row.rfq_item_id}`)}</span>
            {getClientFacingDescription(row) ? <span style={{ color: "#666", fontSize: 12 }}>{getClientFacingDescription(row)}</span> : null}
          </Space>
        ),
      },
      { key: "option", title: "Вариант", width: 180, render: (_, row) => `${row.option_code} · ${row.option_kind}` },
      { key: "supplier", title: "Поставщик", dataIndex: "supplier_name", width: 180, render: fmt },
      { key: "origin_country", title: "Страна происхождения", width: 220, render: (_, row) => renderOriginCell(row) },
      { key: "tnved", title: "ТН ВЭД", width: 140, render: (_, row) => fmt(row?.tnved_code || row?.cost_tnved_code) },
      { key: "duty_rate", title: "Пошлина, %", width: 110, render: (_, row) => fmtNumber(row?.duty_rate_pct ?? row?.cost_duty_rate_pct) },
      {
        key: "incoterms",
        title: "Incoterms",
        width: 180,
        render: (_, row) => formatIncotermsWithPlace(row?.incoterms, row?.incoterms_place),
      },
      { key: "line_role", title: "Роль", dataIndex: "line_role", width: 120, render: fmt },
      { key: "qty", title: "Кол-во", dataIndex: "qty", width: 90, render: fmtNumber },
      { key: "weight", title: "Вес, кг", dataIndex: "weight_kg", width: 90, render: fmtNumber },
      { key: "lead_time_days", title: "Срок, дн", dataIndex: "lead_time_days", width: 100, render: (_, row) => fmtNumber(row?.lead_time_days, 0) },
      {
        key: "warnings",
        title: "Проблемы",
        width: 260,
        render: (_, row) => renderWarnings(buildLineWarnings(row)),
      },
      {
        key: "assignment",
        title: "Назначение",
        width: 130,
        render: (_, row) => {
          const assigned = Number(row.assigned_group_id || 0) || null
          if (!assigned) return <Tag>Свободно</Tag>
          if (assigned === Number(editingGroupId || 0)) return <Tag color="green">В этой группе</Tag>
          return <Tag color="orange">В группе {assigned}</Tag>
        },
      },
    ],
    [editingGroupId],
  )

  useEffect(() => {
    const nextKeys = groupColumns.map((column) => column.key).filter(Boolean)
    setGroupColumnKeys((prev) => {
      const prevSet = new Set(prev)
      const preserved = prev.filter((key) => nextKeys.includes(key))
      const missing = nextKeys.filter((key) => !prevSet.has(key))
      const merged = [...preserved, ...missing]
      return merged.length === prev.length && merged.every((key, index) => key === prev[index]) ? prev : merged
    })
  }, [groupColumns])

  useEffect(() => {
    const nextKeys = poolColumns.map((column) => column.key).filter(Boolean)
    setPoolColumnKeys((prev) => {
      const prevSet = new Set(prev)
      const preserved = prev.filter((key) => nextKeys.includes(key))
      const missing = nextKeys.filter((key) => !prevSet.has(key))
      const merged = [...preserved, ...missing]
      return merged.length === prev.length && merged.every((key, index) => key === prev[index]) ? prev : merged
    })
  }, [poolColumns])

  const orderedGroupColumns = useMemo(() => {
    if (!groupColumnKeys.length) return groupColumns
    const byKey = new Map(groupColumns.map((column) => [column.key, column]))
    return groupColumnKeys.map((key) => byKey.get(key)).filter(Boolean)
  }, [groupColumns, groupColumnKeys])

  const orderedPoolColumns = useMemo(() => {
    if (!poolColumnKeys.length) return poolColumns
    const byKey = new Map(poolColumns.map((column) => [column.key, column]))
    return poolColumnKeys.map((key) => byKey.get(key)).filter(Boolean)
  }, [poolColumns, poolColumnKeys])

  const logisticsRemediationItems = useMemo(() => {
    const groupWarnings = groups.flatMap((row) => buildGroupWarnings(row))
    const poolWarnings = poolRows.flatMap((row) => buildLineWarnings(row))
    return buildRemediationItems([...groupWarnings, ...poolWarnings])
  }, [groups, poolRows])

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <div
        style={{
          padding: "6px 0 2px",
          color: "#666",
          fontSize: 14,
        }}
      >
        Логистика рассчитывается по группам отгрузки выбранного сценария. Сначала создайте группы автоматически или вручную, затем задайте способ доставки, freight и ETA.
      </div>

      {logisticsRemediationItems.length ? (
        <Alert
          type="warning"
          showIcon
          message="Перед фиксацией логистики лучше уточнить недостающие данные"
          description={
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              {logisticsRemediationItems.map((item) => (
                <Space key={item.warning} wrap>
                  <Text>{LOGISTICS_WARNING_LABELS[item.warning] || item.warning}: {item.hint}</Text>
                  {item.tabKey && typeof onNavigateTab === "function" ? (
                    <Button size="small" onClick={() => onNavigateTab(item.tabKey)}>
                      {item.buttonLabel}
                    </Button>
                  ) : null}
                </Space>
              ))}
            </Space>
          }
        />
      ) : null}

      <Space wrap>
        <Select
          style={{ minWidth: 360 }}
          loading={loadingScenarios}
          value={selectedScenarioId || undefined}
          onChange={(value) => setSelectedScenarioId(Number(value || 0) || null)}
          placeholder="Выберите сценарий"
          options={scenarios.map((row) => ({
            value: Number(row.id),
            label: `${row.name} · ${row.status}`,
          }))}
        />
        <Button onClick={handleAutoBuild} loading={autoBuilding} disabled={!selectedScenarioId}>
          Автосоздать группы
        </Button>
        <Button onClick={openManualModal} disabled={!selectedScenarioId}>
          Ручная группа
        </Button>
        <Button onClick={() => setHelpOpen(true)}>Справка</Button>
      </Space>

      <Card size="small" title="Группы отгрузки" extra={<span style={{ color: "#666", fontSize: 12 }}>Колонки можно перетаскивать мышью за заголовки.</span>}>
        <DraggableColumnsTable
          columnSizingKey="rfq_logistics_groups_column_widths_v1"
          size="small"
          loading={loadingGroups}
          rowKey="id"
          dataSource={groups}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          columns={orderedGroupColumns}
          onColumnOrderChange={({ orderedVisibleKeys }) => setGroupColumnKeys(orderedVisibleKeys)}
        />
      </Card>

      {groups.length ? (
        <div style={{ color: "#666", fontSize: 13 }}>
          Автогруппировка уже учла: поставщика, страну происхождения, Incoterms и пункт Incoterms. Если видите предупреждения, сначала исправьте данные ответа или мастер-данные, затем пересоберите группы.
        </div>
      ) : null}

      <Card size="small" title={currentGroup ? `Группа: ${currentGroup.name}` : "Редактирование группы"}>
        <Form form={form} layout="vertical">
          <Space wrap align="start">
            <Form.Item name="name" label="Название">
              <Input style={{ width: 260 }} />
            </Form.Item>
            <Form.Item name="route_type" label="Способ доставки">
              <Select style={{ width: 180 }} options={deliveryModeOptions} />
            </Form.Item>
            <Form.Item name="incoterms" label="Incoterms">
              <Input style={{ width: 120 }} placeholder="FOB" />
            </Form.Item>
            <Form.Item name="incoterms_place" label="Пункт Incoterms">
              <Input style={{ width: 220 }} placeholder="Например: Shanghai Port" />
            </Form.Item>
            <Form.Item name="freight_input_mode" label="Режим freight">
              <Select style={{ width: 180 }} options={freightModeOptions} />
            </Form.Item>
            <Form.Item name="freight_total" label="Freight, всего">
              <InputNumber style={{ width: 160 }} min={0} />
            </Form.Item>
            <Form.Item name="freight_currency" label="Валюта">
              <Select style={{ width: 120 }} options={currencyOptions} />
            </Form.Item>
            <Form.Item name="freight_rate_per_kg" label="Ставка за кг">
              <InputNumber style={{ width: 160 }} min={0} />
            </Form.Item>
            <Form.Item name="eta_min_days" label="ETA от">
              <InputNumber style={{ width: 120 }} min={0} />
            </Form.Item>
            <Form.Item name="eta_max_days" label="ETA до">
              <InputNumber style={{ width: 120 }} min={0} />
            </Form.Item>
          </Space>
          <Form.Item name="source_note" label="Комментарий">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" onClick={saveGroupHeader} disabled={!editingGroupId} loading={savingGroup}>
            Сохранить группу
          </Button>
        </Form>
      </Card>

      <Card
        size="small"
        title="Состав группы"
        extra={
          <Space>
            {currentGroup ? <Tag color="blue">Группа #{currentGroup.id}</Tag> : null}
            <span style={{ color: "#666", fontSize: 12 }}>Колонки можно перетаскивать мышью за заголовки.</span>
            <Button type="primary" onClick={saveGroupLines} disabled={!editingGroupId} loading={savingLines}>
              Сохранить состав
            </Button>
          </Space>
        }
      >
        <DraggableColumnsTable
          columnSizingKey="rfq_logistics_pool_column_widths_v1"
          size="small"
          rowKey="id"
          loading={loadingPool}
          rowSelection={editingGroupId ? poolSelection : undefined}
          dataSource={poolRows}
          pagination={{ pageSize: 12, hideOnSinglePage: true }}
          columns={orderedPoolColumns}
          onColumnOrderChange={({ orderedVisibleKeys }) => setPoolColumnKeys(orderedVisibleKeys)}
        />
        {!editingGroupId ? <div style={{ color: "#666" }}>Выберите группу, чтобы вручную собрать её состав.</div> : null}
      </Card>

      <Modal
        open={manualModalOpen}
        onCancel={() => setManualModalOpen(false)}
        onOk={handleCreateManualGroup}
        confirmLoading={creatingGroup}
        title="Ручная группа отгрузки"
        width={760}
      >
        <Form form={manualForm} layout="vertical">
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Когда нужна ручная группа"
            description="Используйте ручную группу, если хотите задать отдельный способ доставки или особую консолидацию. Но сначала лучше поправить origin, вес, Incoterms и срок в Ответах или Покрытии, чтобы автогруппировка была точнее."
          />
          <Space wrap align="start">
            <Form.Item name="name" label="Название" rules={[{ required: true }]}>
              <Input style={{ width: 260 }} />
            </Form.Item>
            <Form.Item name="route_type" label="Способ доставки">
              <Select style={{ width: 180 }} options={deliveryModeOptions} />
            </Form.Item>
            <Form.Item name="incoterms" label="Incoterms">
              <Input style={{ width: 120 }} placeholder="FOB" />
            </Form.Item>
            <Form.Item name="incoterms_place" label="Пункт Incoterms">
              <Input style={{ width: 220 }} placeholder="Например: Shanghai Port" />
            </Form.Item>
            <Form.Item name="freight_input_mode" label="Режим freight">
              <Select style={{ width: 180 }} options={freightModeOptions} />
            </Form.Item>
            <Form.Item name="freight_currency" label="Валюта">
              <Select style={{ width: 120 }} options={currencyOptions} />
            </Form.Item>
          </Space>
          <Space wrap align="start">
            <Form.Item name="from_country" label="Страна отправления">
              <Input style={{ width: 140 }} placeholder="CN" />
            </Form.Item>
            <Form.Item name="from_city" label="Город отправления">
              <Input style={{ width: 180 }} />
            </Form.Item>
            <Form.Item name="to_country" label="Страна назначения">
              <Input style={{ width: 140 }} placeholder="RU" />
            </Form.Item>
            <Form.Item name="to_city" label="Город назначения">
              <Input style={{ width: 180 }} />
            </Form.Item>
          </Space>
          <Space wrap align="start">
            <Form.Item name="freight_total" label="Freight, всего">
              <InputNumber style={{ width: 160 }} min={0} />
            </Form.Item>
            <Form.Item name="freight_rate_per_kg" label="Ставка за кг">
              <InputNumber style={{ width: 160 }} min={0} />
            </Form.Item>
            <Form.Item name="eta_min_days" label="ETA от">
              <InputNumber style={{ width: 120 }} min={0} />
            </Form.Item>
            <Form.Item name="eta_max_days" label="ETA до">
              <InputNumber style={{ width: 120 }} min={0} />
            </Form.Item>
          </Space>
          <Form.Item name="source_note" label="Комментарий">
            <Input.TextArea rows={3} placeholder="Почему группа создаётся вручную" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="Справка по логистике"
        placement="right"
        width={420}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {LOGISTICS_HELP_SECTIONS.map((section) => (
            <div key={section.title}>
              <Text strong>{section.title}</Text>
              <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>{section.body}</Paragraph>
            </div>
          ))}
        </Space>
      </Drawer>
    </Space>
  )
}
