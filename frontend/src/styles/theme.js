import { createTheme } from '@mui/material/styles';

const getDesignTokens = (mode) => ({
  palette: {
    mode,
    primary: {
      main: mode === 'light' ? '#2563EB' : '#60A5FA',
      light: '#3B82F6',
      dark: '#1D4ED8',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: mode === 'light' ? '#7C3AED' : '#A78BFA',
      light: '#8B5CF6',
      dark: '#5B21B6',
      contrastText: '#FFFFFF',
    },
    success: { main: '#22C55E' },
    warning: {
      main: '#FACC15',
      light: '#FDE047',
      dark: '#EAB308',
      contrastText: '#1E1B4B',
    },
    error: { main: '#EF4444' },
    info: { main: '#38BDF8' },
    background: {
      default: mode === 'light' ? '#EEF2FF' : '#0B1026',
      paper: mode === 'light' ? 'rgba(255,255,255,0.72)' : 'rgba(17,24,56,0.72)',
    },
    text: {
      primary: mode === 'light' ? '#1E1B4B' : '#F8FAFC',
      secondary: mode === 'light' ? '#64748B' : '#94A3B8',
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
  shape: { borderRadius: 20 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          transition: 'background 0.35s ease, color 0.35s ease',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 20,
          boxShadow: 'none',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          boxShadow: '0 10px 24px rgba(37, 99, 235, 0.28)',
        },
        containedSecondary: {
          boxShadow: '0 10px 24px rgba(124, 58, 237, 0.28)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backdropFilter: 'blur(16px)',
          border: mode === 'light'
            ? '1px solid rgba(255,255,255,0.55)'
            : '1px solid rgba(167,139,250,0.18)',
          boxShadow: mode === 'light'
            ? '0 12px 40px rgba(37, 99, 235, 0.10)'
            : '0 12px 40px rgba(0, 0, 0, 0.4)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: mode === 'light'
            ? 'rgba(255,255,255,0.68)'
            : 'rgba(17,24,56,0.68)',
          backdropFilter: 'blur(18px)',
          border: mode === 'light'
            ? '1px solid rgba(37, 99, 235, 0.14)'
            : '1px solid rgba(167, 139, 250, 0.22)',
          boxShadow: mode === 'light'
            ? '0 14px 36px rgba(124, 58, 237, 0.10)'
            : '0 14px 36px rgba(0, 0, 0, 0.4)',
          transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 12,
          borderRadius: 999,
          backgroundColor: mode === 'light'
            ? 'rgba(37, 99, 235, 0.12)'
            : 'rgba(96, 165, 250, 0.16)',
        },
        bar: {
          borderRadius: 999,
          backgroundImage: 'linear-gradient(90deg, #2563EB, #7C3AED, #FACC15)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: mode === 'light'
            ? 'rgba(255,255,255,0.78)'
            : 'rgba(11,16,38,0.88)',
          backdropFilter: 'blur(18px)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(16px)',
          backgroundColor: mode === 'light'
            ? 'rgba(255,255,255,0.75)'
            : 'rgba(11,16,38,0.8)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          transition: 'background 0.2s ease, transform 0.2s ease',
          '&.Mui-selected': {
            background: mode === 'light'
              ? 'linear-gradient(135deg, rgba(37,99,235,0.16), rgba(124,58,237,0.14))'
              : 'linear-gradient(135deg, rgba(37,99,235,0.28), rgba(124,58,237,0.24))',
            '&:hover': {
              background: mode === 'light'
                ? 'linear-gradient(135deg, rgba(37,99,235,0.22), rgba(124,58,237,0.18))'
                : 'linear-gradient(135deg, rgba(37,99,235,0.34), rgba(124,58,237,0.3))',
            },
          },
        },
      },
    },
  },
});

export function createAppTheme(mode = 'light') {
  return createTheme(getDesignTokens(mode));
}
