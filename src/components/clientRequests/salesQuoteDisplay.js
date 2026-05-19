import { formatPriceWithCurrency } from "@/utils/priceFormat"

export const formatDate = (value) => {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("ru-RU")
}

export const quoteStatusLabel = (value) =>
  ({
    draft: "Черновик",
    internal_review: "Внутреннее согласование",
    sent_to_client: "Отправлено клиенту",
    client_approved: "Согласовано клиентом",
    contract_signed: "Контракт подписан",
  }[String(value || "").trim()] || value || "—")

export const canonicalQuoteStatus = (value) =>
  String(value || "").trim().toLowerCase() === "draft"
    ? "internal_review"
    : String(value || "").trim().toLowerCase()

export const isSalesQuoteCommerciallyReady = (row) =>
  Number(row?.active_line_count || 0) > 0 &&
  Number(row?.incomplete_pricing_count || 0) <= 0 &&
  Number(row?.total_sell || 0) > 0

export const formatSalesQuoteLabel = (row, { includeStatus = true, includeAmount = true } = {}) => {
  if (!row) return "КП"
  const chunks = [`КП от ${formatDate(row.created_at)}`]
  if (row.rev_number != null) chunks.push(`ревизия заявки ${row.rev_number}`)
  if (includeStatus) chunks.push(quoteStatusLabel(row.status))
  if (includeAmount) chunks.push(formatPriceWithCurrency(row.total_sell, row.currency || "USD"))
  return chunks.join(" · ")
}
