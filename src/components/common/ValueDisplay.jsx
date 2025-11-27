// src/components/common/ValueDisplay.jsx
// Универсальный компонент отображения значений для таблиц Ant Design.
// Email и телефон кликабельны, телефон форматируется через libphonenumber-js.

import React from "react"
import { Tag, Tooltip, Typography } from "antd"
import { parsePhoneNumberFromString } from "libphonenumber-js"

const STATUS_MAP = {
  new: { label: "Новая", color: "blue" },
  pending: { label: "Ожидает", color: "orange" },
  approved: { label: "Подтверждена", color: "green" },
  rejected: { label: "Отклонена", color: "red" },
  done: { label: "Завершена", color: "default" },
  draft: { label: "Черновик", color: "default" },
}

const DEFAULT_PHONE_REGION = "RU" // базовая страна, если номер без кода

const formatDate = (val) => {
  try {
    return new Date(val).toLocaleDateString("ru-RU")
  } catch {
    return "—"
  }
}

const formatTime = (val) => {
  try {
    return new Date(val).toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "—"
  }
}

const formatDateTime = (val) => {
  try {
    const date = new Date(val)
    return `${date.toLocaleDateString("ru-RU")} ${date.toLocaleTimeString(
      "ru-RU",
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    )}`
  } catch {
    return "—"
  }
}

const formatCurrency = (val, currency = "RUB") => {
  try {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(val)
  } catch {
    return val
  }
}

// Универсальное форматирование телефона через libphonenumber-js
const formatPhone = (value, defaultRegion = DEFAULT_PHONE_REGION) => {
  if (!value) return ""

  const raw = String(value).trim()

  try {
    // если номер уже с +, даём libphonenumber самому определить страну
    const phone = raw.startsWith("+")
      ? parsePhoneNumberFromString(raw)
      : parsePhoneNumberFromString(raw, defaultRegion)

    if (!phone) return raw

    // читаемый международный формат: +375 44 719 52 53
    return phone.formatInternational()
  } catch {
    return raw
  }
}

export default function ValueDisplay({
  value,
  type = "text",
  emptySymbol = "—",
  currency,
  href,
  maxLength = 60,
  onDoubleClick,
}) {
  if (value === null || value === undefined || value === "") return emptySymbol

  const safeStr = (val) => {
    try {
      return String(val)
    } catch {
      return emptySymbol
    }
  }

  const renderWithTooltip = (text) => {
    const str = safeStr(text)
    const isTruncated = str.length > maxLength
    const displayText = isTruncated ? `${str.slice(0, maxLength)}…` : str

    return (
      <Tooltip title={str}>
        <Typography.Text
          style={{ maxWidth: 240 }}
          ellipsis
          onDoubleClick={onDoubleClick}
        >
          {displayText}
        </Typography.Text>
      </Tooltip>
    )
  }

  switch (type) {
    case "date":
      return formatDate(value)

    case "time":
      return formatTime(value)

    case "datetime":
      return formatDateTime(value)

    case "boolean":
      return value ? "✔️" : emptySymbol

    case "percent":
      return `${parseFloat(value).toFixed(2)}%`

    case "currency": {
      const known = ["RUB", "USD", "EUR", "CNY"]
      const cur = known.includes(currency) ? currency : "RUB"
      return formatCurrency(value, cur)
    }

    case "array":
      return renderWithTooltip(Array.isArray(value) ? value.join(", ") : "")

    case "number":
      return isNaN(Number(value)) ? emptySymbol : value

    case "status": {
      const key = safeStr(value).toLowerCase()
      const status =
        STATUS_MAP[key] || { label: safeStr(value), color: "default" }
      return <Tag color={status.color}>{status.label}</Tag>
    }

    case "email":
      return (
        <Tooltip title={value}>
          <a href={`mailto:${value}`} onDoubleClick={onDoubleClick}>
            {safeStr(value)}
          </a>
        </Tooltip>
      )

    case "phone": {
      const display = formatPhone(value)
      return (
        <Tooltip title={display}>
          <a href={`tel:${safeStr(value)}`} onDoubleClick={onDoubleClick}>
            {display}
          </a>
        </Tooltip>
      )
    }

    case "link":
      return (
        <Tooltip title={value}>
          <a href={href || value} target="_blank" rel="noopener noreferrer">
            {safeStr(value)}
          </a>
        </Tooltip>
      )

    case "tnved":
      return safeStr(value).replace(/\s+/g, "")

    case "bankAccount": {
      if (!value || typeof value !== "object") return emptySymbol
      const { bank_name, bic, account_number } = value
      return `${bank_name || ""} (${bic || ""}) / ${account_number || ""}`
    }

    case "text":
    default:
      return renderWithTooltip(value)
  }
}
