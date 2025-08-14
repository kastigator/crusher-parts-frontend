import * as React from "react"
import cc from "currency-codes"
import VirtualizedAutocomplete from "./VirtualizedAutocomplete"

const OPTIONS = cc.codes().map(code => {
  const info = cc.code(code)
  return { code, label: info.currency || code }
})

export default function CurrencySelect({
  value,        // строка ISO3, например 'EUR'
  onChange,     // вернёт строку ISO3 или null
  ...rest
}) {
  const selected = React.useMemo(() => {
    if (!value) return null
    const code = String(value).toUpperCase()
    return OPTIONS.find(o => o.code === code) ?? null
  }, [value])

  return (
    <VirtualizedAutocomplete
      options={OPTIONS}
      value={selected}
      onChange={(opt) => onChange?.(opt ? opt.code : null)}
      getOptionLabel={(o) => (o?.code ? `${o.code} — ${o.label}` : "")}
      isOptionEqualToValue={(o, v) => o.code === v.code}
      placeholder="Валюта (ISO3)"
      {...rest}
    />
  )
}
