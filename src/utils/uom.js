const UOM_LABELS = {
  pcs: "шт",
  pc: "шт",
  ea: "шт",
  each: "шт",
  kg: "кг",
  set: "компл.",
  kit: "компл.",
  compl: "компл.",
  "компл": "компл.",
  "компл.": "компл.",
  шт: "шт",
  кг: "кг",
}

export const formatUomLabel = (uom) => {
  const raw = String(uom || "").trim()
  if (!raw) return ""
  const normalized = raw.toLowerCase()
  return UOM_LABELS[normalized] || raw
}

export const formatQtyWithUomLabel = (qty, uom) => {
  if (qty == null || qty === "") return "—"
  const qtyText = Number.isInteger(Number(qty)) ? String(Number(qty)) : String(qty)
  const uomLabel = formatUomLabel(uom)
  return uomLabel ? `${qtyText} ${uomLabel}` : qtyText
}
