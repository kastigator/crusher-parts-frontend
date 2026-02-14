export const fmtMoney = (v, cur) =>
  v == null || Number.isNaN(Number(v)) ? "—" : `${Number(v).toFixed(2)} ${cur || ""}`

export const toNum = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export const roundUp = (value, step) => {
  const base = toNum(value)
  const stepNum = toNum(step)
  if (base == null) return null
  if (!stepNum || stepNum <= 0) return base
  return Math.ceil(base / stepNum) * stepNum
}

export const getItemMetrics = (item) => {
  const qty = toNum(item?.requested_qty) ?? 1
  const unitWeight = toNum(item?.weight_kg ?? item?.op_weight_kg)
  const weightKg = unitWeight != null && unitWeight > 0 ? unitWeight * qty : null
  const length = toNum(item?.length_cm ?? item?.op_length_cm)
  const width = toNum(item?.width_cm ?? item?.op_width_cm)
  const height = toNum(item?.height_cm ?? item?.op_height_cm)
  const unitVolumeCbm =
    length != null && width != null && height != null && length > 0 && width > 0 && height > 0
      ? (length * width * height) / 1e6
      : null
  const volumeCbm = unitVolumeCbm != null ? unitVolumeCbm * qty : null
  return {
    qty,
    unit_weight_kg: unitWeight,
    weight_kg: weightKg,
    unit_volume_cbm: unitVolumeCbm,
    volume_cbm: volumeCbm,
  }
}

export const computeRouteLogistics = (route, item) => {
  if (!route) return { amount: null, currency: null, meta: null }
  const model = (route.pricing_model || "fixed").toLowerCase()
  const ratePerKg = toNum(route.rate_per_kg)
  const ratePerCbm = toNum(route.rate_per_cbm)
  const minCost = toNum(route.min_cost)
  const volCoef = toNum(route.volumetric_kg_per_cbm) ?? 167
  const roundKg = toNum(route.round_step_kg)
  const roundCbm = toNum(route.round_step_cbm)

  const metrics = getItemMetrics(item)
  const weightTotal = toNum(metrics.weight_kg)
  const volumeTotal = toNum(metrics.volume_cbm)
  const roundedWeight = weightTotal != null ? roundUp(weightTotal, roundKg) : null
  const roundedVolume = volumeTotal != null ? roundUp(volumeTotal, roundCbm) : null

  let baseCost = null
  let chargeableKg = null
  let chargeableCbm = null
  let volumetricWeight = null

  if (model === "fixed") {
    baseCost = toNum(route.cost)
  } else if (model === "per_kg") {
    chargeableKg = roundedWeight
    baseCost = chargeableKg != null && ratePerKg != null ? chargeableKg * ratePerKg : null
  } else if (model === "per_cbm") {
    chargeableCbm = roundedVolume
    baseCost = chargeableCbm != null && ratePerCbm != null ? chargeableCbm * ratePerCbm : null
  } else if (model === "per_kg_or_cbm_max") {
    volumetricWeight = roundedVolume != null ? roundedVolume * volCoef : null
    if (roundedWeight != null && volumetricWeight != null) {
      chargeableKg = Math.max(roundedWeight, volumetricWeight)
    } else {
      chargeableKg = roundedWeight != null ? roundedWeight : volumetricWeight
    }
    if (chargeableKg != null && ratePerKg != null) {
      baseCost = chargeableKg * ratePerKg
    } else if (roundedVolume != null && ratePerCbm != null) {
      baseCost = roundedVolume * ratePerCbm
    }
  }

  if (baseCost != null && minCost != null && baseCost < minCost) {
    baseCost = minCost
  }

  return {
    amount: baseCost,
    currency: route.currency || null,
    meta: {
      pricing_model: model,
      rate_per_kg: ratePerKg,
      rate_per_cbm: ratePerCbm,
      min_cost: minCost,
      volumetric_kg_per_cbm: volCoef,
      round_step_kg: roundKg,
      round_step_cbm: roundCbm,
      qty: metrics.qty,
      unit_weight_kg: metrics.unit_weight_kg,
      weight_kg: metrics.weight_kg,
      unit_volume_cbm: metrics.unit_volume_cbm,
      volume_cbm: metrics.volume_cbm,
      chargeable_kg: chargeableKg,
      chargeable_cbm: chargeableCbm,
      volumetric_weight_kg: volumetricWeight,
      base_cost: baseCost,
    },
  }
}

export const OFFER_STATUS_META = {
  draft: { color: "default", label: "Черновик" },
  proposed: { color: "processing", label: "Предложен" },
  approved: { color: "success", label: "Выбран" },
  rejected: { color: "error", label: "Отклонён" },
}

export const INITIAL_FORM = {
  supplier_part_id: null,
  supplier_part_number: "",
  supplier_part_description: "",
  supplier_price: null,
  supplier_currency: "USD",
  lead_time_days: null,
  logistics_route_id: null,
  logistics_cost: null,
  logistics_currency: null,
  moq: null,
  packaging: "",
  markup_pct: null,
  markup_abs: null,
  material_id: null,
  client_price: null,
  client_currency: "USD",
  status: "draft",
  comment_internal: "",
  comment_client: "",
  client_visible: false,
}

export const normalizeOfferStatus = (status) =>
  status ? String(status).trim().toLowerCase() : "draft"

export const statusMakesVisible = (status) =>
  ["proposed", "approved"].includes(normalizeOfferStatus(status))

export const isOfferVisible = (offer) =>
  !!offer?.client_visible || statusMakesVisible(offer?.status)
