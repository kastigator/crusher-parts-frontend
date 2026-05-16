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

export const formatInputNumberValue = (value) => {
  if (value === null || value === undefined || value === "") return ""
  const str = String(value).replace(",", ".")
  return str.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "").replace(/\.$/, "")
}

export const parseInputNumberValue = (value) => {
  if (value === null || value === undefined || value === "") return ""
  return String(value).replace(",", ".")
}

export const compactInputNumberProps = {
  formatter: formatInputNumberValue,
  parser: parseInputNumberValue,
}
