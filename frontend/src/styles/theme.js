import { createTheme } from '@mui/material/styles';

/**
 * EduWow design system — hybrid recommendation:
 * soft glass base (readable for teachers/admins) + blue/purple/gold brand.
 * Student clay accents live in global.css (.quest-card, .glass-panel).
 * Liquid glass accents are limited to landing + auth pages.
 */
const getDesignTokens = (mode) => {
  const isLight = mode === 'light';

  return {
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
      success: { main: '#10B981', contrastText: '#FFFFFF' },
      warning: {
        main: '#F59E0B',
        light: '#FBBF24',
        dark: '#D97706',
        contrastText: '#1E293B',
      },
      accent: {
        main: '#FACC15',
        contrastText: '#1E293B',
      },
      error: { main: '#EF4444' },
      info: { main: '#38BDF8' },
      background: {
        default: isLight ? '#F4F6FB' : '#0B1220',
        paper: isLight ? 'rgba(255,255,255,0.88)' : 'rgba(21,30,50,0.88)',
      },
      text: {
        primary: isLight ? '#0F172A' : '#F8FAFC',
        secondary: isLight ? '#64748B' : '#94A3B8',
      },
      divider: isLight ? 'rgba(148, 163, 184, 0.22)' : 'rgba(148, 163, 184, 0.14)',
    },
    typography: {
      fontFamily: '"Poppins", "Nunito", system-ui, sans-serif',
      h1: { fontFamily: '"Poppins", sans-serif', fontWeight: 800, letterSpacing: '-0.02em', fontSize: '2.25rem' },
      h2: { fontFamily: '"Poppins", sans-serif', fontWeight: 800, letterSpacing: '-0.02em', fontSize: '1.85rem' },
      h3: { fontFamily: '"Poppins", sans-serif', fontWeight: 800, fontSize: '1.55rem' },
      h4: {
        fontFamily: '"Poppins", sans-serif',
        fontWeight: 700,
        fontSize: '1.35rem',
        '@media (min-width:600px)': { fontSize: '1.5rem' },
        '@media (min-width:900px)': { fontSize: '1.65rem' },
      },
      h5: {
        fontFamily: '"Poppins", sans-serif',
        fontWeight: 700,
        fontSize: '1.1rem',
        '@media (min-width:600px)': { fontSize: '1.2rem' },
      },
      h6: { fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: '1.05rem' },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 700, letterSpacing: 0.15 },
      body1: { fontWeight: 500, lineHeight: 1.6 },
      body2: { fontWeight: 500, lineHeight: 1.55 },
      caption: { fontWeight: 600 },
    },
    shape: { borderRadius: 18 },
    shadows: [
      'none',
      '0 1px 2px rgba(15, 23, 42, 0.04)',
      '0 4px 12px rgba(15, 23, 42, 0.05)',
      '0 8px 20px rgba(15, 23, 42, 0.06)',
      '0 12px 28px rgba(15, 23, 42, 0.07)',
      '0 14px 32px rgba(15, 23, 42, 0.08)',
      '0 16px 36px rgba(15, 23, 42, 0.09)',
      '0 18px 40px rgba(59, 130, 246, 0.12)',
      '0 20px 44px rgba(59, 130, 246, 0.14)',
      '0 22px 48px rgba(139, 92, 246, 0.14)',
      ...Array(15).fill('0 24px 52px rgba(15, 23, 42, 0.12)'),
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            transition: 'background 0.35s ease, color 0.35s ease',
          },
          '@media (prefers-reduced-motion: reduce)': {
            '*, *::before, *::after': {
              animationDuration: '0.01ms !important',
              animationIterationCount: '1 !important',
              transitionDuration: '0.01ms !important',
            },
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 12,
            paddingInline: 18,
            paddingBlock: 9,
            transition: 'transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease',
            '&:hover': { transform: 'translateY(-1px)' },
            '&:active': { transform: 'translateY(0)' },
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'none',
              '&:hover': { transform: 'none' },
            },
          },
          containedPrimary: {
            boxShadow: '0 8px 20px rgba(59, 130, 246, 0.28)',
          },
          containedSecondary: {
            boxShadow: '0 8px 20px rgba(139, 92, 246, 0.28)',
          },
          sizeLarge: {
            fontSize: '1rem',
            paddingInline: 24,
            paddingBlock: 12,
            borderRadius: 14,
          },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: isLight ? 'rgba(255,255,255,0.94)' : 'rgba(21,30,50,0.94)',
            borderRadius: 18,
            border: isLight
              ? '1px solid rgba(148, 163, 184, 0.2)'
              : '1px solid rgba(148,163,184,0.14)',
            boxShadow: isLight
              ? '0 10px 28px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255,255,255,0.7)'
              : '0 10px 28px rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: isLight ? '#0F172A' : '#F8FAFC',
          },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: 18,
            background: isLight ? 'rgba(255,255,255,0.96)' : 'rgba(21,30,50,0.96)',
            border: isLight
              ? '1px solid rgba(148, 163, 184, 0.18)'
              : '1px solid rgba(148,163,184,0.14)',
            boxShadow: isLight
              ? '0 12px 30px rgba(15, 23, 42, 0.07), inset 0 1px 0 rgba(255,255,255,0.75)'
              : '0 12px 30px rgba(0, 0, 0, 0.32)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            color: isLight ? '#0F172A' : '#F8FAFC',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              boxShadow: isLight
                ? '0 16px 36px rgba(59, 130, 246, 0.12), inset 0 1px 0 rgba(255,255,255,0.85)'
                : '0 16px 36px rgba(0, 0, 0, 0.4)',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 700, borderRadius: 10 },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            height: 10,
            borderRadius: 999,
            backgroundColor: isLight
              ? 'rgba(59, 130, 246, 0.12)'
              : 'rgba(96, 165, 250, 0.16)',
          },
          bar: {
            borderRadius: 999,
            backgroundImage: 'linear-gradient(90deg, #3B82F6, #6366F1, #8B5CF6)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            background: isLight ? 'rgba(255,255,255,0.94)' : 'rgba(11,18,32,0.94)',
            borderRight: isLight
              ? '1px solid rgba(148, 163, 184, 0.18)'
              : '1px solid rgba(148, 163, 184, 0.1)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backdropFilter: 'blur(16px) saturate(1.2)',
            WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
            backgroundColor: isLight
              ? 'rgba(255,255,255,0.82)'
              : 'rgba(11,18,32,0.82)',
            borderBottom: isLight
              ? '1px solid rgba(255,255,255,0.55)'
              : '1px solid rgba(148,163,184,0.1)',
            boxShadow: 'none',
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            marginBottom: 4,
            transition: 'background 0.2s ease, transform 0.2s ease',
            '&.Mui-selected': {
              background: isLight
                ? 'linear-gradient(135deg, rgba(99,102,241,0.14), rgba(59,130,246,0.1))'
                : 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(59,130,246,0.22))',
              color: isLight ? '#4F46E5' : '#A5B4FC',
              '& .MuiListItemIcon-root': {
                color: isLight ? '#6366F1' : '#A5B4FC',
              },
              '&:hover': {
                background: isLight
                  ? 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(59,130,246,0.14))'
                  : 'linear-gradient(135deg, rgba(99,102,241,0.36), rgba(59,130,246,0.28))',
              },
            },
          },
        },
      },
      MuiTextField: {
        defaultProps: { size: 'medium' },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
              backgroundColor: isLight ? '#FFFFFF' : 'rgba(30, 41, 59, 0.85)',
              color: isLight ? '#0F172A' : '#F8FAFC',
            },
            '& .MuiInputLabel-root': {
              color: isLight ? '#475569' : '#CBD5E1',
            },
            '& .MuiFormHelperText-root': {
              color: isLight ? '#64748B' : '#94A3B8',
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 20,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            fontWeight: 700,
            textTransform: 'none',
            minHeight: 44,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: { fontWeight: 700 },
        },
      },
    },
  };
};

export function createAppTheme(mode = 'light') {
  return createTheme(getDesignTokens(mode));
}
