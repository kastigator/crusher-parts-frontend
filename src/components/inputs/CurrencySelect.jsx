// src/inputs/CurrencySelect.jsx
import React, { useMemo } from "react";
import { Select } from "antd";
import cc from "currency-codes";

// подготовим список один раз
const OPTIONS = cc.codes().map((code) => {
  const info = cc.code(code);
  return {
    value: code,                        // ISO3
    label: `${code} — ${info.currency || code}`,
    search: `${code} ${info.currency || ""}`.toLowerCase(),
  };
});

export default function CurrencySelect({
  value,          // строка ISO3, например 'EUR'
  onChange,       // (val: string | null) => void
  allowClear = true,
  style,
  ...rest
}) {
  // приведение значения к верхнему регистру
  const normalized = useMemo(() => (value ? String(value).toUpperCase() : undefined), [value]);

  return (
    <Select
      showSearch
      allowClear={allowClear}
      placeholder="Валюта (ISO3)"
      value={normalized}
      onChange={(v) => onChange?.(v ?? null)}
      options={OPTIONS}
      // быстрый поиск по коду/названию
      filterOption={(input, option) =>
        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
      }
      // виртуальная прокрутка списка (из коробки в AntD)
      virtual
      style={{ minWidth: 180, ...style }}
      {...rest}
    />
  );
}
