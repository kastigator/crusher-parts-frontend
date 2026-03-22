import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Button, Card, Drawer, Empty, Form, Input, Popconfirm, Select, Space, Table, Tag, Typography, message } from "antd"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"

const { Text } = Typography

const SCENARIO_BASIS_LABELS = {
  CHEAPEST: "Минимальная стоимость",
  FASTEST: "Минимальный срок",
  BALANCED: "Сбалансированный",
  OEM: "OEM приоритет",
  MANUAL: "Ручной",
}

const SCENARIO_CURRENCY_OPTIONS = ["USD", "EUR", "RUB", "CNY"].map((code) => ({
  value: code,
  label: code,
}))

const OPTION_KIND_LABELS = {
  WHOLE: "Целиком",
  BOM: "По составу",
  KIT: "Комплект",
  MIXED: "Комбинированный",
  MANUAL: "Ручной",
}

const SCENARIO_STATUS_LABELS = {
  draft: "Черновик",
  active: "Активный",
  selected: "Выбран",
  archived: "Архив",
  logistics_ready: "Готов к логистике",
  calculated: "Рассчитан",
}

const COVERAGE_WARNING_LABELS = {
  whole_uom_mismatch: "Ед. изм. whole-строки не совпадает с RFQ",
  multiple_whole_lines: "В whole-варианте больше одной whole-строки",
}

const riskLabel = (value) =>
  ({
    low: "низкий риск",
    medium: "средний риск",
    high: "высокий риск",
    critical: "критичный риск",
  }[String(value || "").trim().toLowerCase()] || null)

const riskColor = (value) =>
  ({
    low: "green",
    medium: "gold",
    high: "volcano",
    critical: "red",
  }[String(value || "").trim().toLowerCase()] || "default")

const uniqueNonEmpty = (values) => [...new Set((values || []).filter(Boolean))]
const parseWarnings = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.filter(Boolean) : []
    } catch (_e) {
      return []
    }
  }
  return []
}
const safeNum = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}
const normCurrency = (value) => {
  const s = String(value || "").trim().toUpperCase()
  return s ? s.slice(0, 3) : null
}

const normalizeAutoSavedNote = (note) => {
  const text = String(note || "").trim()
  const match = text.match(/^(Автосохранение покрытия по поставщику|Вариант по поставщику)\s+(.+)$/i)
  if (match?.[2]?.trim()) return match[2].trim()
  return text
}

const SCENARIOS_HELP_SECTIONS = [
  {
    title: "Что делает вкладка",
    body:
      "Сценарий собирает полный план исполнения всего RFQ. На каждую строку заказа выбирается один сохранённый вариант исполнения из вкладки «Покрытие».",
  },
  {
    title: "Чем сценарий отличается от покрытия",
    body:
      "Покрытие хранит библиотеку допустимых способов закрыть отдельную строку. Сценарий выбирает по одному варианту на каждую строку и собирает из них полный рабочий план заказа.",
  },
  {
    title: "Что означает валюта сценария",
    body:
      "Валюта сценария приводит стоимость вариантов исполнения к одной валюте ещё до логистики и экономики. Если курсы доступны, сравнение цены и автоподбор работают уже в выбранной валюте сценария. Когда в сценарии зафиксирован курс, в списке сценариев показывается дата этого курса.",
  },
  {
    title: "Что делают автосценарии",
    body:
      "Режимы «Минимальная стоимость», «Минимальный срок», «Сбалансированный» и «OEM приоритет» автоматически подбирают вариант исполнения на каждую строку RFQ. Если для критерия не хватает цены, срока, OEM или курса валют, система показывает это прямо под строкой.",
  },
  {
    title: "Как читать вариант исполнения",
    body:
      "В строке видно короткий заголовок варианта, а ниже — теги с ценой, сроком, полнотой и OEM. Для составных или смешанных вариантов можно открыть распределение по поставщикам и полный состав компонентов.",
  },
  {
    title: "Как посмотреть уже созданный сценарий",
    body:
      "Внизу в таблице «Сценарии RFQ» нажмите «Показать состав». Откроется состав сценария по строкам RFQ с деталями варианта исполнения, составом по поставщикам и зафиксированной валютой расчёта.",
  },
]

const InlineInfo = ({ title, children, tone = "neutral" }) => {
  const styles = {
    neutral: {
      borderLeft: "3px solid #d1d5db",
      background: "#fafafa",
    },
    warning: {
      borderLeft: "3px solid #f5d48c",
      background: "#fffaf0",
    },
  }
  return (
    <div
      style={{
        borderRadius: 10,
        padding: "10px 12px",
        ...styles[tone],
      }}
    >
      {title ? (
        <Text strong style={{ display: "block", marginBottom: 4 }}>
          {title}
        </Text>
      ) : null}
      <Text type="secondary">{children}</Text>
    </div>
  )
}

const SectionHint = ({ children }) => (
  <Text type="secondary" style={{ display: "block", lineHeight: 1.6 }}>
    {children}
  </Text>
)

const buildCompositionSummary = (option) => {
  const lines = Array.isArray(option?.lines) ? option.lines : []
  const lineLabels = uniqueNonEmpty(
    lines.map((line) => line?.note || line?.original_cat_number || line?.client_part_number || line?.line_code)
  )
  const trimmed = lineLabels.slice(0, 3)
  const suffix = lineLabels.length > 3 ? ` + ещё ${lineLabels.length - 3}` : ""
  const kind = String(option?.option_kind || "").toUpperCase()

  if (kind === "WHOLE") return "Целиком"
  if (kind === "BOM") {
    if (!lineLabels.length) return "По составу"
    return `По составу: ${lineLabels.length} поз. (${trimmed.join(", ")}${suffix})`
  }
  if (kind === "KIT") {
    if (!lineLabels.length) return "Комплект"
    return `Комплект: ${lineLabels.length} ролей (${trimmed.join(", ")}${suffix})`
  }
  if (kind === "MIXED") {
    const supplierNames = uniqueNonEmpty(lines.map((line) => line?.supplier_name))
    const partsInfo = lineLabels.length ? `${lineLabels.length} поз.` : `${lines.length || 0} линий`
    const supplierInfo = supplierNames.length ? `${supplierNames.length} пост.` : null
    return `Комбинированный: ${[partsInfo, supplierInfo].filter(Boolean).join(", ")}`
  }
  return OPTION_KIND_LABELS[kind] || "Вариант"
}

const buildCompositionGroups = (option) => {
  const lines = Array.isArray(option?.lines) ? option.lines : []
  const kind = String(option?.option_kind || "").toUpperCase()

  if (kind === "WHOLE") {
    return [{ supplier: "Вариант", items: ["Целиком"] }]
  }

  if (kind === "MIXED") {
    const grouped = new Map()
    lines.forEach((line) => {
      const supplier = line?.supplier_name || "Поставщик не указан"
      const label = line?.note || line?.original_cat_number || line?.client_part_number || line?.line_code || "Позиция"
      const list = grouped.get(supplier) || {
        supplier,
        items: [],
        reliability_rating:
          line?.reliability_rating === undefined || line?.reliability_rating === null
            ? null
            : Number(line.reliability_rating),
        risk_level: line?.risk_level || null,
      }
      if (!list.items.includes(label)) list.items.push(label)
      grouped.set(supplier, list)
    })
    return Array.from(grouped.values())
  }

  const itemLabels = uniqueNonEmpty(
    lines.map((line) => line?.note || line?.original_cat_number || line?.client_part_number || line?.line_code)
  )
  if (!itemLabels.length) {
    return [{ supplier: "Состав", items: [OPTION_KIND_LABELS[kind] || "Вариант"] }]
  }

  const supplierNames = uniqueNonEmpty(lines.map((line) => line?.supplier_name))
  return [
    {
      supplier: supplierNames.join(" + ") || "Состав",
      items: itemLabels,
      reliability_rating: null,
      risk_level: null,
    },
  ]
}

const buildSupplierAllocationSummary = (groups = []) =>
  groups
    .filter((group) => Array.isArray(group?.items) && group.items.length)
    .map((group) => ({
      supplier: group.supplier || "Поставщик",
      count: group.items.length,
    }))

const buildSupplierAllocationText = (allocation = []) =>
  allocation.map((entry) => `${entry.supplier}: ${entry.count} комп.`).join(" · ")

const buildSupplierQualityBadges = (lines = []) => {
  const supplierMap = new Map()
  ;(lines || []).forEach((line) => {
    const supplierName = String(line?.supplier_name || "").trim()
    if (!supplierName) return
    if (!supplierMap.has(supplierName)) {
      supplierMap.set(supplierName, {
        supplier: supplierName,
        reliability_rating:
          line?.reliability_rating === undefined || line?.reliability_rating === null
            ? null
            : Number(line.reliability_rating),
        risk_level: line?.risk_level || null,
      })
    }
  })
  return Array.from(supplierMap.values())
}

const convertPreviewAmount = (amount, fromCurrency, targetCurrency, fxRates = {}) => {
  const value = safeNum(amount)
  const from = normCurrency(fromCurrency)
  const target = normCurrency(targetCurrency)
  if (value === null) return { value: null, currency: target || from || "", noRate: false }
  if (!from || !target || from === target) return { value, currency: target || from || "", noRate: false }
  const rate = safeNum(fxRates?.[from])
  if (!rate) {
    return { value, currency: from, noRate: true, sourceCurrency: from }
  }
  return {
    value: value / rate,
    currency: target,
    noRate: false,
    sourceCurrency: from,
  }
}

const deriveOptionSignals = (option, basis = "MANUAL", ctx = {}) => {
  const completenessPct = safeNum(option?.completeness_pct) ?? 0
  const pricedPct = safeNum(option?.priced_pct) ?? 0
  const converted = convertPreviewAmount(option?.goods_total, option?.goods_currency, ctx.targetCurrency, ctx.fxRates)
  const goodsTotal = safeNum(converted.value)
  const leadMax = safeNum(option?.lead_time_max_days)
  const isOemOk = Number(option?.is_oem_ok || 0) === 1
  const missingData = []
  const warnings = []

  if (completenessPct < 100) warnings.push(`покрытие ${Math.round(completenessPct)}%`)
  if (pricedPct < 100 || goodsTotal === null) missingData.push("полной цены")
  if (leadMax === null) missingData.push("срока")
  if (converted.noRate) missingData.push(`курса ${converted.sourceCurrency}→${ctx.targetCurrency}`)
  if (basis === "OEM" && !isOemOk) warnings.push("OEM не подтверждён")

  return {
    completenessPct,
    pricedPct,
    goodsTotal,
    leadMax,
    isOemOk,
    missingData: uniqueNonEmpty(missingData),
    warnings: uniqueNonEmpty(warnings),
  }
}

const autoRankOption = (option, basis = "MANUAL", ctx = {}) => {
  const signals = deriveOptionSignals(option, basis, ctx)
  const completenessPct = signals.completenessPct
  const pricedPct = signals.pricedPct
  const goodsTotal = signals.goodsTotal
  const leadMax = signals.leadMax
  const supplierCount = safeNum(option?.supplier_count) ?? 99
  const isOemOk = signals.isOemOk ? 1 : 0

  if (basis === "CHEAPEST") {
    return [
      completenessPct >= 100 ? 0 : 1,
      pricedPct >= 100 && goodsTotal !== null ? 0 : 1,
      goodsTotal ?? Number.MAX_SAFE_INTEGER,
      leadMax ?? Number.MAX_SAFE_INTEGER,
      supplierCount,
      -isOemOk,
      Number(option?.id || 0),
    ]
  }

  if (basis === "FASTEST") {
    return [
      completenessPct >= 100 ? 0 : 1,
      leadMax !== null ? 0 : 1,
      leadMax ?? Number.MAX_SAFE_INTEGER,
      pricedPct >= 100 && goodsTotal !== null ? 0 : 1,
      goodsTotal ?? Number.MAX_SAFE_INTEGER,
      supplierCount,
      -isOemOk,
      Number(option?.id || 0),
    ]
  }

  if (basis === "OEM") {
    return [
      completenessPct >= 100 ? 0 : 1,
      isOemOk ? 0 : 1,
      pricedPct >= 100 && goodsTotal !== null ? 0 : 1,
      goodsTotal ?? Number.MAX_SAFE_INTEGER,
      leadMax ?? Number.MAX_SAFE_INTEGER,
      supplierCount,
      Number(option?.id || 0),
    ]
  }

  if (basis === "BALANCED") {
    return [
      completenessPct >= 100 ? 0 : 1,
      pricedPct >= 100 && goodsTotal !== null ? 0 : 1,
      leadMax !== null ? 0 : 1,
      goodsTotal ?? Number.MAX_SAFE_INTEGER,
      leadMax ?? Number.MAX_SAFE_INTEGER,
      supplierCount,
      -isOemOk,
      Number(option?.id || 0),
    ]
  }

  return [Number(option?.id || 0)]
}

const compareRanks = (left, right) => {
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    const a = left[index] ?? 0
    const b = right[index] ?? 0
    if (a < b) return -1
    if (a > b) return 1
  }
  return 0
}

const buildAutoSelectionForItem = (options = [], basis = "MANUAL", ctx = {}) => {
  const sorted = [...options].sort((a, b) => compareRanks(autoRankOption(a, basis, ctx), autoRankOption(b, basis, ctx)))
  const selected = sorted[0] || null
  if (!selected) return { selectedOptionId: null, message: null, severity: "neutral" }

  const signals = deriveOptionSignals(selected, basis, ctx)
  const parts = []
  if (signals.missingData.length) parts.push(`Не хватает для режима: ${signals.missingData.join(", ")}`)
  if (signals.warnings.length) parts.push(`Ограничения: ${signals.warnings.join(", ")}`)

  return {
    selectedOptionId: Number(selected.id || 0) || null,
    message: parts.join(". ") || null,
    severity: signals.missingData.length || signals.warnings.length ? "warning" : "neutral",
  }
}

const buildCoverageOptionShortLabel = (option) => {
  const supplierNames = uniqueNonEmpty((option?.lines || []).map((line) => line?.supplier_name))
  const kindLabel = OPTION_KIND_LABELS[String(option?.option_kind || "").toUpperCase()] || "Вариант"

  let sourceLabel = ""
  if (String(option?.option_kind || "").toUpperCase() === "MIXED") {
    sourceLabel = supplierNames.length ? `Комбинированный вариант: ${supplierNames.join(" + ")}` : "Комбинированный вариант"
  } else if (supplierNames.length === 1) {
    sourceLabel = supplierNames[0]
  } else if (supplierNames.length > 1) {
    sourceLabel = supplierNames.join(" + ")
  } else if (option?.note) {
    sourceLabel = normalizeAutoSavedNote(option.note)
  } else {
    sourceLabel = kindLabel
  }
  return [sourceLabel, kindLabel].filter(Boolean).join(" · ")
}

const buildCoverageOptionDetail = (option, ctx = {}) => {
  const composition = buildCompositionSummary(option)
  const compositionGroups = buildCompositionGroups(option)
  const supplierAllocation = buildSupplierAllocationSummary(compositionGroups)
  const converted = convertPreviewAmount(option?.goods_total, option?.goods_currency, ctx.targetCurrency, ctx.fxRates)
  const completeness = `${Number(option?.completeness_pct || 0)}%`
  const goodsLabel = formatPriceWithCurrency(converted.value, converted.currency || option?.goods_currency || "USD")
  const leadMax = safeNum(option?.lead_time_max_days)
  const leadLabel = leadMax !== null ? `${leadMax} дн` : "нет срока"
  const oemLabel = Number(option?.is_oem_ok || 0) === 1 ? "OEM подтверждён" : "OEM не подтверждён"
  const supplierNames = uniqueNonEmpty((option?.lines || []).map((line) => line?.supplier_name))
  const supplierLabel = supplierNames.length
    ? `Поставщики: ${supplierNames.join(" + ")}`
    : `Поставщики: ${safeNum(option?.supplier_count) || 0}`
  const supplierAllocationText = buildSupplierAllocationText(supplierAllocation)
  const supplierQuality = buildSupplierQualityBadges(option?.lines || [])

  return {
    composition,
    compositionGroups,
    supplierAllocation,
    supplierAllocationText,
    supplierQuality,
    completeness,
    goodsLabel,
    leadLabel,
    oemLabel,
    supplierLabel,
    convertedNoRate: converted.noRate,
    warnings: parseWarnings(option?.warning_json),
  }
}

const buildScenarioLineOptionDetail = (line, scenarioMeta = {}) => {
  const pseudoOption = {
    option_kind: line?.option_kind,
    completeness_pct: line?.completeness_pct,
    priced_pct: line?.priced_pct ?? 100,
    goods_total: line?.goods_total,
    goods_currency: line?.goods_currency || scenarioMeta?.calc_currency || "USD",
    is_oem_ok: line?.is_oem_ok,
    lead_time_max_days:
      Array.isArray(line?.option_lines) && line.option_lines.length
        ? Math.max(...line.option_lines.map((row) => safeNum(row?.lead_time_days)).filter((value) => value !== null))
        : null,
    lines: Array.isArray(line?.option_lines)
      ? line.option_lines.map((row) => ({
          supplier_name: row?.supplier_name,
          reliability_rating: row?.reliability_rating,
          risk_level: row?.risk_level,
          note: row?.note || row?.line_code || row?.original_cat_number || row?.client_part_number,
          original_cat_number: row?.original_cat_number,
          client_part_number: row?.client_part_number,
          line_code: row?.line_code,
        }))
      : [],
  }
  return buildCoverageOptionDetail(pseudoOption, { targetCurrency: scenarioMeta?.calc_currency || "USD", fxRates: {} })
}

const renderCompositionGroups = (detail, expanded, onToggle) => {
  if (!detail?.compositionGroups?.length) return null
  return (
    <>
      <Button size="small" type="link" style={{ paddingInline: 0 }} onClick={onToggle}>
        {expanded ? "Скрыть состав" : `Состав по поставщикам (${detail.compositionGroups.length})`}
      </Button>
      {expanded ? (
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 10,
            background: "#fafafa",
          }}
        >
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            {detail.compositionGroups.map((group) => (
              <div
                key={`${group.supplier}-${group.items.join("|")}`}
                style={{
                  padding: 10,
                  border: "1px solid #edf2f7",
                  borderRadius: 8,
                  background: "#fff",
                }}
              >
                <Space wrap size={[6, 6]} style={{ justifyContent: "space-between", width: "100%" }}>
                  <Text strong>{group.supplier}</Text>
                  <Space size={[4, 4]} wrap>
                    <Tag color="default">{group.items.length} комп.</Tag>
                    {group.reliability_rating !== null && group.reliability_rating !== undefined ? (
                      <Tag color="blue">Надежность: {group.reliability_rating}</Tag>
                    ) : null}
                    {riskLabel(group.risk_level) ? (
                      <Tag color={riskColor(group.risk_level)}>{riskLabel(group.risk_level)}</Tag>
                    ) : null}
                  </Space>
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {group.items.length <= 3
                    ? `Компоненты: ${group.items.join(", ")}`
                    : `Компоненты: ${group.items.slice(0, 3).join(", ")} и ещё ${group.items.length - 3}`}
                </Text>
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {group.items.map((item) => (
                    <Tag key={`${group.supplier}-${item}`}>{item}</Tag>
                  ))}
                </div>
              </div>
            ))}
          </Space>
        </div>
      ) : null}
    </>
  )
}

const countScenarioLines = (scenario) => safeNum(scenario?.lines_count) || safeNum(scenario?.selected_lines_count) || null

export default function ScenariosTabContent({ rfqId }) {
  const [coverageOptions, setCoverageOptions] = useState([])
  const [scenarios, setScenarios] = useState([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [loadingScenarios, setLoadingScenarios] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingComposition, setSavingComposition] = useState(false)
  const [deletingScenarioId, setDeletingScenarioId] = useState(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [selectedByItem, setSelectedByItem] = useState({})
  const [expandedCompositionByItem, setExpandedCompositionByItem] = useState({})
  const [expandedSavedLines, setExpandedSavedLines] = useState({})
  const [editingScenarioId, setEditingScenarioId] = useState(null)
  const [scenarioDetailsById, setScenarioDetailsById] = useState({})
  const [loadingScenarioDetails, setLoadingScenarioDetails] = useState({})
  const [expandedScenarioRowKeys, setExpandedScenarioRowKeys] = useState([])
  const [previewFxRates, setPreviewFxRates] = useState({})
  const [previewFxProblem, setPreviewFxProblem] = useState(null)
  const [form] = Form.useForm()
  const selectedBasis = Form.useWatch("basis", form) || "MANUAL"
  const selectedCalcCurrency = normCurrency(Form.useWatch("calc_currency", form) || "USD") || "USD"

  const loadCoverageOptions = async () => {
    if (!rfqId) return
    setLoadingOptions(true)
    try {
      const { data } = await axios.get(`/economics/rfq/${rfqId}/coverage-options`)
      const rows = Array.isArray(data?.rows) ? data.rows : []
      setCoverageOptions(rows)
      setSelectedByItem((prev) => {
        const next = { ...prev }
        rows.forEach((row) => {
          const itemId = Number(row?.rfq_item_id || 0)
          if (itemId && !next[itemId]) next[itemId] = Number(row.id)
        })
        return next
      })
    } catch (e) {
      setCoverageOptions([])
      message.error(e?.response?.data?.message || "Не удалось загрузить варианты покрытия")
    } finally {
      setLoadingOptions(false)
    }
  }

  const loadScenarios = async () => {
    if (!rfqId) return
    setLoadingScenarios(true)
    try {
      const { data } = await axios.get(`/economics/rfq/${rfqId}/scenarios`)
      setScenarios(Array.isArray(data?.rows) ? data.rows : [])
    } catch (e) {
      setScenarios([])
      message.error(e?.response?.data?.message || "Не удалось загрузить сценарии")
    } finally {
      setLoadingScenarios(false)
    }
  }

  useEffect(() => {
    loadCoverageOptions()
    loadScenarios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId])

  const availableCoverageCurrencies = useMemo(
    () => uniqueNonEmpty(coverageOptions.map((row) => normCurrency(row?.goods_currency))).filter(Boolean),
    [coverageOptions]
  )

  useEffect(() => {
    const loadFxPreview = async () => {
      if (!selectedCalcCurrency) {
        setPreviewFxRates({})
        setPreviewFxProblem(null)
        return
      }
      const symbols = availableCoverageCurrencies.filter((code) => code !== selectedCalcCurrency)
      if (!symbols.length) {
        setPreviewFxRates({})
        setPreviewFxProblem(null)
        return
      }
      try {
        const { data } = await axios.get("/fx/rates", {
          params: { base: selectedCalcCurrency, symbols: symbols.join(",") },
        })
        const rates = {}
        Object.entries(data?.rates || {}).forEach(([code, payload]) => {
          if (payload && Number.isFinite(payload.rate)) rates[code] = Number(payload.rate)
        })
        const missing = symbols.filter((code) => rates[code] === undefined)
        setPreviewFxRates(rates)
        setPreviewFxProblem(
          missing.length
            ? `Не удалось получить курсы: ${missing.join(", ")}. Для этих валют сравнение пока идёт без конвертации.`
            : null
        )
      } catch (error) {
        console.error(error)
        setPreviewFxRates({})
        setPreviewFxProblem("Не удалось загрузить курсы валют. Сравнение пока идёт в исходных валютах.")
      }
    }

    loadFxPreview()
  }, [availableCoverageCurrencies, selectedCalcCurrency])

  const optionsByItem = useMemo(() => {
    const grouped = new Map()
    coverageOptions.forEach((row) => {
      const itemId = Number(row?.rfq_item_id || 0)
      if (!itemId) return
      const list = grouped.get(itemId) || []
      list.push(row)
      grouped.set(itemId, list)
    })
    return Array.from(grouped.entries()).map(([rfqItemId, rows]) => ({
      rfq_item_id: rfqItemId,
      line_number: rows[0]?.line_number,
      item_label:
        rows[0]?.original_cat_number || rows[0]?.client_part_number || `Строка ${rows[0]?.line_number || rfqItemId}`,
      item_description: rows[0]?.client_description || "",
      rows,
    }))
  }, [coverageOptions])

  const autoSelectionState = useMemo(() => {
    if (selectedBasis === "MANUAL") return {}
    const ctx = { targetCurrency: selectedCalcCurrency, fxRates: previewFxRates }
    const next = {}
    optionsByItem.forEach((item) => {
      next[item.rfq_item_id] = buildAutoSelectionForItem(item.rows, selectedBasis, ctx)
    })
    return next
  }, [optionsByItem, previewFxRates, selectedBasis, selectedCalcCurrency])

  useEffect(() => {
    if (selectedBasis === "MANUAL") return
    setSelectedByItem((prev) => {
      const next = { ...prev }
      optionsByItem.forEach((item) => {
        const suggestion = autoSelectionState[item.rfq_item_id]
        if (suggestion?.selectedOptionId) next[item.rfq_item_id] = suggestion.selectedOptionId
      })
      return next
    })
  }, [autoSelectionState, optionsByItem, selectedBasis])

  const selectedOptionMap = useMemo(() => {
    const map = new Map()
    coverageOptions.forEach((option) => map.set(Number(option?.id || 0), option))
    return map
  }, [coverageOptions])

  const currentScenario = useMemo(
    () => scenarios.find((row) => Number(row?.id || 0) === Number(editingScenarioId || 0)) || null,
    [editingScenarioId, scenarios]
  )

  const scenarioRows = useMemo(
    () =>
      scenarios.map((row) => ({
        ...row,
        status_label: SCENARIO_STATUS_LABELS[String(row?.status || "").toLowerCase()] || row?.status || "—",
        basis_label: SCENARIO_BASIS_LABELS[String(row?.basis || "").toUpperCase()] || row?.basis || "—",
        lines_label: countScenarioLines(row),
      })),
    [scenarios]
  )

  const loadScenarioDetail = useCallback(
    async (scenarioId) => {
      const id = Number(scenarioId || 0)
      if (!id || !rfqId) return null
      if (scenarioDetailsById[id]) return scenarioDetailsById[id]
      setLoadingScenarioDetails((prev) => ({ ...prev, [id]: true }))
      try {
        const { data } = await axios.get(`/economics/rfq/${rfqId}/scenarios/${id}`)
        setScenarioDetailsById((prev) => ({ ...prev, [id]: data }))
        return data
      } catch (e) {
        message.error(e?.response?.data?.message || "Не удалось загрузить детали сценария")
        return null
      } finally {
        setLoadingScenarioDetails((prev) => ({ ...prev, [id]: false }))
      }
    },
    [rfqId, scenarioDetailsById]
  )

  const handleCreateScenario = async (values) => {
    const items = optionsByItem
      .map((item) => ({
        rfq_item_id: item.rfq_item_id,
        coverage_option_id: Number(selectedByItem[item.rfq_item_id] || 0) || null,
      }))
      .filter((item) => item.coverage_option_id)

    if (!items.length) {
      message.warning("Нужно выбрать хотя бы один вариант покрытия")
      return
    }

    setSaving(true)
    try {
      const { data } = await axios.post(`/economics/rfq/${rfqId}/scenarios`, {
        name: values.name,
        basis: values.basis,
        calc_currency: values.calc_currency,
        items,
      })
      message.success(data?.message || "Сценарий создан")
      form.resetFields()
      setExpandedCompositionByItem({})
      await loadScenarios()
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось создать сценарий")
    } finally {
      setSaving(false)
    }
  }

  const handleLoadScenarioIntoEditor = async (scenarioId) => {
    const id = Number(scenarioId || 0) || null
    if (!id || !rfqId) return
    const data = await loadScenarioDetail(id)
    if (!data) return
    const lines = Array.isArray(data?.lines) ? data.lines : []
    const scenario = data?.scenario || data?.row || scenarios.find((row) => Number(row?.id || 0) === id) || null
    const next = {}
    lines.forEach((line) => {
      const itemId = Number(line?.rfq_item_id || 0)
      const optionId = Number(line?.coverage_option_id || 0)
      if (itemId && optionId) next[itemId] = optionId
    })
    setSelectedByItem((prev) => ({ ...prev, ...next }))
    setEditingScenarioId(id)
    form.setFieldsValue({
      basis: String(scenario?.basis || "MANUAL").toUpperCase(),
      calc_currency: normCurrency(scenario?.calc_currency) || "USD",
    })
  }

  const handleUpdateScenarioComposition = async () => {
    const scenarioId = Number(editingScenarioId || 0)
    if (!scenarioId || !rfqId) return
    const items = optionsByItem
      .map((item) => ({
        rfq_item_id: item.rfq_item_id,
        coverage_option_id: Number(selectedByItem[item.rfq_item_id] || 0) || null,
      }))
      .filter((item) => item.coverage_option_id)

    if (!items.length) {
      message.warning("Нужно выбрать хотя бы один вариант покрытия")
      return
    }

    setSavingComposition(true)
    try {
      const { data } = await axios.put(`/economics/rfq/${rfqId}/scenarios/${scenarioId}/lines`, {
        items,
        calc_currency: selectedCalcCurrency,
      })
      message.success(data?.message || "Состав сценария обновлён")
      setScenarioDetailsById((prev) => {
        const next = { ...prev }
        delete next[scenarioId]
        return next
      })
      await Promise.all([loadScenarios(), loadScenarioDetail(scenarioId)])
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось обновить состав сценария")
    } finally {
      setSavingComposition(false)
    }
  }

  const handleDeleteScenario = async (scenarioId) => {
    const id = Number(scenarioId || 0)
    if (!id || !rfqId) return
    setDeletingScenarioId(id)
    try {
      const { data } = await axios.delete(`/economics/rfq/${rfqId}/scenarios/${id}`)
      message.success(data?.message || "Сценарий удалён")
      if (Number(editingScenarioId || 0) === id) setEditingScenarioId(null)
      setScenarioDetailsById((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setExpandedScenarioRowKeys((prev) => prev.filter((key) => Number(key) !== id))
      await loadScenarios()
    } catch (e) {
      message.error(e?.response?.data?.message || "Не удалось удалить сценарий")
    } finally {
      setDeletingScenarioId(null)
    }
  }

  const toggleCompositionExpanded = (key) => {
    setExpandedCompositionByItem((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleSavedLineExpanded = (key) => {
    setExpandedSavedLines((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleScenarioExpand = async (expanded, record) => {
    const id = Number(record?.id || 0)
    if (!id) return
    setExpandedScenarioRowKeys((prev) =>
      expanded ? [...new Set([...prev, id])] : prev.filter((key) => Number(key) !== id)
    )
    if (expanded) await loadScenarioDetail(id)
  }

  const renderScenarioExpanded = (record) => {
    const id = Number(record?.id || 0)
    const details = scenarioDetailsById[id]
    const loading = !!loadingScenarioDetails[id]
    const scenarioMeta = details?.scenario || details?.row || record
    const lines = Array.isArray(details?.lines) ? details.lines : []

    if (loading) return <Text type="secondary">Загружаем состав сценария…</Text>
    if (!lines.length) return <Text type="secondary">Состав сценария пока не загружен.</Text>

    return (
      <Space direction="vertical" size={10} style={{ width: "100%" }}>
        <Space size={[6, 6]} wrap>
          <Tag>Валюта: {scenarioMeta?.calc_currency || "USD"}</Tag>
          {scenarioMeta?.fx_as_of ? <Tag>Курс зафиксирован: {String(scenarioMeta.fx_as_of).slice(0, 10)}</Tag> : null}
          <Tag color="green">Итог: {formatPriceWithCurrency(scenarioMeta?.landed_total, scenarioMeta?.calc_currency || "USD")}</Tag>
        </Space>
        {lines.map((line) => {
          const detail = buildScenarioLineOptionDetail(line, scenarioMeta)
          const expandKey = `${id}:${line.id || line.rfq_item_id}`
          const expanded = Boolean(expandedSavedLines[expandKey])
          return (
            <div
              key={expandKey}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 12,
                background: "#fafafa",
              }}
            >
              <Space direction="vertical" size={6} style={{ width: "100%" }}>
                <div>
                  <Text strong>
                    {line.line_number} · {line.original_cat_number || line.client_part_number || "Строка"}
                  </Text>
                  {line.client_description ? (
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {line.client_description}
                      </Text>
                    </div>
                  ) : null}
                </div>
                <Space size={[4, 4]} wrap>
                  <Tag>{OPTION_KIND_LABELS[String(line.option_kind || "").toUpperCase()] || "Вариант"}</Tag>
                  <Tag color="green">Цена: {detail.goodsLabel}</Tag>
                  <Tag color="purple">Срок: {detail.leadLabel}</Tag>
                  <Tag color="blue">Полнота: {detail.completeness}</Tag>
                  <Tag color={Number(line?.is_oem_ok || 0) === 1 ? "success" : "default"}>{detail.oemLabel}</Tag>
                  {detail.warnings.map((warning) => (
                    <Tag key={warning} color="orange">
                      {COVERAGE_WARNING_LABELS[warning] || warning}
                    </Tag>
                  ))}
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {detail.supplierLabel}
                </Text>
                {detail.supplierQuality?.length ? (
                  <Space size={[4, 4]} wrap>
                    {detail.supplierQuality.map((entry) => (
                      <React.Fragment key={entry.supplier}>
                        {entry.reliability_rating !== null && entry.reliability_rating !== undefined ? (
                          <Tag color="blue">{entry.supplier}: надежность {entry.reliability_rating}</Tag>
                        ) : null}
                        {riskLabel(entry.risk_level) ? (
                          <Tag color={riskColor(entry.risk_level)}>{entry.supplier}: {riskLabel(entry.risk_level)}</Tag>
                        ) : null}
                      </React.Fragment>
                    ))}
                  </Space>
                ) : null}
                {detail.supplierAllocationText ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Распределение: {detail.supplierAllocationText}
                  </Text>
                ) : null}
                {renderCompositionGroups(detail, expanded, () => toggleSavedLineExpanded(expandKey))}
              </Space>
            </div>
          )
        })}
      </Space>
    )
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Space wrap style={{ width: "100%", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ maxWidth: 980 }}>
          <Text strong style={{ display: "block", fontSize: 18, marginBottom: 6 }}>
            Сценарий = план исполнения всего RFQ
          </Text>
          <SectionHint>
            Здесь на каждую строку RFQ выбирается один сохранённый вариант исполнения. Потом этот набор строк идёт в
            логистику, экономику и финальный выбор.
          </SectionHint>
        </div>
        <Button onClick={() => setHelpOpen(true)}>Справка</Button>
      </Space>

      <Card size="small" title="Новый сценарий">
        {!optionsByItem.length ? (
          <Empty description="Сначала сохраните покрытие во вкладке «Покрытие»" />
        ) : (
          <Form
            form={form}
            layout="vertical"
            initialValues={{ basis: "MANUAL", calc_currency: "USD" }}
            onFinish={handleCreateScenario}
          >
            <Space wrap align="start" style={{ width: "100%" }}>
              <Form.Item name="name" label="Название" rules={[{ required: true }]}>
                <Input style={{ width: 310 }} placeholder="Например, Сценарий 1: минимальная стоимость" />
              </Form.Item>
              <Form.Item name="basis" label="Режим сборки">
                <Select
                  style={{ width: 220 }}
                  options={Object.entries(SCENARIO_BASIS_LABELS).map(([value, label]) => ({ value, label }))}
                />
              </Form.Item>
              <Form.Item name="calc_currency" label="Валюта">
                <Select style={{ width: 120 }} options={SCENARIO_CURRENCY_OPTIONS} />
              </Form.Item>
            </Space>

            <div style={{ marginBottom: 12 }}>
              <Text strong>
                {selectedBasis === "MANUAL"
                  ? "Ручная сборка сценария"
                  : `Автоподбор: ${SCENARIO_BASIS_LABELS[selectedBasis] || "Автосценарий"}`}
              </Text>
              <SectionHint>
                {selectedBasis === "MANUAL"
                  ? "Вы вручную выбираете вариант исполнения для каждой строки RFQ."
                  : "Система автоматически подбирает вариант на каждую строку RFQ по выбранному критерию. При необходимости любой выбор можно скорректировать вручную перед созданием сценария."}
              </SectionHint>
              {previewFxProblem ? (
                <div style={{ marginTop: 8 }}>
                  <InlineInfo tone="warning">{previewFxProblem}</InlineInfo>
                </div>
              ) : null}
            </div>

            <Table
              size="small"
              rowKey="rfq_item_id"
              loading={loadingOptions}
              pagination={false}
              style={{ marginTop: 12 }}
              dataSource={optionsByItem}
              columns={[
                {
                  title: "Строка RFQ",
                  width: 280,
                  render: (_, row) => (
                    <Space direction="vertical" size={0}>
                      <span>
                        {row.line_number} · {row.item_label}
                      </span>
                      {row.item_description ? (
                        <span style={{ color: "#666", fontSize: 12 }}>{row.item_description}</span>
                      ) : null}
                    </Space>
                  ),
                },
                {
                  title: "Вариант исполнения",
                  render: (_, row) => {
                    const selectedOption = selectedOptionMap.get(Number(selectedByItem[row.rfq_item_id] || 0)) || null
                    const detail = selectedOption
                      ? buildCoverageOptionDetail(selectedOption, {
                          targetCurrency: selectedCalcCurrency,
                          fxRates: previewFxRates,
                        })
                      : null
                    const isCompositionExpanded = Boolean(expandedCompositionByItem[row.rfq_item_id])
                    const selectOptions = row.rows.map((opt) => ({
                      value: Number(opt.id),
                      label: buildCoverageOptionShortLabel(opt),
                      option: opt,
                    }))

                    return (
                      <Space direction="vertical" size={4} style={{ width: "100%" }}>
                        <Select
                          style={{ minWidth: 560 }}
                          value={selectedByItem[row.rfq_item_id]}
                          onChange={(value) =>
                            setSelectedByItem((prev) => ({ ...prev, [row.rfq_item_id]: Number(value || 0) || null }))
                          }
                          options={selectOptions}
                          optionRender={(optionData) => {
                            const opt = optionData?.data?.option
                            const optDetail = opt
                              ? buildCoverageOptionDetail(opt, {
                                  targetCurrency: selectedCalcCurrency,
                                  fxRates: previewFxRates,
                                })
                              : null
                            return (
                              <Space direction="vertical" size={2} style={{ width: "100%" }}>
                                <Text strong>{optionData?.data?.label}</Text>
                                {optDetail ? (
                                  <Space size={[4, 4]} wrap>
                                    <Tag>{optDetail.composition}</Tag>
                                    <Tag color="green">{optDetail.goodsLabel}</Tag>
                                    <Tag color="purple">{optDetail.leadLabel}</Tag>
                                    <Tag color="blue">Полнота: {optDetail.completeness}</Tag>
                                    {optDetail.convertedNoRate ? <Tag color="warning">Без конвертации</Tag> : null}
                                    {optDetail.warnings.map((warning) => (
                                      <Tag key={warning} color="orange">
                                        {COVERAGE_WARNING_LABELS[warning] || warning}
                                      </Tag>
                                    ))}
                                  </Space>
                                ) : null}
                                {optDetail?.supplierAllocationText ? (
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    {optDetail.supplierAllocationText}
                                  </Text>
                                ) : null}
                                {optDetail?.supplierQuality?.length ? (
                                  <Space size={[4, 4]} wrap>
                                    {optDetail.supplierQuality.map((entry) => (
                                      <React.Fragment key={`${optionData?.data?.value}-${entry.supplier}`}>
                                        {entry.reliability_rating !== null && entry.reliability_rating !== undefined ? (
                                          <Tag color="blue">{entry.supplier}: надежность {entry.reliability_rating}</Tag>
                                        ) : null}
                                        {riskLabel(entry.risk_level) ? (
                                          <Tag color={riskColor(entry.risk_level)}>{entry.supplier}: {riskLabel(entry.risk_level)}</Tag>
                                        ) : null}
                                      </React.Fragment>
                                    ))}
                                  </Space>
                                ) : null}
                              </Space>
                            )
                          }}
                        />

                        {detail ? (
                          <Space size={[4, 4]} wrap>
                            <Tag>{OPTION_KIND_LABELS[String(selectedOption?.option_kind || "").toUpperCase()] || "Вариант"}</Tag>
                            <Tag color="green">Цена: {detail.goodsLabel}</Tag>
                            <Tag color="purple">Срок: {detail.leadLabel}</Tag>
                            <Tag color="blue">Полнота: {detail.completeness}</Tag>
                            <Tag color={Number(selectedOption?.is_oem_ok || 0) === 1 ? "success" : "default"}>
                              {detail.oemLabel}
                            </Tag>
                            {detail.convertedNoRate ? <Tag color="warning">Без конвертации</Tag> : null}
                            {detail.warnings.map((warning) => (
                              <Tag key={warning} color="orange">
                                {COVERAGE_WARNING_LABELS[warning] || warning}
                              </Tag>
                            ))}
                            {renderCompositionGroups(detail, isCompositionExpanded, () =>
                              toggleCompositionExpanded(row.rfq_item_id)
                            )}
                          </Space>
                        ) : null}

                        {detail ? (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {detail.supplierLabel}
                          </Text>
                        ) : null}
                        {detail?.supplierQuality?.length ? (
                          <Space size={[4, 4]} wrap>
                            {detail.supplierQuality.map((entry) => (
                              <React.Fragment key={`selected-${row.rfq_item_id}-${entry.supplier}`}>
                                {entry.reliability_rating !== null && entry.reliability_rating !== undefined ? (
                                  <Tag color="blue">{entry.supplier}: надежность {entry.reliability_rating}</Tag>
                                ) : null}
                                {riskLabel(entry.risk_level) ? (
                                  <Tag color={riskColor(entry.risk_level)}>{entry.supplier}: {riskLabel(entry.risk_level)}</Tag>
                                ) : null}
                              </React.Fragment>
                            ))}
                          </Space>
                        ) : null}
                        {detail?.supplierAllocationText ? (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Распределение: {detail.supplierAllocationText}
                          </Text>
                        ) : null}
                        {detail?.supplierAllocation?.length > 1 ? (
                          <Space size={[4, 4]} wrap>
                            {detail.supplierAllocation.map((entry) => (
                              <Tag key={`${entry.supplier}-${entry.count}`}>{entry.supplier}: {entry.count} комп.</Tag>
                            ))}
                          </Space>
                        ) : null}
                        {selectedBasis !== "MANUAL" && autoSelectionState[row.rfq_item_id]?.message ? (
                          <Text
                            type={autoSelectionState[row.rfq_item_id]?.severity === "warning" ? "warning" : "secondary"}
                            style={{ fontSize: 12 }}
                          >
                            {autoSelectionState[row.rfq_item_id]?.message}
                          </Text>
                        ) : null}
                      </Space>
                    )
                  },
                },
              ]}
            />

            <Button type="primary" htmlType="submit" loading={saving} style={{ marginTop: 12 }}>
              Создать сценарий
            </Button>
          </Form>
        )}
      </Card>

      <Card
        size="small"
        title="Сценарии RFQ"
        extra={
          <Space>
            <Select
              allowClear
              size="small"
              style={{ width: 300 }}
              value={editingScenarioId || undefined}
              placeholder="Загрузить сценарий в редактор"
              onChange={(value) => handleLoadScenarioIntoEditor(value)}
              options={scenarios.map((row) => ({
                value: Number(row.id),
                label: `${row.name} · ${SCENARIO_BASIS_LABELS[String(row.basis || "").toUpperCase()] || row.basis || "Ручной"} · ${SCENARIO_STATUS_LABELS[String(row.status || "").toLowerCase()] || row.status || "—"}`,
              }))}
            />
            <Popconfirm
              title="Удалить сценарий?"
              description="Сценарий будет удалён вместе с его составом и группами отгрузки."
              okText="Удалить"
              cancelText="Отмена"
              onConfirm={() => handleDeleteScenario(editingScenarioId)}
              disabled={!editingScenarioId}
            >
              <Button
                size="small"
                danger
                disabled={!editingScenarioId}
                loading={deletingScenarioId === Number(editingScenarioId || 0)}
              >
                Удалить сценарий
              </Button>
            </Popconfirm>
            <Button size="small" onClick={loadScenarios} loading={loadingScenarios}>
              Обновить
            </Button>
          </Space>
        }
      >
        <Table
          size="small"
          rowKey="id"
          loading={loadingScenarios}
          dataSource={scenarioRows}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          expandable={{
            expandedRowKeys: expandedScenarioRowKeys,
            onExpand: handleScenarioExpand,
            expandedRowRender: renderScenarioExpanded,
          }}
          columns={[
            { title: "Название", dataIndex: "name" },
            {
              title: "Режим",
              dataIndex: "basis_label",
              width: 180,
            },
            {
              title: "Статус",
              dataIndex: "status_label",
              width: 160,
              render: (value) => <Tag>{value}</Tag>,
            },
            {
              title: "Валюта",
              width: 100,
              render: (_, row) => row?.calc_currency || "USD",
            },
            {
              title: "Курс",
              width: 180,
              render: (_, row) =>
                row?.fx_as_of ? (
                  <Tag color="green">{String(row.fx_as_of).slice(0, 10)}</Tag>
                ) : (
                  <Text type="secondary">не зафиксирован</Text>
                ),
            },
            {
              title: "Строк",
              width: 90,
              render: (_, row) => row?.lines_label ?? "—",
            },
            {
              title: "Итог",
              width: 180,
              render: (_, row) => formatPriceWithCurrency(row?.landed_total, row?.calc_currency || "USD"),
            },
            {
              title: "Действия",
              width: 220,
              render: (_, row) => {
                const isExpanded = expandedScenarioRowKeys.includes(Number(row?.id || 0))
                return (
                  <Space>
                    <Button size="small" onClick={() => handleLoadScenarioIntoEditor(row?.id)}>
                      Открыть
                    </Button>
                    <Button size="small" onClick={() => handleScenarioExpand(!isExpanded, row)}>
                      {isExpanded ? "Скрыть состав" : "Показать состав"}
                    </Button>
                    <Popconfirm
                      title="Удалить сценарий?"
                      description="Сценарий будет удалён вместе с его составом и группами отгрузки."
                      okText="Удалить"
                      cancelText="Отмена"
                      onConfirm={() => handleDeleteScenario(row?.id)}
                    >
                      <Button size="small" danger loading={deletingScenarioId === Number(row?.id || 0)}>
                        Удалить
                      </Button>
                    </Popconfirm>
                  </Space>
                )
              },
            },
          ]}
        />
        {currentScenario ? (
          <Space style={{ marginTop: 12 }}>
            <Tag color="blue">Редактируется: {currentScenario.name}</Tag>
            <Button onClick={handleUpdateScenarioComposition} loading={savingComposition}>
              Сохранить состав сценария
            </Button>
          </Space>
        ) : null}
      </Card>

      <Drawer open={helpOpen} onClose={() => setHelpOpen(false)} width={520} title="Справка по вкладке «Сценарии»">
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {SCENARIOS_HELP_SECTIONS.map((section) => (
            <Card key={section.title} size="small" title={section.title}>
              <Text>{section.body}</Text>
            </Card>
          ))}
          <Card size="small" title="Формализованный пример">
            <Space direction="vertical" size={8}>
              <Text>
                Для <Text strong>строки 1</Text> может существовать несколько вариантов исполнения:{" "}
                <Text strong>Поставщик A — узел целиком</Text>, <Text strong>Поставщик B — по составу</Text> или{" "}
                <Text strong>смешанный вариант из нескольких поставщиков</Text>.
              </Text>
              <Text>
                Для <Text strong>строки 2</Text> выбирается ещё один подходящий вариант исполнения. После создания
                сценария именно этот набор вариантов становится рабочим планом исполнения заказа.
              </Text>
            </Space>
          </Card>
        </Space>
      </Drawer>
    </Space>
  )
}
