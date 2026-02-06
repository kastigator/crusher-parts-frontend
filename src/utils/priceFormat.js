export const formatPrice = (value) => {
  if (value === null || value === undefined || value === "") return null
  const n = Number(value)
  if (!Number.isFinite(n)) return String(value)
  return n.toFixed(2)
}

export const formatPriceWithCurrency = (value, currency, { empty = "—" } = {}) => {
  const p = formatPrice(value)
  if (p === null) return empty
  const cur = (currency || "").toString().trim()
  return cur ? `${p} ${cur}` : p
}
