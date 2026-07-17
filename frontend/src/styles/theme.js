import { createTheme } from '@mui/material/styles';

const getDesignTokens = (mode) => ({
  palette: {
    mode,
    primary: {
      main: mode === 'light' ? '#0F766E' : '#2DD4BF',
      light: '#14B8A6',
      dark: '#115E59',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: mode === 'light' ? '#F59E0B' : '#FBBF24',
      light: '#FCD34D',
      dark: '#D97706',
      contrastText: '#111827',
    },
    success: { main: '#22C55E' },
    warning: { main: '#F59E0B' },
    error: { main: '#EF4444' },
    info: { main: '#0EA5E9' },
    background: {
      default: mode === 'light' ? '#F0FDFA' : '#0B1220',
      paper: mode === 'light' ? 'rgba(255,255,255,0.82)' : 'rgba(15,23,42,0.85)',
    },
    text: {
      primary: mode === 'light' ? '#134E4A' : '#F8FAFC',
      secondary: mode === 'light' ? '#475569' : '#94A3B8',
    },
  },
  typography: {
    fontFamily: '"Nunito", "Poppins", sans-serif',
    h1: { fontFamily: '"Poppins", sans-serif', fontWeight: 800 },
    h2: { fontFamily: '"Poppins", sans-serif', fontWeight: 700 },
    h3: { fontFamily: '"Poppins", sans-serif', fontWeight: 700 },
    h4: { fontFamily: '"Poppins", sans-serif', fontWeight: 700 },
    h5: { fontFamily: '"Poppins", sans-serif', fontWeight: 700 },
    h6: { fontFamily: '"Poppins", sans-serif', fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  shape: { borderRadius: 18 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          paddingInline: 18,
          boxShadow: 'none',
        },
        contained: {
          boxShadow: '0 8px 20px rgba(15, 118, 110, 0.22)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backdropFilter: 'blur(12px)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: mode === 'light'
            ? '1px solid rgba(15, 118, 110, 0.12)'
            : '1px solid rgba(45, 212, 191, 0.18)',
          boxShadow: mode === 'light'
            ? '0 12px 30px rgba(15, 118, 110, 0.08)'
            : '0 12px 30px rgba(0, 0, 0, 0.35)',
        },
      },
    },
  },
});

export function createAppTheme(mode = 'light') {
  return createTheme(getDesignTokens(mode));
}
