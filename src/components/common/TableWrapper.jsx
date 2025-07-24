// src/components/common/TableWrapper.jsx

import React from 'react'
import { Paper, Typography, Stack } from '@mui/material'
export default function TableWrapper({ title, children, sx = {}, extraActions = [] }) {
  const actions = React.Children.toArray(extraActions)
  const hasHeader = title || actions.length > 0

  return (
    <Paper sx={{ p: 2, mt: 2, overflowX: 'auto', ...sx }}>
      {hasHeader && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          {title && (
            <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
              {title}
            </Typography>
          )}
          {actions.length > 0 && (
            <Stack direction="row" spacing={1} alignItems="center">
              {actions}
            </Stack>
          )}
        </Stack>
      )}
      {children}
    </Paper>
  )
}
