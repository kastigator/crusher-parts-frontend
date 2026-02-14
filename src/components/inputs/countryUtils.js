import countriesLib from "i18n-iso-countries"
import ru from "i18n-iso-countries/langs/ru.json"
import en from "i18n-iso-countries/langs/en.json"

countriesLib.registerLocale(ru)
countriesLib.registerLocale(en)

const buildOptions = (locale = "ru") => {
  const names = countriesLib.getNames(locale)
  return Object.entries(names).map(([code, name]) => ({
    value: code,
    label: `${name} (${code})`,
  }))
}

export const OPTIONS_RU = buildOptions("ru")
export const OPTIONS_EN = buildOptions("en")

export const getCountryLabel = (code, locale = "ru") => {
  if (!code) return ""
  const upper = String(code).toUpperCase()
  const names = countriesLib.getNames(locale)
  return names[upper] || upper
}
