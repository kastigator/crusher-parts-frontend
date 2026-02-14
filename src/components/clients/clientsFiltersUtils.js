const normalize = (raw = {}) => {
  const f = raw || {}
  return {
    has_phone: !!f.has_phone,
    has_email: !!f.has_email,
    has_tax_id: !!f.has_tax_id,
    has_website: !!f.has_website,
  }
}

export const countActiveFilters = (filters) => {
  const f = normalize(filters)
  let n = 0
  if (f.has_phone) n++
  if (f.has_email) n++
  if (f.has_tax_id) n++
  if (f.has_website) n++
  return n
}
