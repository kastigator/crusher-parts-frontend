import React, { useEffect, useMemo, useState } from "react"
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  Popover,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd"
import dayjs from "dayjs"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"
import IncotermsSelect from "@/components/inputs/IncotermsSelect"
import {
  SUPPLIER_DEFAULT_CURRENCY_OPTIONS,
  SUPPLIER_DEFAULT_PAYMENT_TERMS_OPTIONS,
} from "@/constants/supplierDefaults"

const { Text } = Typography

const OFFER_TYPE_OPTIONS = [
  { value: "ANALOG", label: "Аналог" },
  { value: "OEM", label: "OEM (оригинал)" },
  { value: "UNKNOWN", label: "Не указан" },
]
const OFFER_TYPE_LABELS = {
  ANALOG: "Аналог",
  OEM: "OEM (оригинал)",
  UNKNOWN: "Не указан",
}

const SUPPLIER_REPLY_STATUS_OPTIONS = [
  { value: "QUOTED", label: "Цена предоставлена" },
  { value: "NO_STOCK", label: "Нет в наличии" },
  { value: "DISCONTINUED", label: "Снят с производства" },
  { value: "NEEDS_CLARIFICATION", label: "Требует уточнения" },
  { value: "NO_RESPONSE", label: "Без ответа" },
]

const SUPPLIER_REPLY_STATUS_META = {
  QUOTED: { label: "Цена предоставлена", color: "green", requiresPrice: true },
  NO_STOCK: { label: "Нет в наличии", color: "orange", requiresPrice: false },
  DISCONTINUED: { label: "Снят с производства", color: "red", requiresPrice: false },
  NEEDS_CLARIFICATION: { label: "Требует уточнения", color: "gold", requiresPrice: false },
  NO_RESPONSE: { label: "Без ответа", color: "default", requiresPrice: false },
}

const normalizeSupplierReplyStatus = (value) => {
  const normalized = String(value || "").trim().toUpperCase()
  return SUPPLIER_REPLY_STATUS_META[normalized] ? normalized : "QUOTED"
}

const supplierReplyStatusRequiresPrice = (value) =>
  SUPPLIER_REPLY_STATUS_META[normalizeSupplierReplyStatus(value)]?.requiresPrice === true

const renderSupplierReplyStatusTag = (value) => {
  const key = normalizeSupplierReplyStatus(value)
  const meta = SUPPLIER_REPLY_STATUS_META[key]
  return <Tag color={meta?.color || "default"}>{meta?.label || "—"}</Tag>
}

const formatOfferTypeLabel = (value) => {
  const normalized = String(value || "").trim().toUpperCase()
  return OFFER_TYPE_LABELS[normalized] || "—"
}

const acceptedSourceSuffix = (row) => {
  const explicitSource = String(row.line_source_type || "").toUpperCase()
  if (explicitSource === "PRICE_LIST") return " (Прайс-лист)"
  if (explicitSource === "RFQ") return " (RFQ)"

  const note = String(row.note || "").toLowerCase()
  if (!note) return ""
  if (note.includes("прайс") || note.includes("price list")) return " (Прайс-лист)"
  if (note.includes("rfq")) return " (RFQ)"
  return ""
}

const formatSourceLabel = (row) => {
  if (Number(row.accepted_from_existing_price) === 1) {
    return `Принятая цена${acceptedSourceSuffix(row)}`
  }
  const source = String(row.entry_source || "").toUpperCase()
  if (source === "SUPPLIER_FILE") return "Файл поставщика"
  if (source === "SUPPLIER_MANUAL") return "Вручную"
  if (source === "NEGOTIATION") return "Переговоры"
  if (source === "SYSTEM_IMPORT") return "Системный импорт"
  if (source === "ACCEPTED_EXISTING") return `Принятая цена${acceptedSourceSuffix(row)}`
  return "Ответ поставщика"
}

const sourceTagColor = (row) => {
  if (Number(row.accepted_from_existing_price) === 1) return "green"
  const source = String(row.entry_source || "").toUpperCase()
  if (source === "NEGOTIATION") return "gold"
  if (source === "SUPPLIER_MANUAL") return "blue"
  return "geekblue"
}

const getRequestedOriginalCat = (row) => {
  if (Number(row?.accepted_from_existing_price) === 1) {
    return row?.component_cat_number || row?.response_original_cat_number || row?.original_cat_number || row?.requested_original_cat_number || "—"
  }
  return row?.component_cat_number || row?.requested_original_cat_number || row?.response_original_cat_number || row?.original_cat_number || "—"
}

const getOriginalCatNumber = (row) =>
  String(
    row?.requested_original_cat_number ||
      row?.response_original_cat_number ||
      row?.original_cat_number ||
      row?.component_cat_number ||
      ""
  ).trim()

const getSelectionKey = (row) =>
  String(row?.selected_selection_key || row?.selection_key || "").trim()

const splitSelectionMeta = (value, keepEmpty = false) => {
  const raw = String(value || "")
  if (!raw) return []
  const parts = raw.split("\n").map((part) => String(part).trim())
  return keepEmpty ? parts : parts.filter(Boolean)
}

const inferLineTypeFromSelectionKey = (selectionKey) => {
  const key = String(selectionKey || "").trim().toLowerCase()
  if (!key) return null
  if (key.startsWith("kit:")) return "KIT_ROLE"
  if (key.startsWith("bom:")) return "BOM_COMPONENT"
  if (key.startsWith("demand:")) return "DEMAND"
  if (key.startsWith("alt:")) return "BOM_COMPONENT"
  return null
}

const parseSelectionKeyMeta = (selectionKey) => {
  const raw = String(selectionKey || "").trim()
  if (!raw) return null
  const parts = raw.split(":")
  const head = String(parts[0] || "").toLowerCase()
  const toSafeNumber = (value) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  if (head === "alt") {
    return {
      raw,
      kind: "ALT",
      lineType: "BOM_COMPONENT",
      rfqItemId: toSafeNumber(parts[1]),
      basePartId: toSafeNumber(parts[2]),
      altPartId: toSafeNumber(parts[3]),
    }
  }
  if (head === "bom") {
    return {
      raw,
      kind: "BOM_COMPONENT",
      lineType: "BOM_COMPONENT",
      rfqItemId: toSafeNumber(parts[1]),
      basePartId: toSafeNumber(parts[2]),
    }
  }
  if (head === "kit") {
    return {
      raw,
      kind: "KIT_ROLE",
      lineType: "KIT_ROLE",
      rfqItemId: toSafeNumber(parts[1]),
      bundleId: toSafeNumber(parts[2]),
      roleId: toSafeNumber(parts[3]),
    }
  }
  if (head === "demand") {
    return {
      raw,
      kind: "DEMAND",
      lineType: "DEMAND",
      rfqItemId: toSafeNumber(parts[1]),
    }
  }
  return null
}

const getSelectionLineType = (row) => {
  const explicit = String(
    row?.selected_line_type || row?.line_type || row?.selection_line_type || ""
  )
    .trim()
    .toUpperCase()
  if (explicit) return explicit
  return inferLineTypeFromSelectionKey(getSelectionKey(row))
}

const getSelectionLineLabel = (row) =>
  String(
    row?.selected_line_label ||
      row?.line_label ||
      row?.selected_line_description ||
      row?.line_description ||
      ""
  ).trim()

const toFiniteNumber = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

const getRequestedQty = (row) => {
  const candidates = [
    row?.selected_qty,
    row?.required_qty,
    row?.requested_qty,
    row?.qty,
    row?.client_requested_qty,
  ]
  for (const value of candidates) {
    const parsed = toFiniteNumber(value)
    if (parsed != null && parsed > 0) return parsed
  }
  return null
}

const getOfferedQty = (row) => {
  const candidates = [row?.latest_offered_qty, row?.offered_qty]
  for (const value of candidates) {
    const parsed = toFiniteNumber(value)
    if (parsed != null && parsed > 0) return parsed
  }
  return null
}

const getResponseLineTotal = (row) => {
  if (!row?.latest_response_line_id) return null
  const price = toFiniteNumber(row?.latest_price)
  const qty = getOfferedQty(row) ?? getRequestedQty(row)
  if (price == null || qty == null) return null
  return price * qty
}

const formatQtyWithUom = (qty, uom) => {
  if (qty == null) return "—"
  const qtyText = Number.isInteger(qty) ? String(qty) : String(qty)
  const normalizedUom = String(uom || "").trim()
  return normalizedUom ? `${qtyText} ${normalizedUom}` : qtyText
}

const formatRequestedQtyValue = (row) => {
  const qty = getRequestedQty(row)
  return formatQtyWithUom(qty, row?.uom)
}

const formatOfferedQtyValue = (row) => {
  const qty = getOfferedQty(row)
  if (qty == null) return "—"
  return formatQtyWithUom(qty, row?.uom)
}

const getRowSelectionEntries = (row) => {
  const keys = splitSelectionMeta(row?.selected_selection_keys)
  const types = splitSelectionMeta(row?.selected_selection_types, true)
  const labels = splitSelectionMeta(row?.selected_selection_labels, true)
  const descriptions = splitSelectionMeta(row?.selected_selection_descriptions, true)
  const originalCats = splitSelectionMeta(row?.selected_selection_original_cats, true)
  const altCats = splitSelectionMeta(row?.selected_selection_alt_cats, true)

  if (keys.length) {
    const seen = new Set()
    return keys
      .map((selectionKey, index) => {
        const parsed = parseSelectionKeyMeta(selectionKey)
        const explicitType = String(types[index] || "").trim().toUpperCase()
        const lineType = explicitType || parsed?.lineType || ""
        const lineLabel = String(labels[index] || "").trim()
        const lineDescription = String(descriptions[index] || "").trim()
        const originalCat = String(originalCats[index] || "").trim()
        const altCat = String(altCats[index] || "").trim()
        return {
          selectionKey,
          lineType,
          lineLabel,
          lineDescription,
          originalCat,
          altCat,
          parsed,
          isAlt:
            parsed?.kind === "ALT" ||
            (Number.isFinite(parsed?.altPartId) && Number(parsed?.altPartId) > 0),
        }
      })
      .filter((entry) => {
        const key = entry.selectionKey
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })
  }

  const selectionKey = getSelectionKey(row)
  const parsed = parseSelectionKeyMeta(selectionKey)
  const lineType = getSelectionLineType(row)
  const lineLabel = getSelectionLineLabel(row)
  const lineDescription = String(row?.selected_line_description || "").trim()
  const originalCat = String(row?.selected_selection_original_cats || "").trim()
  const altCat = String(row?.selected_selection_alt_cats || "").trim()
  if (!selectionKey && !lineType && !lineLabel) return []
  return [
    {
      selectionKey,
      lineType: lineType || parsed?.lineType || "",
      lineLabel,
      lineDescription,
      originalCat,
      altCat,
      parsed,
      isAlt:
        parsed?.kind === "ALT" ||
        (Number.isFinite(parsed?.altPartId) && Number(parsed?.altPartId) > 0),
    },
  ]
}

const getSelectionDisplayText = (row, selectionEntry = null) => {
  const lineType = String(selectionEntry?.lineType || getSelectionLineType(row) || "").toUpperCase()
  const explicitLineLabel = String(selectionEntry?.lineLabel || "").trim()
  const componentBaseCat =
    String(selectionEntry?.originalCat || row?.component_cat_number || "").trim()
  if (selectionEntry?.isAlt) {
    const altCat =
      String(
        selectionEntry?.altCat || explicitLineLabel || row?.response_original_cat_number || ""
      ).trim() || "без номера"
    return componentBaseCat
      ? `Подмена: ${altCat} (вместо ${componentBaseCat})`
      : `Подмена: ${altCat}`
  }
  if (lineType === "KIT_ROLE") {
    const roleLabel =
      explicitLineLabel ||
      getSelectionLineLabel(row) ||
      row?.component_description_ru ||
      row?.component_description_en ||
      row?.response_original_description_ru ||
      row?.response_original_description_en ||
      ""
    if (roleLabel && componentBaseCat) return `Роль: ${roleLabel} (из ${componentBaseCat})`
    if (roleLabel) return `Роль: ${roleLabel}`
    return "Роль комплекта"
  }
  if (lineType === "BOM_COMPONENT") {
    const partLabel = componentBaseCat || getSelectionLineLabel(row) || ""
    if (partLabel) return `Компонент: ${partLabel}`
    return "Компонент BOM"
  }
  if (lineType === "DEMAND") {
    const partLabel = getOriginalCatNumber(row) || "Без номера"
    return `Позиция: ${partLabel}`
  }
  const catNumber = getOriginalCatNumber(row)
  return catNumber || "—"
}

const getSelectionDisplaySummary = (row) => {
  const preferred = getPreferredSelectionEntry(row)
  return getSelectionDisplayText(row, preferred)
}

const selectionEntryRank = (entry) => {
  if (entry?.isAlt) return 0
  const type = String(entry?.lineType || "").toUpperCase()
  if (type === "KIT_ROLE") return 1
  if (type === "DEMAND") return 2
  if (type === "BOM_COMPONENT") return 3
  return 9
}

const getPreferredSelectionEntry = (row) => {
  const entries = getRowSelectionEntries(row)
  if (!entries.length) return null
  return [...entries].sort((a, b) => selectionEntryRank(a) - selectionEntryRank(b))[0]
}

const getRowContextTypeLabel = (row, selectionEntry = null) => {
  const entry = selectionEntry || getPreferredSelectionEntry(row)
  if (entry?.isAlt) return "Подмена"
  const type = String(entry?.lineType || "").toUpperCase()
  if (type === "KIT_ROLE") return "Роль"
  if (type === "DEMAND") return "Позиция"
  if (type === "BOM_COMPONENT") return "Компонент"
  return "Строка"
}

const getRowDescriptionText = (row, selectionEntry = null) => {
  const entry = selectionEntry || getPreferredSelectionEntry(row)
  if (entry?.isAlt) {
    return (
      entry.lineDescription ||
      row?.response_original_description_ru ||
      row?.response_original_description_en ||
      row?.component_description_ru ||
      row?.component_description_en ||
      row?.requested_original_description_ru ||
      row?.requested_original_description_en ||
      row?.client_description ||
      "—"
    )
  }
  const type = String(entry?.lineType || "").toUpperCase()
  if (type === "KIT_ROLE") {
    return entry?.lineLabel || entry?.lineDescription || "Роль комплекта"
  }
  if (type === "BOM_COMPONENT") {
    return (
      row?.component_description_ru ||
      row?.component_description_en ||
      entry?.lineDescription ||
      entry?.lineLabel ||
      row?.requested_original_description_ru ||
      row?.requested_original_description_en ||
      row?.client_description ||
      "—"
    )
  }
  return (
    row?.requested_original_description_ru ||
    row?.requested_original_description_en ||
    row?.client_description ||
    row?.response_original_description_ru ||
    row?.response_original_description_en ||
    "—"
  )
}

const getOriginalFilterKey = (row) => {
  return getOriginalFilterKeyByEntry(row, null)
}

const getOriginalFilterKeyByEntry = (row, selectionEntry) => {
  const lineType = String(selectionEntry?.lineType || getSelectionLineType(row) || "").toUpperCase()
  const selectionKey = String(selectionEntry?.selectionKey || getSelectionKey(row) || "").trim()
  const explicitLineLabel = String(selectionEntry?.lineLabel || "").trim()
  const parsed = selectionEntry?.parsed || parseSelectionKeyMeta(selectionKey)
  const rfqItemId = Number(row?.rfq_item_id)
  const safeItemId = Number.isFinite(rfqItemId) && rfqItemId > 0 ? rfqItemId : 0

  if (selectionEntry?.isAlt || parsed?.kind === "ALT") {
    const basePartId = Number(parsed?.basePartId || 0)
    const altPartId = Number(parsed?.altPartId || 0)
    if (basePartId > 0 || altPartId > 0) {
      return `alt:${safeItemId}:${basePartId}:${altPartId}`
    }
    if (selectionKey) return `alt:${safeItemId}:${selectionKey}`
  }

  if (lineType === "KIT_ROLE") {
    if (selectionKey) return `kit:${safeItemId}:${selectionKey}`
    const bundleItemId = Number(row?.selected_bundle_item_id || row?.bundle_item_id)
    if (Number.isFinite(bundleItemId) && bundleItemId > 0) {
      return `kit-item:${safeItemId}:${bundleItemId}`
    }
    const roleLabel = explicitLineLabel || getSelectionLineLabel(row)
    if (roleLabel) return `kit-label:${safeItemId}:${roleLabel}`
  }

  if (lineType === "DEMAND") {
    return `demand:${safeItemId}`
  }

  if (lineType === "BOM_COMPONENT") {
    const parsedBasePartId = Number(parsed?.basePartId || 0)
    if (parsedBasePartId > 0) return `component:${safeItemId}:${parsedBasePartId}`
    const componentPartId = Number(
      row?.component_original_part_id || row?.selected_original_part_id
    )
    if (Number.isFinite(componentPartId) && componentPartId > 0) {
      return `component:${safeItemId}:${componentPartId}`
    }
    const componentCatNumber = String(row?.component_cat_number || "").trim()
    if (componentCatNumber) return `component-cat:${safeItemId}:${componentCatNumber}`
  }

  const catNumber = getOriginalCatNumber(row)
  if (catNumber) return `cat:${catNumber}`

  if (Number.isFinite(rfqItemId) && rfqItemId > 0) return `item:${rfqItemId}`

  const lineNumber = Number(row?.rfq_line_number)
  if (Number.isFinite(lineNumber) && lineNumber > 0) return `line:${lineNumber}`

  return null
}

const getOriginalFilterLabel = (row) => getOriginalFilterLabelByEntry(row, null)

const getOriginalFilterLabelByEntry = (row, selectionEntry) => {
  const lineNumber = row?.rfq_line_number || row?.line_number || "—"
  const lineType = String(selectionEntry?.lineType || getSelectionLineType(row) || "").toUpperCase()
  const explicitLineLabel = String(selectionEntry?.lineLabel || "").trim()
  const parsed = selectionEntry?.parsed || parseSelectionKeyMeta(selectionEntry?.selectionKey)
  const originalCat =
    String(
      selectionEntry?.originalCat ||
        row?.component_cat_number ||
        row?.requested_original_cat_number ||
        ""
    ).trim() || "Без номера"
  const altCat =
    String(
      selectionEntry?.altCat ||
        explicitLineLabel ||
        row?.response_original_cat_number ||
        row?.original_cat_number ||
        ""
    ).trim() || "Без номера"
  if (selectionEntry?.isAlt || parsed?.kind === "ALT") {
    return `${lineNumber} · подмена: ${altCat} → ${originalCat}`
  }
  if (lineType === "KIT_ROLE") {
    const roleLabel = explicitLineLabel || getSelectionLineLabel(row)
    const fromText = selectionEntry?.originalCat
      ? ` · из детали: ${selectionEntry.originalCat}`
      : ""
    return roleLabel
      ? `${lineNumber} · роль: ${roleLabel}${fromText}`
      : `${lineNumber} · роль комплекта`
  }
  if (lineType === "DEMAND") {
    const catNumber = getOriginalCatNumber(row) || "Без номера"
    const description =
      row?.requested_original_description_ru ||
      row?.requested_original_description_en ||
      row?.client_description ||
      ""
    return description
      ? `${lineNumber} · позиция: ${catNumber} · ${description}`
      : `${lineNumber} · позиция: ${catNumber}`
  }
  if (lineType === "BOM_COMPONENT") {
    const componentCat = originalCat || getSelectionLineLabel(row) || "Без номера"
    const componentDescription =
      row?.component_description_ru || row?.component_description_en || ""
    return componentDescription
      ? `${lineNumber} · компонент: ${componentCat} · ${componentDescription}`
      : `${lineNumber} · компонент: ${componentCat}`
  }
  const catNumber = getOriginalCatNumber(row) || "Без номера"
  const description =
    row?.requested_original_description_ru ||
    row?.requested_original_description_en ||
    row?.client_description ||
    row?.response_original_description_ru ||
    row?.response_original_description_en ||
    ""
  return description
    ? `${lineNumber} · ${catNumber} · ${description}`
    : `${lineNumber} · ${catNumber}`
}

const getRowOriginalFilterDescriptors = (row) => {
  const selectionEntries = getRowSelectionEntries(row)
  const descriptors =
    selectionEntries.length > 0
      ? selectionEntries
          .map((entry) => ({
            key: getOriginalFilterKeyByEntry(row, entry),
            label: getOriginalFilterLabelByEntry(row, entry),
          }))
          .filter((entry) => entry.key)
      : [
          {
            key: getOriginalFilterKey(row),
            label: getOriginalFilterLabel(row),
          },
        ]
  const seen = new Set()
  return descriptors.filter((entry) => {
    const key = String(entry.key || "")
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const rowMatchesOriginalFilter = (row, filterKey) => {
  if (!filterKey) return true
  return getRowOriginalFilterDescriptors(row).some((entry) => entry.key === filterKey)
}

const formatRfqItemLabel = (item) => {
  const line = item?.line_number || "—"
  const cat = item?.original_cat_number || "—"
  const description =
    item?.client_description || item?.original_description_ru || item?.original_description_en || ""
  return description ? `${line} · ${cat} · ${description}` : `${line} · ${cat}`
}

const filterColumnsByKeys = (columns, visibleKeys, requiredKeys = []) => {
  const visibleSet = new Set(Array.isArray(visibleKeys) ? visibleKeys : [])
  const requiredSet = new Set(requiredKeys)
  return columns.filter((column) => requiredSet.has(column.key) || visibleSet.has(column.key))
}

export default function ResponsesTabContent({
  activeRfqId,
  suppliers,
  items,
  responseSuppliers,
  responseSupplierFilter,
  setResponseSupplierFilter,
  reloadResponses,
  showArchivedResponses,
  setShowArchivedResponses,
  importModal,
  setImportModal,
  workspaceRows = [],
  responseLines = [],
  formatDate,
}) {
  const [viewMode, setViewMode] = useState("supplier")
  const [onlyWaiting, setOnlyWaiting] = useState(false)
  const [visibleSupplierColumnKeys, setVisibleSupplierColumnKeys] = useState([
    "position",
    "supplier",
    "description",
    "sent",
    "status",
    "offer_status",
    "price",
    "requested",
    "offered",
    "total",
    "lead_time",
    "actions",
  ])
  const [visibleOriginalColumnKeys, setVisibleOriginalColumnKeys] = useState([
    "position",
    "supplier",
    "status",
    "sent",
    "offer_status",
    "price",
    "requested",
    "offered",
    "total",
    "lead_time",
    "actions",
  ])
  const [responseOriginalFilter, setResponseOriginalFilter] = useState(null)
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [manualSaving, setManualSaving] = useState(false)
  const [negotiationModal, setNegotiationModal] = useState({
    open: false,
    row: null,
    saving: false,
  })
  const [manualForm] = Form.useForm()
  const [negotiationForm] = Form.useForm()
  const [createSupplierPart, setCreateSupplierPart] = useState(false)
  const [supplierPartSearch, setSupplierPartSearch] = useState("")
  const [supplierPartLoading, setSupplierPartLoading] = useState(false)
  const [supplierPartOptions, setSupplierPartOptions] = useState([])
  const [manualSelectionLoading, setManualSelectionLoading] = useState(false)
  const [manualSelectionOptions, setManualSelectionOptions] = useState([])
  const [manualSupplierLock, setManualSupplierLock] = useState(null)
  const [manualLineLock, setManualLineLock] = useState(null)
  const manualSupplierId = Form.useWatch("supplier_id", manualForm)
  const manualRfqItemId = Form.useWatch("rfq_item_id", manualForm)
  const manualReplyStatus = Form.useWatch("supplier_reply_status", manualForm)
  const negotiationReplyStatus = Form.useWatch("supplier_reply_status", negotiationForm)
  const manualSelectionLocked = Boolean(String(manualLineLock?.selectionKey || "").trim())

  const itemByRfqItemId = useMemo(() => {
    const map = new Map()
    ;(Array.isArray(items) ? items : []).forEach((it) => {
      const rfqItemId = Number(it.id || it.rfq_item_id)
      if (Number.isFinite(rfqItemId) && rfqItemId > 0) {
        map.set(rfqItemId, it)
      }
    })
    return map
  }, [items])

  const getRfqLineDisplay = (row) => {
    const directLine = Number(row?.rfq_line_number || row?.line_number)
    if (Number.isFinite(directLine) && directLine > 0) return String(directLine)
    const rfqItemId = Number(row?.rfq_item_id)
    if (Number.isFinite(rfqItemId) && rfqItemId > 0) {
      const item = itemByRfqItemId.get(rfqItemId)
      const itemLine = Number(item?.line_number)
      if (Number.isFinite(itemLine) && itemLine > 0) return String(itemLine)
    }
    return "—"
  }

  const lineOptions = useMemo(
    () =>
      (Array.isArray(items) ? items : []).map((it) => ({
        value: Number(it.id || it.rfq_item_id),
        label: formatRfqItemLabel(it),
      })),
    [items]
  )

  const supplierOptions = useMemo(
    () =>
      (Array.isArray(suppliers) ? suppliers : []).map((s) => ({
        value: Number(s.supplier_id),
        label: s.supplier_name || "Поставщик без названия",
      })),
    [suppliers]
  )
  const rfqSupplierIdBySupplierId = useMemo(() => {
    const map = new Map()
    ;(Array.isArray(suppliers) ? suppliers : []).forEach((row) => {
      const supplierId = Number(row?.supplier_id)
      const rfqSupplierId = Number(row?.id)
      if (Number.isFinite(supplierId) && supplierId > 0 && Number.isFinite(rfqSupplierId) && rfqSupplierId > 0) {
        map.set(supplierId, rfqSupplierId)
      }
    })
    return map
  }, [suppliers])

  const numericSupplierFilter = useMemo(() => {
    if (responseSupplierFilter == null || responseSupplierFilter === "") return null
    const parsed = Number(responseSupplierFilter)
    return Number.isFinite(parsed) ? parsed : null
  }, [responseSupplierFilter])

  const originalFilterOptions = useMemo(() => {
    const seen = new Set()
    const options = []
    const addOption = (row) => {
      const descriptors = getRowOriginalFilterDescriptors(row)
      descriptors.forEach((descriptor) => {
        const key = String(descriptor?.key || "")
        if (!key || seen.has(key)) return
        seen.add(key)
        options.push({
          value: key,
          label: descriptor.label,
        })
      })
    }
    ;(Array.isArray(workspaceRows) ? workspaceRows : []).forEach(addOption)
    ;(Array.isArray(responseLines) ? responseLines : []).forEach(addOption)
    return options.sort((a, b) => String(a.label || "").localeCompare(String(b.label || "")))
  }, [workspaceRows, responseLines])

  const modeFilteredWorkspaceRows = useMemo(() => {
    const rows = Array.isArray(workspaceRows) ? workspaceRows : []
    return rows.filter((row) => {
      if (viewMode === "supplier") {
        if (numericSupplierFilter == null) return true
        return Number(row.supplier_id) === numericSupplierFilter
      }
      return rowMatchesOriginalFilter(row, responseOriginalFilter)
    })
  }, [workspaceRows, viewMode, numericSupplierFilter, responseOriginalFilter])

  const modeFilteredResponseLines = useMemo(() => {
    const rows = Array.isArray(responseLines) ? responseLines : []
    return rows.filter((row) => {
      if (viewMode === "supplier") {
        if (numericSupplierFilter == null) return true
        return Number(row.supplier_id) === numericSupplierFilter
      }
      return rowMatchesOriginalFilter(row, responseOriginalFilter)
    })
  }, [responseLines, viewMode, numericSupplierFilter, responseOriginalFilter])

  const responseTimeline = useMemo(() => {
    const byKey = new Map()
    modeFilteredResponseLines.forEach((r) => {
      const scopeKey = getOriginalFilterKey(r) || getSelectionKey(r) || String(getRequestedOriginalCat(r))
      const key = [
        Number(r.supplier_id) || 0,
        Number(r.rfq_line_number) || Number(r.rfq_item_id) || 0,
        scopeKey,
      ].join(":")
      if (!byKey.has(key)) byKey.set(key, [])
      byKey.get(key).push(r)
    })
    byKey.forEach((list) =>
      list.sort(
        (a, b) =>
          (b.response_rev_number || 0) - (a.response_rev_number || 0) ||
          dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf()
      )
    )
    return byKey
  }, [modeFilteredResponseLines])

  const byOriginalRows = useMemo(
    () =>
      [...modeFilteredWorkspaceRows]
        .filter((row) =>
          onlyWaiting
            ? String(row.workspace_status || "").toUpperCase() === "WAITING_RESPONSE"
            : true
        )
        .sort((a, b) => {
        const aOrig = String(
          a.requested_original_cat_number || a.response_original_cat_number || "-"
        )
        const bOrig = String(
          b.requested_original_cat_number || b.response_original_cat_number || "-"
        )
        if (aOrig !== bOrig) return aOrig.localeCompare(bOrig)
        const aPrice = Number(a.latest_price)
        const bPrice = Number(b.latest_price)
        if (Number.isFinite(aPrice) && Number.isFinite(bPrice) && aPrice !== bPrice) {
          return aPrice - bPrice
        }
        return String(a.supplier_name || "").localeCompare(String(b.supplier_name || ""))
        }),
    [modeFilteredWorkspaceRows, onlyWaiting]
  )

  const visibleWorkspaceRows = useMemo(
    () =>
      modeFilteredWorkspaceRows.filter((row) =>
        onlyWaiting
          ? String(row.workspace_status || "").toUpperCase() === "WAITING_RESPONSE"
          : true
      ),
    [modeFilteredWorkspaceRows, onlyWaiting]
  )

  const counters = useMemo(() => {
    const rows = modeFilteredWorkspaceRows
    let waiting = 0
    let responded = 0
    let notSent = 0
    rows.forEach((row) => {
      const status = String(row.workspace_status || "").toUpperCase()
      if (status === "WAITING_RESPONSE") waiting += 1
      else if (status === "RESPONDED") responded += 1
      else if (status === "NOT_SENT") notSent += 1
    })
    return { waiting, responded, notSent, total: rows.length }
  }, [modeFilteredWorkspaceRows])

  const openManualModal = (preset = null) => {
    const presetSupplierId = Number(preset?.supplier_id || 0)
    const presetRfqItemId = Number(preset?.rfq_item_id || 0)
    const lockedItem = presetRfqItemId > 0 ? itemByRfqItemId.get(presetRfqItemId) : null
    const lockedSupplier =
      presetSupplierId > 0
        ? supplierOptions.find((opt) => Number(opt.value) === presetSupplierId) ||
          (preset?.supplier_name
            ? { value: presetSupplierId, label: String(preset.supplier_name) }
            : null)
        : null
    const fallbackLine = Number(preset?.rfq_line_number || preset?.line_number || 0)
    const fallbackCat = String(
      preset?.requested_original_cat_number ||
        preset?.response_original_cat_number ||
        preset?.original_cat_number ||
        ""
    ).trim()
    const fallbackDescription = String(
      preset?.requested_original_description_ru ||
        preset?.requested_original_description_en ||
        preset?.client_description ||
        preset?.response_original_description_ru ||
        preset?.response_original_description_en ||
        ""
    ).trim()
    const fallbackLabelParts = []
    if (fallbackLine > 0) fallbackLabelParts.push(String(fallbackLine))
    if (fallbackCat) fallbackLabelParts.push(fallbackCat)
    if (fallbackDescription) fallbackLabelParts.push(fallbackDescription)
    const fallbackLabel = fallbackLabelParts.join(" · ")
    const presetSelectionKey = String(
      preset?.selected_selection_key || preset?.selection_key || ""
    ).trim()
    const defaultOfferedQty = (() => {
      const fromPreset = toFiniteNumber(preset?.latest_offered_qty ?? preset?.offered_qty)
      if (fromPreset != null && fromPreset > 0) return fromPreset
      const fromLocked = toFiniteNumber(
        lockedItem?.requested_qty ??
          lockedItem?.selected_qty ??
          preset?.requested_qty ??
          preset?.selected_qty
      )
      if (fromLocked != null && fromLocked > 0) return fromLocked
      return undefined
    })()
    setManualSupplierLock(lockedSupplier)
    setManualLineLock(
      presetRfqItemId > 0
        ? {
            rfqItemId: presetRfqItemId,
            selectionKey: presetSelectionKey || null,
            label:
              lockedItem && Number(lockedItem?.line_number)
                ? formatRfqItemLabel(lockedItem)
                : fallbackLabel || "Выбранная строка",
          }
        : null
    )
    manualForm.resetFields()
    setCreateSupplierPart(false)
    setSupplierPartSearch("")
    setSupplierPartOptions([])
    const presetStatus = String(preset?.workspace_status || "").toUpperCase()
    manualForm.setFieldsValue({
      supplier_id:
        presetSupplierId > 0
          ? presetSupplierId
          : responseSupplierFilter || undefined,
      rfq_item_id: presetRfqItemId > 0 ? presetRfqItemId : undefined,
      rfq_item_component_id: preset?.rfq_item_component_id
        ? Number(preset.rfq_item_component_id)
        : undefined,
      bundle_id: preset?.selected_bundle_id ? Number(preset.selected_bundle_id) : undefined,
      selection_key:
        preset?.selected_selection_key || preset?.selection_key || undefined,
      currency: "EUR",
      offer_type: "ANALOG",
      supplier_reply_status: normalizeSupplierReplyStatus(
        preset?.latest_supplier_reply_status || "QUOTED"
      ),
      offered_qty: defaultOfferedQty,
      incoterms: preset?.latest_incoterms || undefined,
      new_supplier_part_type: "ANALOG",
      new_revision: presetStatus === "RESPONDED",
    })
    setManualModalOpen(true)
  }

  const closeManualModal = () => {
    setManualModalOpen(false)
    setManualSupplierLock(null)
    setManualLineLock(null)
    setCreateSupplierPart(false)
    setManualSelectionOptions([])
    setSupplierPartSearch("")
    setSupplierPartOptions([])
    manualForm.resetFields()
  }

  useEffect(() => {
    if (!manualModalOpen) return
    manualForm.setFieldValue("supplier_part_id", undefined)
    setSupplierPartSearch("")
    setSupplierPartOptions([])
  }, [manualModalOpen, manualSupplierId, manualForm])

  useEffect(() => {
    if (!manualModalOpen) return
    const supplierId = Number(manualSupplierId)
    const rfqItemId = Number(manualRfqItemId)
    const rfqSupplierId = rfqSupplierIdBySupplierId.get(supplierId)
    if (!Number.isFinite(supplierId) || supplierId <= 0 || !Number.isFinite(rfqItemId) || rfqItemId <= 0 || !Number.isFinite(rfqSupplierId) || rfqSupplierId <= 0 || !activeRfqId) {
      setManualSelectionOptions([])
      if (!manualSelectionLocked) {
        manualForm.setFieldValue("selection_key", undefined)
      }
      return
    }
    let cancelled = false
    const loadSelections = async () => {
      setManualSelectionLoading(true)
      try {
        const { data } = await axios.get(
          `/rfqs/${activeRfqId}/suppliers/${rfqSupplierId}/line-selections`
        )
        if (cancelled) return
        const rows = (Array.isArray(data) ? data : []).filter(
          (row) => Number(row?.rfq_item_id) === rfqItemId
        )
        const options = rows
          .filter((row) => row?.selection_key)
          .map((row) => {
            const lineType = String(row?.line_type || "").toUpperCase()
            const typeLabel =
              lineType === "KIT_ROLE"
                ? "Роль"
                : lineType === "BOM_COMPONENT"
                  ? "Компонент"
                  : "Позиция"
            const lineLabel = String(row?.line_label || "").trim()
            const lineDescription = String(row?.line_description || "").trim()
            const qty = row?.qty != null ? ` · qty ${row.qty}` : ""
            const label = [typeLabel, lineLabel, lineDescription]
              .filter(Boolean)
              .join(" · ") + qty
            return {
              value: row.selection_key,
              label: label || `${typeLabel} · ${row.selection_key}`,
            }
          })
        setManualSelectionOptions(options)
        if (manualSelectionLocked) {
          manualForm.setFieldValue("selection_key", manualLineLock.selectionKey)
        } else if (rows.length === 1 && rows[0]?.selection_key) {
          manualForm.setFieldValue("selection_key", rows[0].selection_key)
        } else if (rows.length > 1) {
          const currentSelection = manualForm.getFieldValue("selection_key")
          if (!options.some((opt) => opt.value === currentSelection)) {
            manualForm.setFieldValue("selection_key", undefined)
          }
        } else {
          manualForm.setFieldValue("selection_key", undefined)
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e)
          setManualSelectionOptions([])
        }
      } finally {
        if (!cancelled) setManualSelectionLoading(false)
      }
    }
    loadSelections()
    return () => {
      cancelled = true
    }
  }, [
    activeRfqId,
    manualForm,
    manualModalOpen,
    manualRfqItemId,
    manualSupplierId,
    manualSelectionLocked,
    manualLineLock,
    rfqSupplierIdBySupplierId,
  ])

  useEffect(() => {
    if (!manualModalOpen) return
    if (!manualSupplierId || createSupplierPart) {
      setSupplierPartOptions([])
      return
    }
    const q = String(supplierPartSearch || "").trim()
    if (q.length < 2) {
      setSupplierPartOptions([])
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      setSupplierPartLoading(true)
      try {
        const { data } = await axios.get("/supplier-parts/search-lite", {
          params: {
            q,
            supplier_id: Number(manualSupplierId),
            limit: 50,
          },
        })
        if (cancelled) return
        const list = Array.isArray(data) ? data : []
        setSupplierPartOptions(
          list.map((item) => ({
            value: Number(item.id),
            label: item.supplier_part_number
              ? `${item.supplier_part_number} — ${
                  item.description || ""
                }${
                  item.price != null
                    ? ` · ${formatPriceWithCurrency(item.price, item.currency)}`
                    : ""
                }`
              : `Без номера — ${item.description || ""}`,
            meta: item,
          }))
        )
      } catch (e) {
        if (!cancelled) {
          console.error(e)
        }
      } finally {
        if (!cancelled) setSupplierPartLoading(false)
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [manualModalOpen, manualSupplierId, supplierPartSearch, createSupplierPart])

  const getWorkspaceStatusMeta = (row) => {
    const status = String(row.workspace_status || "").toUpperCase()
    if (status === "RESPONDED") return { label: "Ответ получен", color: "green" }
    if (status === "WAITING_RESPONSE") return { label: "Ожидаем ответ", color: "gold" }
    if (status === "ARCHIVED") return { label: "Архив", color: "default" }
    return { label: "Не отправлено", color: "default" }
  }

  const toNegotiationRow = (row) => {
    if (!row?.latest_response_line_id) return null
    return {
      id: row.latest_response_line_id,
      price: row.latest_price,
      currency: row.latest_currency,
      offer_type: row.latest_offer_type,
      supplier_reply_status: row.latest_supplier_reply_status || "QUOTED",
      offered_qty: row.latest_offered_qty,
      lead_time_days: row.latest_lead_time_days,
      moq: row.latest_moq,
      packaging: row.latest_packaging,
      validity_days: row.latest_validity_days,
      payment_terms: row.latest_payment_terms,
      incoterms: row.latest_incoterms,
      note: row.latest_note,
    }
  }

  const submitManualLine = async () => {
    try {
      const values = await manualForm.validateFields()
      const supplierReplyStatus = normalizeSupplierReplyStatus(values.supplier_reply_status)
      const requiresPrice = supplierReplyStatusRequiresPrice(supplierReplyStatus)
      const normalizedPrice =
        requiresPrice && values.price != null && values.price !== ""
          ? Number(values.price)
          : null
      const normalizedCurrency = requiresPrice
        ? String(values.currency || "").trim().toUpperCase() || null
        : null
      const payload = {
        rfq_id: Number(activeRfqId),
        supplier_id: Number(values.supplier_id),
        rfq_item_id: Number(values.rfq_item_id),
        supplier_reply_status: supplierReplyStatus,
        price: normalizedPrice,
        currency: normalizedCurrency,
        offer_type: values.offer_type || "ANALOG",
        offered_qty: values.offered_qty ?? null,
        lead_time_days: values.lead_time_days ?? null,
        moq: values.moq ?? null,
        packaging: values.packaging || null,
        validity_days: values.validity_days ?? null,
        payment_terms: values.payment_terms || null,
        incoterms: values.incoterms || null,
        note: values.note || null,
        change_reason: values.change_reason || null,
        new_revision: values.new_revision === true,
        supplier_part_id: values.supplier_part_id ? Number(values.supplier_part_id) : null,
        supplier_part_number: values.supplier_part_number || null,
        create_supplier_part: createSupplierPart === true,
        rfq_item_component_id: values.rfq_item_component_id
          ? Number(values.rfq_item_component_id)
          : null,
        bundle_id: values.bundle_id ? Number(values.bundle_id) : null,
        selection_key: values.selection_key || null,
      }
      if (createSupplierPart) {
        payload.supplier_part = {
          supplier_part_number: values.new_supplier_part_number || null,
          description_ru: values.new_supplier_part_description_ru || null,
          description_en: values.new_supplier_part_description_en || null,
          part_type: values.new_supplier_part_type || payload.offer_type,
          lead_time_days: values.lead_time_days ?? null,
          min_order_qty: values.moq ?? null,
          packaging: values.packaging || null,
          weight_kg: values.new_supplier_part_weight_kg ?? null,
          length_cm: values.new_supplier_part_length_cm ?? null,
          width_cm: values.new_supplier_part_width_cm ?? null,
          height_cm: values.new_supplier_part_height_cm ?? null,
          is_overweight:
            values.new_supplier_part_is_overweight === true
              ? 1
              : values.new_supplier_part_is_overweight === false
                ? 0
                : 0,
          is_oversize:
            values.new_supplier_part_is_oversize === true
              ? 1
              : values.new_supplier_part_is_oversize === false
                ? 0
                : 0,
        }
      }

      setManualSaving(true)
      await axios.post("/supplier-responses/manual-line", payload)
      message.success("Ответ добавлен")
      closeManualModal()
      await reloadResponses()
    } catch (e) {
      if (e?.errorFields) return
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось добавить ответ")
    } finally {
      setManualSaving(false)
    }
  }

  const openNegotiationModal = (row) => {
    setNegotiationModal({ open: true, row, saving: false })
    negotiationForm.setFieldsValue({
      price: row.price,
      currency: row.currency || "EUR",
      offer_type: row.offer_type || "ANALOG",
      supplier_reply_status: row.supplier_reply_status || "QUOTED",
      offered_qty: row.offered_qty,
      lead_time_days: row.lead_time_days,
      moq: row.moq,
      packaging: row.packaging,
      validity_days: row.validity_days,
      payment_terms: row.payment_terms,
      incoterms: row.incoterms,
      note: row.note,
      reason: "",
      new_revision: true,
    })
  }

  const submitNegotiation = async () => {
    const row = negotiationModal.row
    if (!row?.id) return
    try {
      const values = await negotiationForm.validateFields()
      const supplierReplyStatus = normalizeSupplierReplyStatus(values.supplier_reply_status)
      const requiresPrice = supplierReplyStatusRequiresPrice(supplierReplyStatus)
      const normalizedPrice =
        requiresPrice && values.price != null && values.price !== ""
          ? Number(values.price)
          : null
      const normalizedCurrency = requiresPrice
        ? String(values.currency || "").trim().toUpperCase() || null
        : null
      setNegotiationModal((prev) => ({ ...prev, saving: true }))
      await axios.post(`/supplier-responses/lines/${row.id}/revise`, {
        supplier_reply_status: supplierReplyStatus,
        price: normalizedPrice,
        currency: normalizedCurrency,
        offer_type: values.offer_type || "ANALOG",
        offered_qty: values.offered_qty ?? null,
        lead_time_days: values.lead_time_days ?? null,
        moq: values.moq ?? null,
        packaging: values.packaging || null,
        validity_days: values.validity_days ?? null,
        payment_terms: values.payment_terms || null,
        incoterms: values.incoterms || null,
        note: values.note || null,
        reason: values.reason,
        new_revision: values.new_revision !== false,
      })
      message.success("Изменение по переговорам сохранено")
      setNegotiationModal({ open: false, row: null, saving: false })
      negotiationForm.resetFields()
      await reloadResponses()
    } catch (e) {
      if (e?.errorFields) return
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось сохранить переговорную правку")
      setNegotiationModal((prev) => ({ ...prev, saving: false }))
    }
  }

  const commonColumns = [
    {
      key: "position",
      title: "Позиция",
      width: 170,
      fixed: "left",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text>{getRfqLineDisplay(r)}</Text>
          <Text type="secondary">{getSelectionDisplaySummary(r)}</Text>
        </Space>
      ),
    },
    {
      key: "supplier",
      title: "Поставщик",
      dataIndex: "supplier_name",
      width: 260,
      ellipsis: true,
      fixed: "left",
    },
    {
      key: "description",
      title: "Описание",
      width: 280,
      ellipsis: true,
      render: (_, r) => getRowDescriptionText(r),
    },
    {
      key: "sent",
      title: "Отправлено",
      width: 130,
      render: (_, r) =>
        r.last_request_rfq_revision_number
          ? `Rev ${r.last_request_rfq_revision_number}`
          : "—",
    },
    {
      key: "status",
      title: "Статус",
      width: 150,
      render: (_, r) => {
        const meta = getWorkspaceStatusMeta(r)
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      key: "source",
      title: "Источник ответа",
      width: 160,
      render: (_, r) => {
        if (!r.latest_response_line_id) return "—"
        const accepted = String(r.line_status || "").toUpperCase() === "ACCEPTED_EXISTING"
        const pseudo = {
          accepted_from_existing_price: accepted ? 1 : 0,
          entry_source: r.latest_entry_source,
          line_source_type: r.line_source_type,
          note: r.latest_note,
        }
        return <Tag color={sourceTagColor(pseudo)}>{formatSourceLabel(pseudo)}</Tag>
      },
    },
    {
      key: "offer_status",
      title: "Статус предложения",
      width: 180,
      render: (_, r) =>
        r.latest_response_line_id
          ? renderSupplierReplyStatusTag(r.latest_supplier_reply_status)
          : "—",
    },
    {
      key: "rev_response",
      title: "Rev ответа",
      dataIndex: "latest_response_rev_number",
      width: 110,
      render: (value) => (
        <span style={{ whiteSpace: "nowrap" }}>
          {value != null ? `Rev ${value}` : "—"}
        </span>
      ),
    },
    {
      key: "response_date",
      title: "Дата ответа",
      dataIndex: "latest_response_created_at",
      width: 120,
      render: formatDate,
    },
    {
      key: "price",
      title: "Цена",
      width: 130,
      render: (_, r) =>
        r.latest_price != null
          ? formatPriceWithCurrency(r.latest_price, r.latest_currency)
          : "—",
    },
    {
      key: "requested",
      title: "Запрошено",
      width: 120,
      render: (_, r) => formatRequestedQtyValue(r),
    },
    {
      key: "offered",
      title: "Предложено",
      width: 120,
      render: (_, r) => formatOfferedQtyValue(r),
    },
    {
      key: "total",
      title: "Итого",
      width: 130,
      render: (_, r) => {
        const total = getResponseLineTotal(r)
        return total != null ? formatPriceWithCurrency(total, r.latest_currency) : "—"
      },
    },
    {
      key: "offer_type",
      title: "Тип",
      dataIndex: "latest_offer_type",
      width: 120,
      render: (value) => formatOfferTypeLabel(value),
    },
    { key: "lead_time", title: "Срок, дн", dataIndex: "latest_lead_time_days", width: 90 },
    { key: "moq", title: "MOQ", dataIndex: "latest_moq", width: 90 },
    { key: "packaging", title: "Упаковка", dataIndex: "latest_packaging", width: 120 },
    {
      key: "incoterms",
      title: "Инкотермс",
      dataIndex: "latest_incoterms",
      width: 110,
      render: (value) => value || "—",
    },
    { key: "supplier_part_number", title: "PN поставщика", dataIndex: "latest_supplier_part_number", width: 150 },
    {
      key: "supplier_description",
      title: "Описание поставщика",
      dataIndex: "latest_supplier_part_description",
      width: 240,
      ellipsis: true,
      render: (value) => value || "—",
    },
    {
      key: "reason",
      title: "Причина/коммент.",
      width: 220,
      render: (_, r) => r.latest_change_reason || r.latest_note || r.line_status_note || "—",
    },
    {
      key: "actions",
      title: "Действия",
      width: 220,
      fixed: "right",
      render: (_, r) => (
        <Space size={6}>
          <Button
            size="small"
            type={String(r.workspace_status || "").toUpperCase() === "RESPONDED" ? "default" : "primary"}
            onClick={() =>
              openManualModal({
                supplier_id: r.supplier_id,
                rfq_item_id: r.rfq_item_id,
                supplier_name: r.supplier_name,
                rfq_line_number: r.rfq_line_number,
                requested_original_cat_number: r.requested_original_cat_number,
                requested_original_description_ru: r.requested_original_description_ru,
                requested_original_description_en: r.requested_original_description_en,
                client_description: r.client_description,
                workspace_status: r.workspace_status,
                rfq_item_component_id: r.selected_line_type === "BOM_COMPONENT"
                  ? r.rfq_item_component_id
                  : null,
                selected_selection_key: r.selected_selection_key,
                selected_bundle_id: r.selected_bundle_id,
                selected_line_type: r.selected_line_type,
              })
            }
          >
            {String(r.workspace_status || "").toUpperCase() === "RESPONDED"
              ? "Добавить ревизию"
              : "Внести ответ"}
          </Button>
          <Button
            size="small"
            onClick={() => {
              const base = toNegotiationRow(r)
              if (!base) {
                message.info("Нет строки ответа для переговорной правки")
                return
              }
              openNegotiationModal(base)
            }}
            disabled={!r.latest_response_line_id}
          >
            Переговоры
          </Button>
        </Space>
      ),
    },
  ]

  const originalViewColumns = [
    {
      key: "position",
      title: "Позиция",
      width: 170,
      fixed: "left",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text>{getRfqLineDisplay(r)}</Text>
          <Text type="secondary">{getSelectionDisplaySummary(r)}</Text>
        </Space>
      ),
    },
    {
      key: "supplier",
      title: "Поставщик",
      dataIndex: "supplier_name",
      width: 260,
      ellipsis: true,
      fixed: "left",
    },
    {
      key: "status",
      title: "Статус",
      width: 150,
      render: (_, r) => {
        const meta = getWorkspaceStatusMeta(r)
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      key: "sent",
      title: "Отправлено",
      width: 130,
      render: (_, r) =>
        r.last_request_rfq_revision_number
          ? `Rev ${r.last_request_rfq_revision_number}`
          : "—",
    },
    {
      key: "rev_response",
      title: "Rev ответа",
      dataIndex: "latest_response_rev_number",
      width: 110,
      render: (value) => (
        <span style={{ whiteSpace: "nowrap" }}>
          {value != null ? `Rev ${value}` : "—"}
        </span>
      ),
    },
    {
      key: "offer_status",
      title: "Статус предложения",
      width: 180,
      render: (_, r) =>
        r.latest_response_line_id
          ? renderSupplierReplyStatusTag(r.latest_supplier_reply_status)
          : "—",
    },
    {
      key: "price",
      title: "Цена",
      width: 130,
      render: (_, r) =>
        r.latest_price != null
          ? formatPriceWithCurrency(r.latest_price, r.latest_currency)
          : "—",
    },
    {
      key: "requested",
      title: "Запрошено",
      width: 120,
      render: (_, r) => formatRequestedQtyValue(r),
    },
    {
      key: "offered",
      title: "Предложено",
      width: 120,
      render: (_, r) => formatOfferedQtyValue(r),
    },
    {
      key: "total",
      title: "Итого",
      width: 130,
      render: (_, r) => {
        const total = getResponseLineTotal(r)
        return total != null ? formatPriceWithCurrency(total, r.latest_currency) : "—"
      },
    },
    { key: "lead_time", title: "Срок, дн", dataIndex: "latest_lead_time_days", width: 90 },
    { key: "moq", title: "MOQ", dataIndex: "latest_moq", width: 90 },
    {
      key: "incoterms",
      title: "Инкотермс",
      dataIndex: "latest_incoterms",
      width: 110,
      render: (value) => value || "—",
    },
    { key: "supplier_part_number", title: "PN поставщика", dataIndex: "latest_supplier_part_number", width: 150 },
    {
      key: "supplier_description",
      title: "Описание поставщика",
      dataIndex: "latest_supplier_part_description",
      width: 240,
      ellipsis: true,
      render: (value) => value || "—",
    },
    { key: "response_date", title: "Дата ответа", dataIndex: "latest_response_created_at", width: 120, render: formatDate },
    {
      key: "actions",
      title: "Действия",
      width: 220,
      fixed: "right",
      render: (_, r) => (
        <Space size={6}>
          <Button
            size="small"
            type={String(r.workspace_status || "").toUpperCase() === "RESPONDED" ? "default" : "primary"}
            onClick={() =>
              openManualModal({
                supplier_id: r.supplier_id,
                rfq_item_id: r.rfq_item_id,
                supplier_name: r.supplier_name,
                rfq_line_number: r.rfq_line_number,
                requested_original_cat_number: r.requested_original_cat_number,
                requested_original_description_ru: r.requested_original_description_ru,
                requested_original_description_en: r.requested_original_description_en,
                client_description: r.client_description,
                workspace_status: r.workspace_status,
                rfq_item_component_id: r.selected_line_type === "BOM_COMPONENT"
                  ? r.rfq_item_component_id
                  : null,
                selected_selection_key: r.selected_selection_key,
                selected_bundle_id: r.selected_bundle_id,
                selected_line_type: r.selected_line_type,
              })
            }
          >
            {String(r.workspace_status || "").toUpperCase() === "RESPONDED"
              ? "Добавить ревизию"
              : "Внести ответ"}
          </Button>
          <Button
            size="small"
            onClick={() => {
              const base = toNegotiationRow(r)
              if (!base) {
                message.info("Нет строки ответа для переговорной правки")
                return
              }
              openNegotiationModal(base)
            }}
            disabled={!r.latest_response_line_id}
          >
            Переговоры
          </Button>
        </Space>
      ),
    },
  ]

  const requiredSupplierColumns = ["position", "supplier", "actions"]
  const requiredOriginalColumns = ["position", "supplier", "actions"]

  const supplierColumnOptions = useMemo(
    () =>
      commonColumns
        .filter((column) => !requiredSupplierColumns.includes(column.key))
        .map((column) => ({
          label: String(column.title || column.key),
          value: column.key,
        })),
    [commonColumns]
  )

  const originalColumnOptions = useMemo(
    () =>
      originalViewColumns
        .filter((column) => !requiredOriginalColumns.includes(column.key))
        .map((column) => ({
          label: String(column.title || column.key),
          value: column.key,
        })),
    [originalViewColumns]
  )

  const visibleCommonColumns = useMemo(
    () => filterColumnsByKeys(commonColumns, visibleSupplierColumnKeys, requiredSupplierColumns),
    [commonColumns, visibleSupplierColumnKeys]
  )
  const visibleOriginalViewColumns = useMemo(
    () => filterColumnsByKeys(originalViewColumns, visibleOriginalColumnKeys, requiredOriginalColumns),
    [originalViewColumns, visibleOriginalColumnKeys]
  )

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="Рабочая матрица по ответам: что отправлено, где ждём ответ и где уже есть цена. Можно вносить ответы вручную и вести переговорные ревизии."
      />
      <Space wrap>
        <Tag color="gold">Ожидают: {counters.waiting}</Tag>
        <Tag color="green">Получено: {counters.responded}</Tag>
        <Tag color="default">Не отправлено: {counters.notSent}</Tag>
        <Tag>Всего строк: {counters.total}</Tag>
      </Space>
      <Space wrap>
        {viewMode === "supplier" ? (
          <Select
            allowClear
            placeholder="Фильтр по поставщику"
            options={responseSuppliers}
            style={{ minWidth: 260 }}
            value={responseSupplierFilter}
            onChange={(v) => setResponseSupplierFilter(v || null)}
          />
        ) : (
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Фильтр по оригиналу"
            options={originalFilterOptions}
            style={{ minWidth: 320 }}
            value={responseOriginalFilter}
            onChange={(v) => setResponseOriginalFilter(v || null)}
          />
        )}
        <Button onClick={reloadResponses}>Обновить ответы</Button>
        <Checkbox
          checked={showArchivedResponses}
          onChange={(e) => setShowArchivedResponses(e.target.checked)}
        >
          Показывать архивные
        </Checkbox>
        <Checkbox
          checked={onlyWaiting}
          onChange={(e) => setOnlyWaiting(e.target.checked)}
        >
          Только ожидают ответа
        </Checkbox>
        <Radio.Group
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value)}
          optionType="button"
          buttonStyle="solid"
          options={[
            { label: "По поставщику", value: "supplier" },
            { label: "По оригиналу", value: "original" },
          ]}
        />
        <Popover
          trigger="click"
          placement="bottomRight"
          content={
            <Space
              direction="vertical"
              size={8}
              style={{ width: 320, maxHeight: 420, overflowY: "auto" }}
            >
              <Text strong>Видимые колонки</Text>
              <Checkbox.Group
                options={viewMode === "supplier" ? supplierColumnOptions : originalColumnOptions}
                value={viewMode === "supplier" ? visibleSupplierColumnKeys : visibleOriginalColumnKeys}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
                onChange={(keys) => {
                  if (viewMode === "supplier") {
                    setVisibleSupplierColumnKeys(keys)
                  } else {
                    setVisibleOriginalColumnKeys(keys)
                  }
                }}
              />
              <Space>
                <Button
                  size="small"
                  onClick={() => {
                    if (viewMode === "supplier") {
                      setVisibleSupplierColumnKeys([
                        "position",
                        "supplier",
                        "description",
                        "sent",
                        "status",
                        "offer_status",
                        "price",
                        "requested",
                        "offered",
                        "total",
                        "lead_time",
                        "actions",
                      ])
                    } else {
                      setVisibleOriginalColumnKeys([
                        "position",
                        "supplier",
                        "status",
                        "sent",
                        "offer_status",
                        "price",
                        "requested",
                        "offered",
                        "total",
                        "lead_time",
                        "actions",
                      ])
                    }
                  }}
                >
                  Сбросить
                </Button>
              </Space>
            </Space>
          }
        >
          <Button>Колонки</Button>
        </Popover>
        <Button
          onClick={() =>
            setImportModal({
              open: true,
              supplierId: viewMode === "supplier" ? responseSupplierFilter || null : null,
              detectedSupplierId: null,
              detectedSupplierName: "",
              text: "",
              rows: [],
              loading: false,
              fileName: "",
              newRevision: importModal.newRevision === true,
              preview: null,
              previewKey: "",
            })
          }
        >
          Импорт ответов (Excel/TSV)
        </Button>
      </Space>

      <Table
        rowKey={(row) =>
          `${row.rfq_supplier_id}-${row.rfq_item_id}-${
            row.selected_selection_key || row.selection_key || "no-selection"
          }`
        }
        dataSource={viewMode === "supplier" ? visibleWorkspaceRows : byOriginalRows}
        pagination={false}
        size="small"
        tableLayout="auto"
        scroll={{ x: "max-content" }}
        columns={viewMode === "supplier" ? visibleCommonColumns : visibleOriginalViewColumns}
      />

      <Card size="small" title="Таймлайн по строкам (ревизии ответов)">
        {[...responseTimeline.entries()].map(([key, list]) => (
          <div key={key} style={{ marginBottom: 12 }}>
            <Text strong>
              {(list[0]?.supplier_name || "Поставщик без названия") +
                ` · Строка ${getRfqLineDisplay(list[0])}` +
                ` · ${getRowContextTypeLabel(list[0])}: ${getSelectionDisplaySummary(list[0])}`}
            </Text>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
              {list.map((r) => (
                <Tag key={`${r.id}`} color={sourceTagColor(r)}>
                  {(() => {
                    const statusMeta =
                      SUPPLIER_REPLY_STATUS_META[
                        normalizeSupplierReplyStatus(r.supplier_reply_status)
                      ]
                    const statusText = statusMeta?.label || "Без ответа"
                    const valueText =
                      r.price != null
                        ? formatPriceWithCurrency(r.price, r.currency)
                        : statusText
                    return (
                      <>
                        {formatSourceLabel(r)} · Rev {r.response_rev_number || "?"}: {valueText} ·
                        {r.lead_time_days ? ` ${r.lead_time_days}дн` : ""} · {formatDate(r.created_at)}
                        {r.change_reason ? ` · ${r.change_reason}` : ""}
                      </>
                    )
                  })()}
                </Tag>
              ))}
            </div>
          </div>
        ))}
        {!responseTimeline.size && <Text type="secondary">Пока нет ответов</Text>}
      </Card>

      <Modal
        open={manualModalOpen}
        title="Добавить ответ вручную"
        onCancel={closeManualModal}
        onOk={submitManualLine}
        okText="Сохранить"
        confirmLoading={manualSaving}
      >
        <Form layout="vertical" form={manualForm}>
          {manualSupplierLock ? (
            <Form.Item
              name="supplier_id"
              hidden
              rules={[{ required: true, message: "Выберите поставщика" }]}
            >
              <InputNumber />
            </Form.Item>
          ) : null}
          {!manualSupplierLock ? (
            <Form.Item
              name="supplier_id"
              label="Поставщик"
              rules={[{ required: true, message: "Выберите поставщика" }]}
            >
              <Select options={supplierOptions} showSearch optionFilterProp="label" />
            </Form.Item>
          ) : null}
          {manualLineLock ? (
            <Form.Item
              name="rfq_item_id"
              hidden
              rules={[{ required: true, message: "Выберите строку" }]}
            >
              <InputNumber />
            </Form.Item>
          ) : null}
          {!manualLineLock ? (
            <Form.Item
              name="rfq_item_id"
              label="Строка RFQ"
              rules={[{ required: true, message: "Выберите строку" }]}
            >
              <Select options={lineOptions} showSearch optionFilterProp="label" />
            </Form.Item>
          ) : null}
          {manualSelectionOptions.length > 1 && !manualSelectionLocked ? (
            <Form.Item
              name="selection_key"
              label="Компонент/роль RFQ"
              rules={[{ required: true, message: "Выберите компонент или роль" }]}
              extra="Для этой позиции выбрано несколько строк структуры. Укажите, к какой именно строке относится ответ."
            >
              <Select
                showSearch
                optionFilterProp="label"
                options={manualSelectionOptions}
                loading={manualSelectionLoading}
              />
            </Form.Item>
          ) : null}
          <Form.Item name="rfq_item_component_id" hidden>
            <InputNumber />
          </Form.Item>
          <Form.Item name="bundle_id" hidden>
            <InputNumber />
          </Form.Item>
          {manualSelectionOptions.length <= 1 || manualSelectionLocked ? (
            <Form.Item name="selection_key" hidden>
              <Input />
            </Form.Item>
          ) : null}
          <Form.Item
            name="supplier_reply_status"
            label="Статус ответа"
            rules={[{ required: true, message: "Выберите статус ответа" }]}
          >
            <Select options={SUPPLIER_REPLY_STATUS_OPTIONS} />
          </Form.Item>
          <Space style={{ display: "flex" }} align="start">
            <Form.Item
              name="price"
              label="Цена"
              rules={[
                () => ({
                  validator(_, value) {
                    if (!supplierReplyStatusRequiresPrice(manualReplyStatus)) return Promise.resolve()
                    if (value == null || value === "") {
                      return Promise.reject(new Error("Введите цену"))
                    }
                    return Promise.resolve()
                  },
                }),
              ]}
            >
              <InputNumber
                min={0}
                step={0.01}
                disabled={!supplierReplyStatusRequiresPrice(manualReplyStatus)}
              />
            </Form.Item>
            <Form.Item
              name="currency"
              label="Валюта"
              rules={[
                () => ({
                  validator(_, value) {
                    if (!supplierReplyStatusRequiresPrice(manualReplyStatus)) return Promise.resolve()
                    if (!String(value || "").trim()) {
                      return Promise.reject(new Error("Введите валюту"))
                    }
                    return Promise.resolve()
                  },
                }),
              ]}
            >
              <Select
                style={{ width: 90 }}
                options={SUPPLIER_DEFAULT_CURRENCY_OPTIONS}
                showSearch
                optionFilterProp="label"
                allowClear
                placeholder="Валюта"
                disabled={!supplierReplyStatusRequiresPrice(manualReplyStatus)}
              />
            </Form.Item>
            <Form.Item name="offer_type" label="Тип">
              <Select style={{ width: 160 }} options={OFFER_TYPE_OPTIONS} />
            </Form.Item>
          </Space>
          <Space style={{ display: "flex" }} align="start">
            <Form.Item name="offered_qty" label="Кол-во (предложено)">
              <InputNumber min={0} step={0.001} />
            </Form.Item>
            <Form.Item name="lead_time_days" label="Срок, дн">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="moq" label="MOQ">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="validity_days" label="Валидн., дн">
              <InputNumber min={0} />
            </Form.Item>
          </Space>
          <Form.Item name="packaging" label="Упаковка">
            <Input />
          </Form.Item>
          <Form.Item name="payment_terms" label="Условия оплаты">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Выберите условия оплаты"
              options={SUPPLIER_DEFAULT_PAYMENT_TERMS_OPTIONS}
            />
          </Form.Item>
          <Form.Item name="incoterms" label="Incoterms">
            <IncotermsSelect style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="note" label="Комментарий">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="change_reason" label="Причина (опционально)">
            <Input placeholder="Например: ответ получен по email/PDF" />
          </Form.Item>
          <Form.Item name="new_revision" valuePropName="checked">
            <Checkbox>Создать новую ревизию ответа</Checkbox>
          </Form.Item>
          <Form.Item>
            <Checkbox
              checked={createSupplierPart}
              onChange={(e) => {
                const checked = e.target.checked
                setCreateSupplierPart(checked)
                if (checked) {
                  manualForm.setFieldValue("supplier_part_id", undefined)
                  setSupplierPartSearch("")
                }
              }}
            >
              Создать новую деталь поставщика и привязать к оригиналу строки
            </Checkbox>
          </Form.Item>
          {!createSupplierPart ? (
            <Form.Item
              name="supplier_part_id"
              label="Деталь поставщика (если уже есть в каталоге)"
              tooltip="Поиск по номеру и описанию. Используется рабочий номер детали поставщика, не внутренний идентификатор."
            >
              <Select
                allowClear
                showSearch
                filterOption={false}
                placeholder="Введите минимум 2 символа для поиска"
                options={supplierPartOptions}
                loading={supplierPartLoading}
                onSearch={setSupplierPartSearch}
                notFoundContent={
                  supplierPartSearch?.trim()?.length >= 2
                    ? "Ничего не найдено"
                    : "Введите минимум 2 символа"
                }
                onChange={(val, option) => {
                  if (!val || !option?.meta) return
                  const partType = String(option.meta.part_type || "").toUpperCase()
                  if (["OEM", "ANALOG", "UNKNOWN"].includes(partType)) {
                    manualForm.setFieldValue("offer_type", partType)
                  }
                }}
              />
            </Form.Item>
          ) : null}
          {createSupplierPart ? (
            <>
              <Form.Item
                name="new_supplier_part_number"
                label="Кат. номер поставщика"
                rules={[{ required: true, message: "Введите кат. номер" }]}
              >
                <Input />
              </Form.Item>
              <Form.Item name="new_supplier_part_description_ru" label="Описание RU">
                <Input />
              </Form.Item>
              <Form.Item name="new_supplier_part_description_en" label="Описание EN">
                <Input />
              </Form.Item>
              <Form.Item name="new_supplier_part_type" label="Тип детали">
                <Select options={OFFER_TYPE_OPTIONS} />
              </Form.Item>
              <Space style={{ display: "flex" }} align="start">
                <Form.Item
                  name="new_supplier_part_is_overweight"
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <Checkbox>Тяжелая</Checkbox>
                </Form.Item>
                <Form.Item
                  name="new_supplier_part_is_oversize"
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <Checkbox>Негабарит</Checkbox>
                </Form.Item>
              </Space>
              <Space style={{ display: "flex" }} align="start">
                <Form.Item name="new_supplier_part_weight_kg" label="Вес, кг">
                  <InputNumber min={0} step={0.01} />
                </Form.Item>
                <Form.Item name="new_supplier_part_length_cm" label="Длина, см">
                  <InputNumber min={0} step={0.01} />
                </Form.Item>
                <Form.Item name="new_supplier_part_width_cm" label="Ширина, см">
                  <InputNumber min={0} step={0.01} />
                </Form.Item>
                <Form.Item name="new_supplier_part_height_cm" label="Высота, см">
                  <InputNumber min={0} step={0.01} />
                </Form.Item>
              </Space>
            </>
          ) : null}
        </Form>
      </Modal>

      <Modal
        open={negotiationModal.open}
        title="Переговорная правка ответа"
        onCancel={() => setNegotiationModal({ open: false, row: null, saving: false })}
        onOk={submitNegotiation}
        okText="Сохранить ревизию"
        confirmLoading={negotiationModal.saving}
      >
        <Form layout="vertical" form={negotiationForm}>
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message="Будет создана новая версия ответа по выбранной строке"
          />
          <Form.Item
            name="supplier_reply_status"
            label="Статус ответа"
            rules={[{ required: true, message: "Выберите статус ответа" }]}
          >
            <Select options={SUPPLIER_REPLY_STATUS_OPTIONS} />
          </Form.Item>
          <Space style={{ display: "flex" }} align="start">
            <Form.Item
              name="price"
              label="Цена"
              rules={[
                () => ({
                  validator(_, value) {
                    if (!supplierReplyStatusRequiresPrice(negotiationReplyStatus)) {
                      return Promise.resolve()
                    }
                    if (value == null || value === "") {
                      return Promise.reject(new Error("Введите цену"))
                    }
                    return Promise.resolve()
                  },
                }),
              ]}
            >
              <InputNumber
                min={0}
                step={0.01}
                disabled={!supplierReplyStatusRequiresPrice(negotiationReplyStatus)}
              />
            </Form.Item>
            <Form.Item
              name="currency"
              label="Валюта"
              rules={[
                () => ({
                  validator(_, value) {
                    if (!supplierReplyStatusRequiresPrice(negotiationReplyStatus)) {
                      return Promise.resolve()
                    }
                    if (!String(value || "").trim()) {
                      return Promise.reject(new Error("Введите валюту"))
                    }
                    return Promise.resolve()
                  },
                }),
              ]}
            >
              <Select
                style={{ width: 90 }}
                options={SUPPLIER_DEFAULT_CURRENCY_OPTIONS}
                showSearch
                optionFilterProp="label"
                allowClear
                placeholder="Валюта"
                disabled={!supplierReplyStatusRequiresPrice(negotiationReplyStatus)}
              />
            </Form.Item>
            <Form.Item name="offer_type" label="Тип">
              <Select style={{ width: 160 }} options={OFFER_TYPE_OPTIONS} />
            </Form.Item>
          </Space>
          <Space style={{ display: "flex" }} align="start">
            <Form.Item name="offered_qty" label="Кол-во (предложено)">
              <InputNumber min={0} step={0.001} />
            </Form.Item>
            <Form.Item name="lead_time_days" label="Срок, дн">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="moq" label="MOQ">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="validity_days" label="Валидн., дн">
              <InputNumber min={0} />
            </Form.Item>
          </Space>
          <Form.Item name="packaging" label="Упаковка">
            <Input />
          </Form.Item>
          <Form.Item name="payment_terms" label="Условия оплаты">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Выберите условия оплаты"
              options={SUPPLIER_DEFAULT_PAYMENT_TERMS_OPTIONS}
            />
          </Form.Item>
          <Form.Item name="incoterms" label="Incoterms">
            <IncotermsSelect style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="note" label="Комментарий">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="reason"
            label="Причина изменения (обязательно)"
            rules={[{ required: true, message: "Укажите причину переговорной правки" }]}
          >
            <Input placeholder="Например: согласована скидка после звонка" />
          </Form.Item>
          <Form.Item name="new_revision" valuePropName="checked">
            <Checkbox>Создать новую ревизию ответа</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}
