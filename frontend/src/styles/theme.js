import { createTheme } from '@mui/material/styles';

const getDesignTokens = (mode) => ({
  palette: {
    mode,
    primary: {
      main: '#3B82F6',
      light: '#60A5FA',
      dark: '#2563EB',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#8B5CF6',
      light: '#A78BFA',
      dark: '#7C3AED',
      contrastText: '#FFFFFF',
    },
    success: { main: '#22C55E', contrastText: '#FFFFFF' },
    warning: {
      main: '#F97316',
      light: '#FB923C',
      dark: '#EA580C',
      contrastText: '#FFFFFF',
    },
    accent: {
      main: '#FACC15',
      contrastText: '#1E293B',
    },
    error: { main: '#EF4444' },
    info: { main: '#38BDF8' },
    background: {
      default: mode === 'light' ? '#F8FAFC' : '#0F172A',
      paper: mode === 'light' ? '#FFFFFF' : '#1E293B',
    },
    text: {
      primary: mode === 'light' ? '#0F172A' : '#F8FAFC',
      secondary: mode === 'light' ? '#64748B' : '#94A3B8',
    },
  },
  typography: {
    fontFamily: '"Nunito", "Poppins", sans-serif',
    h1: { fontFamily: '"Poppins", sans-serif', fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontFamily: '"Poppins", sans-serif', fontWeight: 800, letterSpacing: '-0.02em' },
    h3: { fontFamily: '"Poppins", sans-serif', fontWeight: 800 },
    h4: { fontFamily: '"Poppins", sans-serif', fontWeight: 800 },
    h5: { fontFamily: '"Poppins", sans-serif', fontWeight: 700 },
    h6: { fontFamily: '"Poppins", sans-serif', fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 800, letterSpacing: 0.2 },
    body1: { fontWeight: 600 },
    body2: { fontWeight: 600 },
  },
  shape: { borderRadius: 22 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          transition: 'background 0.35s ease, color 0.35s ease',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 22,
          paddingBlock: 10,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease',
          '&:hover': { transform: 'translateY(-2px)' },
          '&:active': { transform: 'translateY(0)' },
        },
        containedPrimary: {
          boxShadow: '0 10px 24px rgba(59, 130, 246, 0.35)',
        },
        containedSecondary: {
          boxShadow: '0 10px 24px rgba(139, 92, 246, 0.35)',
        },
        containedSuccess: {
          boxShadow: '0 10px 24px rgba(34, 197, 94, 0.3)',
        },
        sizeLarge: {
          fontSize: '1.05rem',
          paddingInline: 28,
          paddingBlock: 14,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: mode === 'light'
            ? '1px solid rgba(148, 163, 184, 0.18)'
            : '1px solid rgba(148, 163, 184, 0.12)',
          boxShadow: mode === 'light'
            ? '0 12px 32px rgba(15, 23, 42, 0.06)'
            : '0 12px 32px rgba(0, 0, 0, 0.35)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: mode === 'light' ? '#FFFFFF' : '#1E293B',
          border: mode === 'light'
            ? '1px solid rgba(148, 163, 184, 0.16)'
            : '1px solid rgba(148, 163, 184, 0.12)',
          boxShadow: mode === 'light'
            ? '0 14px 36px rgba(15, 23, 42, 0.07)'
            : '0 14px 36px rgba(0, 0, 0, 0.35)',
          transition: 'transform 0.22s ease, box-shadow 0.22s ease',
          '&:hover': {
            boxShadow: mode === 'light'
              ? '0 18px 44px rgba(59, 130, 246, 0.14)'
              : '0 18px 44px rgba(0, 0, 0, 0.45)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 800 },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 14,
          borderRadius: 999,
          backgroundColor: mode === 'light'
            ? 'rgba(59, 130, 246, 0.12)'
            : 'rgba(96, 165, 250, 0.16)',
        },
        bar: {
          borderRadius: 999,
          backgroundImage: 'linear-gradient(90deg, #3B82F6, #8B5CF6, #FACC15)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: mode === 'light' ? '#FFFFFF' : '#0F172A',
          borderRight: mode === 'light'
            ? '1px solid rgba(148, 163, 184, 0.2)'
            : '1px solid rgba(148, 163, 184, 0.1)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(14px)',
          backgroundColor: mode === 'light'
            ? 'rgba(255,255,255,0.88)'
            : 'rgba(15,23,42,0.88)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          transition: 'background 0.2s ease, transform 0.2s ease',
          '&.Mui-selected': {
            background: mode === 'light'
              ? 'linear-gradient(135deg, rgba(59,130,246,0.14), rgba(139,92,246,0.12))'
              : 'linear-gradient(135deg, rgba(59,130,246,0.28), rgba(139,92,246,0.22))',
            color: mode === 'light' ? '#2563EB' : '#93C5FD',
            '& .MuiListItemIcon-root': {
              color: mode === 'light' ? '#3B82F6' : '#93C5FD',
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
