import { Box, Card, ThemeProvider } from '@mui/material';
import { motion } from 'framer-motion';
import { createAppTheme } from '../../styles/theme';

const authLightTheme = createAppTheme('light');

/**
 * Liquid-glass auth shell. Always uses light readable contrast
 * so dark app mode cannot wash out text on the frosted card.
 */
export default function AuthLiquidShell({ children, maxWidth = 460 }) {
  return (
    <ThemeProvider theme={authLightTheme}>
      <Box className="liquid-auth-bg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ width: '100%', maxWidth, position: 'relative', zIndex: 1 }}
        >
          <Card
            className="liquid-auth-card"
            sx={{
              width: '100%',
              color: '#0F172A',
              bgcolor: 'transparent',
              '& .MuiTypography-root': { color: 'inherit' },
              '& .MuiTypography-colorTextSecondary, & .MuiFormHelperText-root': {
                color: '#475569 !important',
              },
              '& .MuiInputLabel-root': {
                color: '#334155 !important',
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#2563EB !important',
              },
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255,255,255,0.92) !important',
                color: '#0F172A',
              },
              '& .MuiOutlinedInput-input': {
                color: '#0F172A !important',
                WebkitTextFillColor: '#0F172A',
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(148, 163, 184, 0.55)',
              },
              '& .MuiIconButton-root': {
                color: '#475569',
              },
              '& .MuiLink-root': {
                color: '#2563EB',
                fontWeight: 700,
              },
              '& .MuiAlert-root': {
                color: '#0F172A',
              },
            }}
          >
            {children}
          </Card>
        </motion.div>
      </Box>
    </ThemeProvider>
  );
}
