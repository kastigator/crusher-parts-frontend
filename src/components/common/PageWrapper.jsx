import React from 'react'
import { Box } from '@mui/material'

const PageWrapper = ({ children }) => {
  return (
    <Box
      sx={{
        minWidth: 1200,
        display: 'inline-block',
        overflowX: 'visible',
        pt: 3,
        pb: 3
      }}
    >
      {children}
    </Box>
  )
}

export default PageWrapper
