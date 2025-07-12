// components/common/PhoneField.jsx
import React from 'react'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import PhoneIcon from '@mui/icons-material/Phone'
import { IconButton, Tooltip, Box, Typography, TextField } from '@mui/material'
import { parsePhoneNumberFromString } from 'libphonenumber-js'

export function formatPhone(raw) {
  const parsed = parsePhoneNumberFromString(raw || '', 'BY')
  return parsed ? parsed.formatInternational() : raw
}

export function normalizePhoneInput(input) {
  input = input.replace(/[^+\d]/g, '')
  if (!input.startsWith('+')) input = '+' + input
  return input.slice(0, 13)
}

export default function PhoneField({ value, onChange, readOnly = false, emptyText = '—', ...props }) {
  if (readOnly) {
    if (!value) return <span>{emptyText}</span>
    const formatted = formatPhone(value)
    const copyToClipboard = () => navigator.clipboard.writeText(value)

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PhoneIcon fontSize="small" color="action" />
        <a href={`tel:${value}`} style={{ color: '#1976d2', textDecoration: 'none' }}>
          <Typography variant="body2">{formatted}</Typography>
        </a>
        <Tooltip title="Скопировать номер">
          <IconButton size="small" onClick={copyToClipboard}>
            <ContentCopyIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
      </Box>
    )
  }

  return (
    <TextField
      {...props}
      fullWidth
      size="small"
      placeholder="Телефон"
      value={value || ''}
      onChange={(e) => onChange(normalizePhoneInput(e.target.value))}
    />
  )
}
