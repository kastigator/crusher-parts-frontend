// src/components/common/ValueDisplay.jsx
// Унифицированный вывод значений с обрезкой текста и тултипом по переполнению.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { Tag, Tooltip, Typography } from "antd"
import { parsePhoneNumberFromString } from "libphonenumber-js"
import { formatCompactNumber } from "@/utils/numberFormat"

const STATUS_MAP = {
  new: { label: "Новый", color: "blue" },
  pending: { label: "Ожидает", color: "orange" },
  approved: { label: "Одобрено", color: "green" },
  rejected: { label: "Отклонено", color: "red" },
  done: { label: "Выполнено", color: "default" },
  draft: { label: "Черновик", color: "default" },
}

const DEFAULT_PHONE_REGION = "RU"

const formatDate = (val) => {
  try {
    return new Date(val).toLocaleDateString("ru-RU")
  } catch {
    return "-"
  }
}

const formatTime = (val) => {
  try {
    return new Date(val).toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "-"
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
    return "-"
  }
}

const formatCurrency = (val, currency = "RUB") => {
  try {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val)
  } catch {
    return val
  }
}

const formatPhone = (value, defaultRegion = DEFAULT_PHONE_REGION) => {
  if (!value) return ""

  const raw = String(value).trim()

  try {
    const phone = raw.startsWith("+")
      ? parsePhoneNumberFromString(raw)
      : parsePhoneNumberFromString(raw, defaultRegion)

    if (!phone) return raw
    return phone.formatInternational()
  } catch {
    return raw
  }
}

const EllipsisText = ({
  text,
  onDoubleClick,
  copyable,
  maxLength, // опционально: мягко обрезать длинные значения перед рендером
}) => {
  const spanRef = useRef(null)
  const [overflow, setOverflow] = useState(false)

  const rendered = useMemo(() => {
    if (!text && text !== 0) return ""
    const str = String(text)
    if (maxLength && str.length > maxLength) {
      return `${str.slice(0, maxLength)}…`
    }
    return str
  }, [text, maxLength])

  const measure = useCallback(() => {
    const el = spanRef.current
    if (!el) return
    const hasOverflow = el.scrollWidth - el.clientWidth > 1
    setOverflow(hasOverflow)
  }, [])

  useEffect(() => {
    measure()
  }, [rendered, measure])

  useEffect(() => {
    const el = spanRef.current
    if (!el) return

    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    window.addEventListener("resize", measure)

    return () => {
      ro.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [measure])

  const inner = (
    <span
      ref={spanRef}
      className="cell-ellipsis"
      style={{
        display: "inline-block",
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        verticalAlign: "middle",
      }}
      onDoubleClick={onDoubleClick}
    >
      {rendered}
    </span>
  )

  const content = copyable ? (
    <Typography.Text
      style={{ margin: 0 }}
      copyable={{ text: String(text ?? "") }}
    >
      {inner}
    </Typography.Text>
  ) : (
    inner
  )

  return <Tooltip title={overflow ? String(text) : null}>{content}</Tooltip>
}

export default function ValueDisplay({
  value,
  type = "text",
  emptySymbol = "-",
  currency,
  href,
  maxLength,
  maximumFractionDigits = 3,
  onDoubleClick,
  copyable = false,
}) {
  if (value === null || value === undefined || value === "") return emptySymbol

  const safeStr = (val) => {
    try {
      return String(val)
    } catch {
      return emptySymbol
    }
  }

  switch (type) {
    case "date":
      return formatDate(value)

    case "time":
      return formatTime(value)

    case "datetime":
      return formatDateTime(value)

    case "boolean":
      return value ? "Да" : emptySymbol

    case "percent":
      return `${parseFloat(value).toFixed(2)}%`

    case "currency": {
      const known = ["RUB", "USD", "EUR", "CNY"]
      const cur = known.includes(currency) ? currency : "RUB"
      return formatCurrency(value, cur)
    }

    case "array":
      return (
        <EllipsisText
          text={Array.isArray(value) ? value.join(", ") : ""}
          onDoubleClick={onDoubleClick}
          copyable={copyable}
          maxLength={maxLength}
        />
      )

    case "number":
      return formatCompactNumber(value, { empty: emptySymbol, maximumFractionDigits })

    case "status": {
      const key = safeStr(value).toLowerCase()
      const status =
        STATUS_MAP[key] || { label: safeStr(value), color: "default" }
      return <Tag color={status.color}>{status.label}</Tag>
    }

    case "email": {
      const str = safeStr(value)
      return (
        <Tooltip title={str}>
          <a
            href={`mailto:${str}`}
            onDoubleClick={onDoubleClick}
            className="cell-ellipsis"
            style={{ display: "inline-block", maxWidth: "100%" }}
          >
            {str}
          </a>
        </Tooltip>
      )
    }

    case "phone": {
      const display = formatPhone(value)
      const raw = safeStr(value)
      return (
        <Tooltip title={display}>
          <a
            href={`tel:${raw}`}
            onDoubleClick={onDoubleClick}
            className="cell-ellipsis"
            style={{ display: "inline-block", maxWidth: "100%" }}
          >
            {display}
          </a>
        </Tooltip>
      )
    }

    case "link": {
      const str = safeStr(value)
      return (
        <Tooltip title={str}>
          <a
            href={href || str}
            target="_blank"
            rel="noopener noreferrer"
            className="cell-ellipsis"
            style={{ display: "inline-block", maxWidth: "100%" }}
          >
            {str}
          </a>
        </Tooltip>
      )
    }

    case "tnved":
      return safeStr(value).replace(/\s+/g, "")

    case "bankAccount": {
      if (!value || typeof value !== "object") return emptySymbol
      const { bank_name, bic, account_number } = value
      return `${bank_name || ""} (${bic || ""}) / ${account_number || ""}`
    }

    case "text":
    default:
      return (
        <EllipsisText
          text={value}
          onDoubleClick={onDoubleClick}
          copyable={copyable}
          maxLength={maxLength}
        />
      )
  }
}
