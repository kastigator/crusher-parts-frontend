// components/common/EmailField.jsx

import React from 'react'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import EmailIcon from '@mui/icons-material/Email'
import { IconButton, Tooltip, Box, Typography, TextField } from '@mui/material'

export default function EmailField({ value, onChange, readOnly = false, emptyText = '—', ...props }) {
  if (readOnly) {
    if (!value) return <span>{emptyText}</span>
    const copyToClipboard = () => navigator.clipboard.writeText(value)

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minWidth: 0
        }}
      >
        <EmailIcon fontSize="small" color="action" />
        <a
          href={`mailto:${value}`}
          style={{ color: '#1976d2', textDecoration: 'none', overflow: 'hidden' }}
        >
          <Typography variant="body2" noWrap>
            {value}
          </Typography>
        </a>
        <Tooltip title="Скопировать email">
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
      type="email"
      placeholder="Email"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
