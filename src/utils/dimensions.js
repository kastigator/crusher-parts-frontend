export const toNumericOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null
  const n = Number(String(value).replace(",", "."))
  return Number.isFinite(n) ? n : null
}

export const cmToMm = (value) => {
  const n = toNumericOrNull(value)
  if (n === null) return null
  return Number((n * 10).toFixed(3))
}

export const mmToCm = (value) => {
  const n = toNumericOrNull(value)
  if (n === null) return null
  return Number((n / 10).toFixed(3))
}
