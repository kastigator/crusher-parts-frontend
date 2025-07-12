import React from 'react'
import { Box } from '@mui/material'

const IframeView = ({ url }) => {
  return (
    <Box sx={{ width: '100%', height: 'calc(100vh - 100px)' }}>
      <iframe
        src={url}
        width="100%"
        height="100%"
        frameBorder="0"
        title="Встроенный контент"
        style={{ borderRadius: 8 }}
      />
    </Box>
  )
}

export default IframeView
