// src/components/common/fieldRenderers.js

import React from "react"
import { TextField, Box, Typography, Tooltip, IconButton } from "@mui/material"
import PlaceAddressInput from "@/components/inputs/PlaceAddressInput"
import FullAddressField from "@/components/fields/FullAddressField"
import EmailIcon from "@mui/icons-material/Email"
import PhoneIcon from "@mui/icons-material/Phone"
import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import { parsePhoneNumberFromString } from "libphonenumber-js"
import ValueDisplay from "./ValueDisplay"

const formatPhone = (raw) => {
  const str = typeof raw === 'string' ? raw : String(raw || '').trim()
  if (!str) return '—'
  try {
    const parsed = parsePhoneNumberFromString(str, 'BY')
    return parsed ? parsed.formatInternational() : str
  } catch {
    return str
  }
}

export const fieldRenderers = {
  // 📍 Адрес
  address: {
    display: (input) => {
      const value = typeof input === "object" && input !== null ? input.value : input
      const comment = typeof input === "object" && input !== null ? input?.row?.comment : ""
      return <FullAddressField address={value} comment={comment} />
    },
    editor: (value = "", onChange, error, required) => (
      <PlaceAddressInput
        value={value}
        onChange={onChange}
        error={error}
        required={required}
      />
    )
  },

  // 📧 Email
  email: {
    display: (value = '') => {
      if (!value) return '—'
      const copyToClipboard = () => navigator.clipboard.writeText(value)

      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, whiteSpace: 'nowrap' }}>
          <EmailIcon fontSize="small" color="action" />
          <a href={`mailto:${value}`} style={{ color: '#1976d2', textDecoration: 'none' }}>
            <Typography variant="body2" noWrap>{value}</Typography>
          </a>
          <Tooltip title="Скопировать email">
            <IconButton size="small" onClick={copyToClipboard}>
              <ContentCopyIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    },
    editor: (value = "", onChange) => (
      <TextField
        type="email"
        fullWidth
        size="small"
        placeholder="Email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  },

  // 📞 Телефон
  phone: {
    display: (value = '') => {
      if (!value) return '—'
      const formatted = formatPhone(value)
      const copyToClipboard = () => navigator.clipboard.writeText(value)

      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, whiteSpace: 'nowrap' }}>
          <PhoneIcon fontSize="small" color="action" />
          <a href={`tel:${value}`} style={{ color: '#1976d2', textDecoration: 'none' }}>
            <Typography variant="body2" noWrap>{formatted}</Typography>
          </a>
          <Tooltip title="Скопировать номер">
            <IconButton size="small" onClick={copyToClipboard}>
              <ContentCopyIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    },
    editor: (value = "", onChange) => {
      const normalize = input => {
        input = input.replace(/[^+\d]/g, '')
        if (!input.startsWith('+')) input = '+' + input
        return input.slice(0, 13)
      }

      return (
        <TextField
          fullWidth
          size="small"
          placeholder="Телефон"
          value={value}
          onChange={(e) => onChange(normalize(e.target.value))}
        />
      )
    }
  },

  // 💱 Валюта
  currency: {
    display: (value) => <ValueDisplay type="currency" value={value} currency="RUB" />,
    editor: (value = "", onChange) => (
      <TextField
        fullWidth
        size="small"
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  },

  // ⏱ Дата+время
  datetime: {
    display: (value) => <ValueDisplay type="datetime" value={value} />
  },

  // ✅ Статус (Chip)
  status: {
    display: (value) => <ValueDisplay type="status" value={value} />
  },

  // 📊 Boolean (✔️ / —)
  boolean: {
    display: (value) => <ValueDisplay type="boolean" value={value} />
  },

  // 📦 ТН ВЭД код
  tnved: {
    display: (value) => <ValueDisplay type="tnved" value={value} />
  },

  // 🏦 Банковские реквизиты
  bankAccount: {
    display: (value) => <ValueDisplay type="bankAccount" value={value} />
  }
}
