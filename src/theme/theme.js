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
        // ⛔ disableUnderline удалено, чтобы не было warning
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
          transition: 'background-color 0.2s ease',
          '&:hover': { backgroundColor: '#f9fbff' },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          fontSize: '0.85rem',
          color: '#444',
        },
        body: {
          fontSize: '0.85rem',
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
