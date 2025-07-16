// src/theme/theme.js
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2563eb' },
    secondary: { main: '#6366f1' },
    background: {
      default: '#f9fafb',
    },
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: 'Inter, sans-serif',
    fontWeightRegular: 400,
    fontSize: 13,
    letterSpacing: '0.01em',
  },
  components: {
    MuiButtonBase: {
      defaultProps: { disableRipple: true },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'standard',
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        inputRoot: {
          padding: '0px 6px',
          fontSize: '0.85rem',
          minHeight: '32px',
        },
        option: {
          fontSize: '0.85rem',
          padding: '4px 10px',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          height: 42,
          transition: 'background-color 0.2s ease',
          '&:hover': { backgroundColor: '#f9fbff' },
          '&:nth-of-type(odd)': {
            backgroundColor: '#fcfcfc',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          fontSize: '0.85rem',
          color: '#444',
          backgroundColor: '#f3f6fa',
          padding: '6px 12px',
          position: 'sticky',
          top: 0,
          zIndex: 1,
        },
        body: {
          fontSize: '0.85rem',
          padding: '6px 12px',
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s ease',
        },
      },
    },
  },
});

export default theme;
