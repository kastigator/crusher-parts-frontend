import React from 'react'
import { Chip, Link } from '@mui/material'

// Карта статусов → подпись и цвет
const STATUS_MAP = {
  new:       { label: 'Новая',        color: 'info' },
  pending:   { label: 'Ожидает',      color: 'warning' },
  approved:  { label: 'Подтверждена', color: 'success' },
  rejected:  { label: 'Отклонена',    color: 'error' },
  done:      { label: 'Завершена',    color: 'default' },
  draft:     { label: 'Черновик',     color: 'default' }
}

// Формат даты
const formatDate = (val) => {
  try {
    return new Date(val).toLocaleDateString('ru-RU')
  } catch {
    return '—'
  }
}

// Формат времени
const formatTime = (val) => {
  try {
    const date = new Date(val)
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
}

// Формат дата+время
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

// Формат валюты
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
  currency
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
      return `${parseFloat(value)}%`

    case 'currency':
      return formatCurrency(value, currency || 'RUB')

    case 'array':
      return Array.isArray(value) && value.length > 0 ? value.join(', ') : emptySymbol

    case 'number':
      return isNaN(Number(value)) ? emptySymbol : value

    case 'status': {
      const status = STATUS_MAP[value] || { label: String(value), color: 'default' }
      return <Chip label={status.label} size="small" color={status.color} />
    }

    case 'link':
      return (
        <Link href={value} target="_blank" rel="noopener noreferrer" underline="hover">
          {value}
        </Link>
      )

    case 'text':
    default:
      return String(value)
  }
}
