import dayjs from "dayjs"

export const formatDate = (value) => {
  if (!value) return "-"
  try {
    return new Date(value).toLocaleDateString("ru-RU")
  } catch {
    return "-"
  }
}

export const formatIncotermsWithPlace = (code, place) => {
  const parts = [String(code || "").trim(), String(place || "").trim()].filter(Boolean)
  return parts.length ? parts.join(" ") : "—"
}

export const STEP_LABELS = [
  "RFQ",
  "Поставщики",
  "Ответы",
  "Покрытие",
  "Сценарии",
  "Логистика",
  "Экономика",
  "Выбор",
  "КП",
  "Контракт",
  "PO",
]

export const STEP_TO_TAB = [
  "rfq",
  "suppliers",
  "responses",
  "coverage",
  "scenarios",
  "logistics",
  "economics",
  "selection",
  "sales",
  "contracts",
  "po",
]

export const TAB_TO_STEP = STEP_TO_TAB.reduce((acc, key, index) => {
  acc[key] = index
  return acc
}, {})

export const statusToColor = (value) => {
  if (!value) return "default"
  if (value === "invited") return "default"
  if (value === "sent") return "blue"
  if (value === "received") return "green"
  if (value === "responded") return "green"
  if (value === "structured") return "cyan"
  if (value === "draft") return "default"
  return "gold"
}

export const rfqStatusLabel = (value) => {
  if (!value) return "—"
  const labels = {
    draft: "Черновик",
    structured: "Структура готова",
    sent: "RFQ отправлен",
    responded: "Ответы получены",
  }
  return labels[value] || value
}

export const supplierStatusLabel = (value) => {
  if (!value) return "—"
  const labels = {
    invited: "Приглашен",
    sent: "Отправлен",
    received: "Ответ получен",
    responded: "Ответ получен",
  }
  return labels[value] || value
}

const matchTypeLabel = {
  WHOLE: "Целиком",
  BOM: "По составу",
  KIT: "Комплект",
}

export const renderMatchTypes = (value) => {
  if (!value) return "—"
  return value
    .split(",")
    .map((v) => matchTypeLabel[v] || v)
    .join(", ")
}

export const buildPriceSourceText = (hint) => {
  const type = String(hint?.source_type || hint?.latest_price_source_type || "").toUpperCase()
  const sourceSubtype = String(
    hint?.source_subtype ||
      hint?.latest_price_source_subtype ||
      hint?.response_entry_source ||
      hint?.latest_price_entry_source ||
      ""
  ).toUpperCase()
  if (!type) return ""
  const rfqNumber = hint?.rfq_number || hint?.latest_price_rfq_number || null
  const rfqId = hint?.rfq_id || hint?.latest_price_rfq_id || null
  const rfqRev = hint?.rfq_response_rev_number || hint?.latest_price_rfq_rev_number || null
  const rfqLabel = rfqNumber ? rfqNumber : rfqId ? `RFQ-${rfqId}` : "RFQ"
  const rev = rfqRev ? ` · rev ${rfqRev}` : ""

  if (type === "PRICE_LIST") {
    const name =
      hint?.price_list_name ||
      hint?.latest_price_price_list_name ||
      hint?.price_list_code ||
      hint?.latest_price_price_list_code ||
      (hint?.price_list_id
        ? `#${hint.price_list_id}`
        : hint?.latest_price_price_list_id
          ? `#${hint.latest_price_price_list_id}`
          : "")
    if (!name) return "Прайс-лист"
    return `Прайс-лист: ${name}`
  }
  if (type === "RFQ") {
    return `${rfqLabel}${rev}`
  }
  if (type === "RFQ_RESPONSE") {
    const subtypeLabel = {
      SUPPLIER_MANUAL: "вручную",
      SUPPLIER_FILE: "файл поставщика",
      NEGOTIATION: "переговоры",
      ACCEPTED_EXISTING: "принятая цена",
      SYSTEM_IMPORT: "системный импорт",
    }[sourceSubtype]
    const prefix = subtypeLabel ? `Ответ RFQ (${subtypeLabel})` : "Ответ RFQ"
    return `${prefix}: ${rfqLabel}${rev}`
  }
  if (type === "MANUAL") return "Вручную"
  if (type === "NEGOTIATION") return "Переговоры"
  if (type === "OTHER") return "Другое"
  return type
}

export const formatHintDate = (value) => {
  if (!value) return ""
  const d = dayjs(value)
  return d.isValid() ? d.format("DD.MM.YYYY") : String(value).slice(0, 10)
}

export const parseNumberOrNull = (value) => {
  if (value === undefined || value === null) return null
  const raw = String(value).trim()
  if (!raw) return null
  const normalized = raw.replace(/\s+/g, "").replace(",", ".")
  const num = Number(normalized)
  return Number.isFinite(num) ? num : null
}

const parseOfferType = (value) => {
  const raw = String(value || "").trim().toUpperCase()
  if (!raw) return null
  if (raw === "OEM") return "OEM"
  if (raw === "ANALOG") return "ANALOG"
  if (raw === "UNKNOWN") return "UNKNOWN"
  if (raw === "НЕ УКАЗАН" || raw === "НЕ УКАЗАНО") return "UNKNOWN"
  if (raw === "АНАЛОГ") return "ANALOG"
  if (raw === "ОРИГИНАЛ" || raw === "OEM (ОРИГИНАЛ)") return "OEM"
  return null
}

const parseSupplierReplyStatus = (value) => {
  const raw = String(value || "").trim().toUpperCase()
  if (!raw) return null
  if (["QUOTED", "PRICE PROVIDED", "ЦЕНА ПРЕДОСТАВЛЕНА"].includes(raw)) return "QUOTED"
  if (["NO_STOCK", "NO STOCK", "OUT OF STOCK", "НЕТ В НАЛИЧИИ"].includes(raw)) return "NO_STOCK"
  if (["DISCONTINUED", "СНЯТ С ПРОИЗВОДСТВА"].includes(raw)) return "DISCONTINUED"
  if (["NEEDS_CLARIFICATION", "NEEDS CLARIFICATION", "ТРЕБУЕТ УТОЧНЕНИЯ"].includes(raw)) {
    return "NEEDS_CLARIFICATION"
  }
  if (["NO_RESPONSE", "NO RESPONSE", "БЕЗ ОТВЕТА"].includes(raw)) return "NO_RESPONSE"
  return null
}

const parseBooleanFlagOrNull = (value) => {
  if (value === undefined || value === null) return null
  const raw = String(value).trim().toLowerCase()
  if (!raw) return null
  if (["1", "true", "yes", "y", "да", "есть"].includes(raw)) return 1
  if (["0", "false", "no", "n", "нет"].includes(raw)) return 0
  return null
}

const normalizeHeaderKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[_\-()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const resolveHeaderField = (headerValue) => {
  const key = normalizeHeaderKey(headerValue)
  if (!key) return null
  const includes = (needle) => key.includes(needle)

  if (key === "строка" || key === "line" || key === "line number" || key === "line_number") {
    return "line_number"
  }
  if (key === "selection key" || key === "selection_key") return "selection_key"
  if (key === "rfq item id" || key === "rfq_item_id") return "rfq_item_id"
  if (includes("строк") || includes("line")) return "line_number"
  if (key === "цена" || key === "price") return "price"
  if (key === "кол во" || key === "кол-во" || key === "qty" || key === "quantity") return "offered_qty"
  if (includes("кол") || includes("qty")) return "offered_qty"
  if (includes("валют") || key === "currency") return "currency"
  if (includes("срок") || includes("lead")) return "lead_time_days"
  if (key === "moq") return "moq"
  if (includes("упаков")) return "packaging"
  if (includes("коммент") || includes("примеч") || key === "note" || key === "comment") return "note"
  if (includes("тип") || includes("offer")) return "offer_type"
  if (includes("статус ответа") || includes("reply status") || includes("quote status")) {
    return "supplier_reply_status"
  }
  if (includes("incoterm") && (includes("place") || includes("named") || includes("пункт") || includes("мест"))) {
    return "incoterms_place"
  }
  if (includes("incoterm")) return "incoterms"
  if (includes("услов") || includes("payment")) return "payment_terms"
  if (includes("valid") || includes("срок действия")) return "validity_days"
  if (includes("pn") || includes("supplier part")) return "supplier_part_number"
  if (includes("описание поставщика") || includes("supplier description")) return "supplier_description"
  if (includes("вес") || key === "weight") return "weight_kg"
  if (includes("длина") || key === "length") return "length_cm"
  if (includes("ширина") || key === "width") return "width_cm"
  if (includes("высота") || key === "height") return "height_cm"
  if (includes("тяжел") || includes("heavy")) return "is_overweight"
  if (includes("негабар") || includes("oversize")) return "is_oversize"
  return null
}

const parseImportRowByHeaderMap = (cells, headerMap) => {
  const row = Array.isArray(cells) ? cells : []
  const getValue = (fieldName) => {
    const index = headerMap?.[fieldName]
    if (!Number.isFinite(index) || index < 0) return null
    return row[index]
  }
  const lineNumber = parseNumberOrNull(getValue("line_number"))
  if (!lineNumber) return null
  const price = parseNumberOrNull(getValue("price"))
  const currencyRaw = getValue("currency")
  const currency = currencyRaw ? String(currencyRaw).trim().toUpperCase() : null
  const supplierReplyStatus = parseSupplierReplyStatus(getValue("supplier_reply_status")) || "QUOTED"
  const requiresPrice = supplierReplyStatus === "QUOTED"
  if (requiresPrice && (price == null || !currency)) return null
  if (!requiresPrice && (price != null || currency)) return null

  return {
    rfq_item_id: parseNumberOrNull(getValue("rfq_item_id")),
    line_number: Number(lineNumber),
    selection_key: getValue("selection_key")
      ? String(getValue("selection_key")).trim()
      : null,
    price: requiresPrice ? Number(price) : null,
    currency: requiresPrice ? currency : null,
    supplier_reply_status: supplierReplyStatus,
    offered_qty: parseNumberOrNull(getValue("offered_qty")),
    lead_time_days: parseNumberOrNull(getValue("lead_time_days")),
    note: getValue("note") ? String(getValue("note")).trim() : null,
    offer_type: parseOfferType(getValue("offer_type")),
    moq: parseNumberOrNull(getValue("moq")),
    packaging: getValue("packaging") ? String(getValue("packaging")).trim() : null,
    incoterms: getValue("incoterms") ? String(getValue("incoterms")).trim().toUpperCase() : null,
    incoterms_place: getValue("incoterms_place")
      ? String(getValue("incoterms_place")).trim()
      : null,
    payment_terms: getValue("payment_terms") ? String(getValue("payment_terms")).trim() : null,
    validity_days: parseNumberOrNull(getValue("validity_days")),
    supplier_part_number: getValue("supplier_part_number")
      ? String(getValue("supplier_part_number")).trim()
      : null,
    supplier_description: getValue("supplier_description")
      ? String(getValue("supplier_description")).trim()
      : null,
    weight_kg: parseNumberOrNull(getValue("weight_kg")),
    length_cm: parseNumberOrNull(getValue("length_cm")),
    width_cm: parseNumberOrNull(getValue("width_cm")),
    height_cm: parseNumberOrNull(getValue("height_cm")),
    is_overweight: parseBooleanFlagOrNull(getValue("is_overweight")),
    is_oversize: parseBooleanFlagOrNull(getValue("is_oversize")),
  }
}

export const parseImportRow = (cells) => {
  const row = Array.isArray(cells) ? cells : []
  const lineNumber = parseNumberOrNull(row[0])
  if (!lineNumber) return null
  const parseByTemplateIndexes = (idx) => {
    const templatePrice = parseNumberOrNull(row[idx.price])
    const templateCurrency = row[idx.currency] ? String(row[idx.currency]).trim().toUpperCase() : null
    const supplierReplyStatus = parseSupplierReplyStatus(row[idx.replyStatus]) || "QUOTED"
    const requiresPrice = supplierReplyStatus === "QUOTED"
    if (requiresPrice && (templatePrice == null || !templateCurrency)) return null
    if (!requiresPrice && (templatePrice != null || templateCurrency)) return null
    return {
      rfq_item_id: parseNumberOrNull(row[idx.rfqItemId]),
      line_number: Number(lineNumber),
      selection_key: row[idx.selectionKey] ? String(row[idx.selectionKey]).trim() : null,
      price: requiresPrice ? Number(templatePrice) : null,
      currency: requiresPrice ? templateCurrency : null,
      supplier_reply_status: supplierReplyStatus,
      offered_qty: parseNumberOrNull(row[idx.offeredQty]),
      lead_time_days: parseNumberOrNull(row[idx.lead]),
      note: row[idx.comment] ? String(row[idx.comment]).trim() : null,
      offer_type: parseOfferType(row[idx.offer]),
      moq: parseNumberOrNull(row[idx.moq]),
      packaging: row[idx.packaging] ? String(row[idx.packaging]).trim() : null,
      incoterms: row[idx.incoterms] ? String(row[idx.incoterms]).trim().toUpperCase() : null,
      incoterms_place: row[idx.incotermsPlace]
        ? String(row[idx.incotermsPlace]).trim()
        : null,
      payment_terms: row[idx.paymentTerms] ? String(row[idx.paymentTerms]).trim() : null,
      validity_days: parseNumberOrNull(row[idx.validity]),
      supplier_part_number: row[idx.supplierPartNumber]
        ? String(row[idx.supplierPartNumber]).trim()
        : null,
      supplier_description: row[idx.supplierDescription]
        ? String(row[idx.supplierDescription]).trim()
        : null,
      weight_kg: parseNumberOrNull(row[idx.weight]),
      length_cm: parseNumberOrNull(row[idx.length]),
      width_cm: parseNumberOrNull(row[idx.width]),
      height_cm: parseNumberOrNull(row[idx.height]),
      is_overweight: parseBooleanFlagOrNull(row[idx.isOverweight]),
      is_oversize: parseBooleanFlagOrNull(row[idx.isOversize]),
    }
  }

  // Новый шаблон (без служебной колонки "Статус")
  const fromTemplateV2 = parseByTemplateIndexes({
    offeredQty: 3,
    supplierPartNumber: 5,
    supplierDescription: 6,
    offer: 7,
    replyStatus: 8,
    price: 9,
    currency: 10,
    lead: 11,
    weight: 12,
    length: 13,
    width: 14,
    height: 15,
    isOverweight: 16,
    isOversize: 17,
    moq: 18,
    packaging: 19,
    incoterms: 20,
    incotermsPlace: 21,
    paymentTerms: 22,
    validity: 23,
    comment: 24,
    selectionKey: 25,
    rfqItemId: 26,
  })
  if (fromTemplateV2) return fromTemplateV2

  // Старый шаблон (со служебной колонкой "Статус")
  const fromTemplateV1 = parseByTemplateIndexes({
    offeredQty: 4,
    supplierPartNumber: 6,
    supplierDescription: 7,
    offer: 8,
    replyStatus: 9,
    price: 10,
    currency: 11,
    lead: 12,
    weight: 13,
    length: 14,
    width: 15,
    height: 16,
    isOverweight: 17,
    isOversize: 18,
    moq: 19,
    packaging: 20,
    incoterms: 21,
    incotermsPlace: 22,
    paymentTerms: 23,
    validity: 24,
    comment: 25,
    selectionKey: 26,
    rfqItemId: 27,
  })
  if (fromTemplateV1) return fromTemplateV1

  const fallbackPrice = parseNumberOrNull(row[1])
  const fallbackCurrency = row[2] ? String(row[2]).trim().toUpperCase() : null
  const fallbackReplyStatus =
    parseSupplierReplyStatus(row[6]) || parseSupplierReplyStatus(row[5]) || "QUOTED"
  const fallbackRequiresPrice = fallbackReplyStatus === "QUOTED"
  if (fallbackRequiresPrice && (fallbackPrice == null || !fallbackCurrency)) return null
  if (!fallbackRequiresPrice && (fallbackPrice != null || fallbackCurrency)) return null

  return {
    rfq_item_id: null,
    line_number: Number(lineNumber),
    selection_key: null,
    price: fallbackRequiresPrice ? Number(fallbackPrice) : null,
    currency: fallbackRequiresPrice ? fallbackCurrency : null,
    supplier_reply_status: fallbackReplyStatus,
    offered_qty: null,
    lead_time_days: parseNumberOrNull(row[3]),
    note: row[4] ? String(row[4]).trim() : null,
    offer_type: parseOfferType(row[5]) || parseOfferType(row[6]),
    moq: parseNumberOrNull(row[6]),
    packaging: row[7] ? String(row[7]).trim() : null,
    incoterms: row[17] ? String(row[17]).trim().toUpperCase() : null,
    incoterms_place: row[18] ? String(row[18]).trim() : null,
    payment_terms: row[19] ? String(row[19]).trim() : null,
    validity_days: parseNumberOrNull(row[8]),
    supplier_part_number: row[9] ? String(row[9]).trim() : null,
    supplier_description: row[10] ? String(row[10]).trim() : null,
    weight_kg: parseNumberOrNull(row[11]),
    length_cm: parseNumberOrNull(row[12]),
    width_cm: parseNumberOrNull(row[13]),
    height_cm: parseNumberOrNull(row[14]),
    is_overweight: parseBooleanFlagOrNull(row[15]),
    is_oversize: parseBooleanFlagOrNull(row[16]),
  }
}

export const parseImportSheetRows = (table) => {
  const rowsTable = Array.isArray(table) ? table : []
  if (!rowsTable.length) return []

  const firstRow = Array.isArray(rowsTable[0]) ? rowsTable[0] : []
  const headerMap = {}
  firstRow.forEach((cell, index) => {
    const field = resolveHeaderField(cell)
    if (field && !Object.prototype.hasOwnProperty.call(headerMap, field)) {
      headerMap[field] = index
    }
  })
  const hasHeader =
    Number.isFinite(headerMap.line_number) &&
    (
      (Number.isFinite(headerMap.price) && Number.isFinite(headerMap.currency)) ||
      Number.isFinite(headerMap.supplier_reply_status)
    )

  return (hasHeader ? rowsTable.slice(1) : rowsTable)
    .map((cells) => (hasHeader ? parseImportRowByHeaderMap(cells, headerMap) : parseImportRow(cells)))
    .filter((row) => row && Number.isFinite(row.line_number))
}

export const parseImportTextRows = (text) =>
  {
    const lines = String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    if (!lines.length) return []

    const table = lines.map((line) => line.split(/\t|;/).map((cell) => String(cell || "").trim()))
    const firstRow = table[0] || []
    const headerMap = {}
    firstRow.forEach((cell, index) => {
      const field = resolveHeaderField(cell)
      if (field && !Object.prototype.hasOwnProperty.call(headerMap, field)) {
        headerMap[field] = index
      }
    })
    const hasHeader =
      Number.isFinite(headerMap.line_number) &&
      (
        (Number.isFinite(headerMap.price) && Number.isFinite(headerMap.currency)) ||
        Number.isFinite(headerMap.supplier_reply_status)
      )

    return parseImportSheetRows(table)
  }
