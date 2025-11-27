// src/components/inputs/CurrencySelect.jsx
import React, { useMemo } from "react"
import { Select } from "antd"
import cc from "currency-codes"

// Базовый список валют из currency-codes
const ALL_OPTIONS = cc
  .codes()
  .map((code) => {
    const info = cc.code(code)
    return {
      value: code, // ISO 4217 (например, "RUB")
      label: `${code} — ${info?.currency || code}`,
    }
  })
  .sort((a, b) => a.value.localeCompare(b.value))

/**
 * Универсальный селект валют.
 *
 * Особенности:
 *  - полный список ISO валют из currency-codes;
 *  - популярные валюты (RUB, USD, EUR, CNY) идут первыми;
 *  - компактный стиль по умолчанию (size="small");
 *  - поиск по коду и названию;
 *  - dropdownMatchSelectWidth={false}, чтобы выпадающий список не
 *    ломал вёрстку таблиц.
 */
export default function CurrencySelect({
  value,
  onChange,
  size = "small",
  popularCodes = ["RUB", "USD", "EUR", "CNY"],
  style,
  ...rest
}) {
  const options = useMemo(() => {
    if (!popularCodes || popularCodes.length === 0) return ALL_OPTIONS

    const popularSet = new Set(popularCodes)
    const popular = []
    const others = []

    ALL_OPTIONS.forEach((opt) => {
      if (popularSet.has(opt.value)) popular.push(opt)
      else others.push(opt)
    })

    return [...popular, ...others]
  }, [popularCodes])

  const normalized = value || null

  return (
    <Select
      showSearch
      size={size}
      value={normalized}
      onChange={(v) => onChange?.(v ?? null)}
      options={options}
      optionFilterProp="label"
      // чтобы дропдаун не был слишком огромным
      listHeight={320}
      // и не подгонялся строго под ширину инпута (удобно в таблицах)
      dropdownMatchSelectWidth={false}
      style={{ minWidth: 160, ...style }}
      {...rest}
    />
  )
}
