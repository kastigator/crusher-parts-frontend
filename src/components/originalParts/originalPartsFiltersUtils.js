const toNumOrNull = (v) => {
  if (v === undefined || v === null || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const normalizeFilters = (raw = {}) => {
  const f = raw || {}
  return {
    weight_min: toNumOrNull(f.weight_min),
    weight_max: toNumOrNull(f.weight_max),
    length_min: toNumOrNull(f.length_min),
    length_max: toNumOrNull(f.length_max),
    width_min: toNumOrNull(f.width_min),
    width_max: toNumOrNull(f.width_max),
    height_min: toNumOrNull(f.height_min),
    height_max: toNumOrNull(f.height_max),
    has_drawing: !!f.has_drawing,
    is_overweight: !!f.is_overweight,
    is_oversize: !!f.is_oversize,
    material_mode: f.material_mode === "any" ? "any" : "default",
    material_id: toNumOrNull(f.material_id),
    bom_material_depth: f.bom_material_depth === "direct" ? "direct" : "any",
    bom_material_mode: f.bom_material_mode === "any" ? "any" : "default",
    bom_material_id: toNumOrNull(f.bom_material_id),
  }
}

export const countActiveFilters = (filters) => {
  const f = normalizeFilters(filters)
  let n = 0
  ;[
    "weight_min",
    "weight_max",
    "length_min",
    "length_max",
    "width_min",
    "width_max",
    "height_min",
    "height_max",
    "material_id",
    "bom_material_id",
  ].forEach((k) => {
    if (f[k] != null) n += 1
  })
  if (f.has_drawing) n += 1
  if (f.is_overweight) n += 1
  if (f.is_oversize) n += 1
  return n
}
