const toNumOrNull = (v) => {
  if (v === undefined || v === null || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const normalize = (raw = {}) => {
  const f = raw || {}
  return {
    can_oem: !!f.can_oem,
    can_analog: !!f.can_analog,
    has_contact: !!f.has_contact,
    has_address: !!f.has_address,
    risk_level: f.risk_level || "",
    reliability_min: toNumOrNull(f.reliability_min),
    reliability_max: toNumOrNull(f.reliability_max),
    lead_time_min: toNumOrNull(f.lead_time_min),
    lead_time_max: toNumOrNull(f.lead_time_max),
    country_q: (f.country_q || "").toString(),
    cap_mode: f.cap_mode || "all",
  }
}

export const countActiveFilters = (filters) => {
  const f = normalize(filters)
  let n = 0
  if (f.can_oem) n++
  if (f.can_analog) n++
  if (f.has_contact) n++
  if (f.has_address) n++
  if (f.risk_level) n++
  ;["reliability_min", "reliability_max", "lead_time_min", "lead_time_max"].forEach((k) => {
    if (f[k] != null) n++
  })
  if (String(f.country_q ?? "").trim()) n++
  return n
}
