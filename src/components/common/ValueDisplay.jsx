// src/components/common/ValueDisplay.jsx

import React from 'react'
import { Chip, Link } from '@mui/material'

const STATUS_MAP = {
  new:       { label: 'Новая',        color: 'info' },
  pending:   { label: 'Ожидает',      color: 'warning' },
  approved:  { label: 'Подтверждена', color: 'success' },
  rejected:  { label: 'Отклонена',    color: 'error' },
  done:      { label: 'Завершена',    color: 'default' },
  draft:     { label: 'Черновик',     color: 'default' }
}

const formatDate = (val) => {
  try {
    return new Date(val).toLocaleDateString('ru-RU')
  } catch {
    return '—'
  }
}

const formatTime = (val) => {
  try {
    const date = new Date(val)
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
}

const formatDateTime = (val) => {
  try {
    const date = new Date(val)
    return `${date.toLocaleDateString('ru-RU')} ${date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    })}`
  } catch {
    return '—'
  }
}

const formatCurrency = (val, currency = 'RUB') => {
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(val)
  } catch {
    return val
  }
}

export default function ValueDisplay({
  value,
  type = 'text',
  emptySymbol = '—',
  currency,
  href
}) {
  if (value === null || value === undefined || value === '') return emptySymbol

  switch (type) {
    case 'date':
      return formatDate(value)

    case 'time':
      return formatTime(value)

    case 'datetime':
      return formatDateTime(value)

    case 'boolean':
      return value ? '✔️' : emptySymbol

    case 'percent':
      return `${parseFloat(value).toFixed(2)}%`

    case 'currency': {
      const known = ['RUB', 'USD', 'EUR', 'CNY']
      const cur = known.includes(currency) ? currency : 'RUB'
      return formatCurrency(value, cur)
    }

    case 'array':
      return Array.isArray(value) && value.length > 0 ? value.join(', ') : emptySymbol

    case 'number':
      return isNaN(Number(value)) ? emptySymbol : value

    case 'status': {
      const key = String(value).toLowerCase()
      const status = STATUS_MAP[key] || { label: String(value), color: 'default' }
      return <Chip label={status.label} size="small" color={status.color} />
    }

    case 'link':
      return (
        <Link
          href={href || value}
          target="_blank"
          rel="noopener noreferrer"
          underline="hover"
        >
          {String(value)}
        </Link>
      )

    case 'tnved':
      return String(value).replace(/\s+/g, '')

    case 'bankAccount': {
      if (!value || typeof value !== 'object') return emptySymbol
      const { bank_name, bic, account_number } = value
      return `${bank_name || ''} (${bic || ''}) / ${account_number || ''}`
    }

    case 'text':
    default:
      return String(value)
  }
}
