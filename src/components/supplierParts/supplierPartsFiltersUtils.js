export function countActiveFilters(filters = {}) {
  const f = filters || {}
  let n = 0

  const has = (v) => v !== undefined && v !== null && v !== ""

  ;[
    "part_type",
    "weight_min",
    "weight_max",
    "lead_time_min",
    "lead_time_max",
    "moq_min",
    "moq_max",
    "length_min",
    "length_max",
    "width_min",
    "width_max",
    "height_min",
    "height_max",
  ].forEach((k) => {
    if (has(f[k])) n++
  })

  const catalogLinksMode = f?.catalog_links_mode
  if (has(catalogLinksMode) && catalogLinksMode !== "any") n++
  if (f?.is_overweight) n++
  if (f?.is_oversize) n++

  if (has(f?.material_id)) n++
  if (has(f?.material_id) && has(f?.material_mode) && f.material_mode !== "any") n++

  return n
}
