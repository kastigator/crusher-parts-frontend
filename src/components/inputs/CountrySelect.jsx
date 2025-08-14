import * as React from "react"
import countriesLib from "i18n-iso-countries"
import ru from "i18n-iso-countries/langs/ru.json"
import en from "i18n-iso-countries/langs/en.json"
import VirtualizedAutocomplete from "./VirtualizedAutocomplete"

countriesLib.registerLocale(ru)
countriesLib.registerLocale(en)

const buildOptions = (locale = "ru") =>
  Object.entries(countriesLib.getNames(locale)).map(([code, label]) => ({
    code, label
  }))

const OPTIONS_RU = buildOptions("ru")
const OPTIONS_EN = buildOptions("en")

export default function CountrySelect({
  value,          // строка ISO2, например 'FI'
  onChange,       // вернёт строку ISO2 или null
  locale = "ru",
  ...rest
}) {
  const options = locale === "en" ? OPTIONS_EN : OPTIONS_RU

  const selected = React.useMemo(() => {
    if (!value) return null
    const code = String(value).toUpperCase()
    return options.find(o => o.code === code) ?? null
  }, [value, options])

  return (
    <VirtualizedAutocomplete
      options={options}
      value={selected}
      onChange={(opt) => onChange?.(opt ? opt.code : null)}
      getOptionLabel={(o) => (o?.label ?? "")}
      isOptionEqualToValue={(o, v) => o.code === v.code}
      placeholder="Страна (ISO2)"
      {...rest}
    />
  )
}
