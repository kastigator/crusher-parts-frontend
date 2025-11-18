// src/components/inputs/CountrySelect.jsx
import React from "react"
import { Select } from "antd"
import countriesLib from "i18n-iso-countries"
import ru from "i18n-iso-countries/langs/ru.json"
import en from "i18n-iso-countries/langs/en.json"

countriesLib.registerLocale(ru)
countriesLib.registerLocale(en)

const buildOptions = (locale = "ru") => {
  const names = countriesLib.getNames(locale)
  return Object.entries(names).map(([code, name]) => ({
    value: code,                    // ISO2
    label: `${name} (${code})`,     // что показываем в списке
  }))
}

const OPTIONS_RU = buildOptions("ru")
const OPTIONS_EN = buildOptions("en")

// опционально: хелпер, если потом захочешь показывать полное название в таблицах
export const getCountryLabel = (code, locale = "ru") => {
  if (!code) return ""
  const upper = String(code).toUpperCase()
  const names = countriesLib.getNames(locale)
  return names[upper] || upper
}

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
