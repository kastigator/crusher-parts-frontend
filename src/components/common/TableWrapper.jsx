import React from 'react'
import { Paper, Typography, Box } from '@mui/material'

export default function TableWrapper({ title, children }) {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        mt: 4,
        minWidth: 1200,
        overflowX: 'clip',
        backgroundColor: '#fff'
      }}
    >
      {title && (
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          {title}
        </Typography>
      )}
      <Box>
        {children}
      </Box>
    </Paper>
  )
}
