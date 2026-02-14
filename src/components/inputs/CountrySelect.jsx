// src/components/inputs/CountrySelect.jsx
import React from "react"
import { Select } from "antd"
import { OPTIONS_EN, OPTIONS_RU } from "./countryUtils"

export default function CountrySelect({
  value,          // строка ISO2, например 'FI'
  onChange,       // вернёт строку ISO2 или null
  locale = "ru",
  style,
  ...rest
}) {
  const options = locale === "en" ? OPTIONS_EN : OPTIONS_RU
  const current = value ? String(value).toUpperCase() : undefined

  return (
    <Select
      showSearch
      allowClear
      placeholder="Страна"
      size="small"                 // чтобы по высоте совпадал с Input
      value={current}
      options={options}
      optionFilterProp="label"     // поиск по названию страны
      onChange={(val) => onChange?.(val || null)}
      style={{ minWidth: 180, ...style }}
      {...rest}
    />
  )
}
