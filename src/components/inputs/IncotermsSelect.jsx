import * as React from "react"
import VirtualizedAutocomplete from "./VirtualizedAutocomplete"

const INCOTERMS = [
  { code: "EXW", name: "Ex Works" },
  { code: "FCA", name: "Free Carrier" },
  { code: "CPT", name: "Carriage Paid To" },
  { code: "CIP", name: "Carriage and Insurance Paid To" },
  { code: "DAP", name: "Delivered at Place" },
  { code: "DPU", name: "Delivered at Place Unloaded" },
  { code: "DDP", name: "Delivered Duty Paid" },
  { code: "FAS", name: "Free Alongside Ship" },
  { code: "FOB", name: "Free on Board" },
  { code: "CFR", name: "Cost and Freight" },
  { code: "CIF", name: "Cost, Insurance and Freight" },
]

export default function IncotermsSelect({
  value,      // строка, например 'DAP'
  onChange,   // вернёт код или null
  ...rest
}) {
  const options = INCOTERMS
  const selected = React.useMemo(() => {
    if (!value) return null
    const code = String(value).toUpperCase()
    return options.find(o => o.code === code) ?? null
  }, [value])

  return (
    <VirtualizedAutocomplete
      options={options}
      value={selected}
      onChange={(opt) => onChange?.(opt ? opt.code : null)}
      getOptionLabel={(o) => (o?.code ? `${o.code} — ${o.name}` : "")}
      isOptionEqualToValue={(o, v) => o.code === v.code}
      placeholder="Incoterms 2020"
      {...rest}
    />
  )
}
