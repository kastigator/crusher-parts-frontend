const UOM_LABELS = {
  pcs: "шт",
  pc: "шт",
  ea: "шт",
  each: "шт",
  kg: "кг",
  g: "г",
  t: "т",
  m: "м",
  cm: "см",
  mm: "мм",
  m2: "м²",
  "m²": "м²",
  m3: "м³",
  "m³": "м³",
  l: "л",
  day: "дн.",
  set: "компл.",
  kit: "компл.",
  compl: "компл.",
  "компл": "компл.",
  "компл.": "компл.",
  kw: "кВт",
  v: "В",
  hz: "Гц",
  rpm: "об/мин",
  a: "А",
  nm: "Н·м",
  bar: "bar",
  mpa: "МПа",
  celsius: "°C",
  percent: "%",
  шт: "шт",
  кг: "кг",
  г: "г",
  т: "т",
  м: "м",
  см: "см",
  мм: "мм",
  "м²": "м²",
  "м³": "м³",
  л: "л",
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
