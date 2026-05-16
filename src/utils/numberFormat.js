export const formatCompactNumber = (
  value,
  { empty = "—", maximumFractionDigits = 3, minimumFractionDigits = 0 } = {},
) => {
  if (value === null || value === undefined || value === "") return empty
  const number = Number(String(value).replace(",", "."))
  if (!Number.isFinite(number)) return String(value)

  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(number)
}

export const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null
  const number = Number(String(value).replace(",", "."))
  return Number.isFinite(number) ? number : null
}
