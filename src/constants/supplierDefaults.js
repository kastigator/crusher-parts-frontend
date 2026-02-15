export const SUPPLIER_DEFAULT_CURRENCY_OPTIONS = [
  { value: "EUR", label: "EUR" },
  { value: "USD", label: "USD" },
  { value: "CNY", label: "CNY" },
  { value: "RUB", label: "RUB" },
  { value: "TRY", label: "TRY" },
  { value: "AED", label: "AED" },
]

export const SUPPLIER_DEFAULT_PAYMENT_TERMS_OPTIONS = [
  { value: "100% предоплата", label: "100% предоплата" },
  {
    value: "30% предоплата / 70% перед отгрузкой",
    label: "30% предоплата / 70% перед отгрузкой",
  },
  {
    value: "50% предоплата / 50% перед отгрузкой",
    label: "50% предоплата / 50% перед отгрузкой",
  },
  { value: "Оплата по факту отгрузки", label: "Оплата по факту отгрузки" },
  { value: "NET 30", label: "Net 30" },
  { value: "NET 45", label: "Net 45" },
  { value: "Аккредитив", label: "Аккредитив" },
  { value: "По договоренности", label: "По договоренности" },
]

export const normalizeSupplierDefaultCurrency = (value) => {
  const raw = String(value || "").trim().toUpperCase()
  if (!raw) return ""
  const allowed = new Set(SUPPLIER_DEFAULT_CURRENCY_OPTIONS.map((opt) => opt.value))
  return allowed.has(raw) ? raw : ""
}

export const normalizeSupplierDefaultPaymentTerms = (value) => {
  const raw = String(value || "").trim()
  if (!raw) return ""
  const upper = raw.toUpperCase().replace(/\s+/g, " ")
  const matched = SUPPLIER_DEFAULT_PAYMENT_TERMS_OPTIONS.find(
    (opt) => String(opt.value || "").toUpperCase().replace(/\s+/g, " ") === upper
  )
  return matched?.value || ""
}
