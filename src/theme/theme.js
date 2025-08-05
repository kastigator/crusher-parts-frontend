// src/theme/theme.js

import { createTheme } from '@mui/material/styles'

const muiTheme = createTheme({
  typography: {
    fontSize: 13,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    body1: {
      fontSize: 13,
    },
  },
  shape: {
    borderRadius: 8,
  },
  palette: {
    primary: {
      main: '#2563eb',
    },
    background: {
      default: '#ffffff',
    },
    text: {
      primary: '#1f2937',
    },
  },
  components: {
    MuiTable: {
      styleOverrides: {
        root: {
          borderColor: '#e0e0e0',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
})

export default muiTheme
