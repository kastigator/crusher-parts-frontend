// src/components/common/TableWrapper.jsx

import React from 'react'
import { Paper, Typography } from '@mui/material'

export default function TableWrapper({ title, children, sx = {} }) {
  return (
    <Paper sx={{ p: 2, mt: 2, overflowX: 'auto', ...sx }}>
      {title && (
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
      )}
      {children}
    </Paper>
  )
}
