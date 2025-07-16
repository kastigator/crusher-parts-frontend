// src/components/common/PageWrapper.jsx

import React from 'react'
import { Box, Typography } from '@mui/material'

const PageWrapper = ({ title, children }) => {
  return (
    <Box
      sx={{
        px: { xs: 2, sm: 3, md: 4 },
        pt: 4,
        pb: 6,
        minWidth: 'fit-content', // 👈 теперь содержимое не сжимается
        width: '100%'
      }}
    >
      {title && (
        <Typography variant="h5" fontWeight={600} gutterBottom>
          {title}
        </Typography>
      )}
      {children}
    </Box>
  )
}

export default PageWrapper
