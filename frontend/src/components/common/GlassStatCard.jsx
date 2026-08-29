import { Box, Card, CardContent, LinearProgress, Typography } from '@mui/material';
import { motion } from 'framer-motion';

/**
 * Student achievement card — soft glass + clay dual shadow (via .glass-panel).
 * Accent styles are applied via sx so they override MuiCard theme defaults.
 */
export default function GlassStatCard({
  label,
  value,
  icon,
  subtitle,
  progress,
  accent = false,
}) {
  return (
    <Card
      className={accent ? 'glass-accent' : 'glass-panel'}
      component={motion.div}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      sx={{
        height: '100%',
        borderRadius: '22px',
        ...(accent
          ? {
              color: '#fff',
              backgroundImage: 'linear-gradient(135deg, #6366F1 0%, #3B82F6 100%)',
              backgroundColor: '#6366F1',
              border: '1px solid rgba(255,255,255,0.28)',
              boxShadow:
                '8px 12px 24px rgba(99, 102, 241, 0.32), -4px -4px 12px rgba(255,255,255,0.35)',
              '&:hover': {
                boxShadow:
                  '10px 14px 28px rgba(99, 102, 241, 0.38), -4px -4px 12px rgba(255,255,255,0.4)',
              },
            }
          : {
              backgroundColor: 'transparent',
            }),
        '@media (prefers-reduced-motion: reduce)': {
          transform: 'none !important',
        },
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                opacity: accent ? 0.92 : 1,
                color: accent ? '#fff' : 'text.secondary',
                mb: 0.5,
              }}
            >
              {label}
            </Typography>
            <Typography
              variant="h4"
              fontWeight={800}
              sx={{ lineHeight: 1.15, color: accent ? '#fff' : 'text.primary' }}
            >
              {value}
            </Typography>
            {subtitle ? (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mt: 0.75,
                  opacity: accent ? 0.92 : 0.8,
                  fontWeight: 600,
                  color: accent ? '#fff' : 'text.secondary',
                }}
              >
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          {icon ? (
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 3,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                bgcolor: accent ? 'rgba(255,255,255,0.2)' : 'rgba(99,102,241,0.12)',
                color: accent ? '#fff' : 'secondary.main',
              }}
            >
              {icon}
            </Box>
          ) : null}
        </Box>
        {typeof progress === 'number' ? (
          <Box sx={{ mt: 2 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, Math.max(0, progress))}
              sx={{
                height: 8,
                bgcolor: accent ? 'rgba(255,255,255,0.28)' : undefined,
                '& .MuiLinearProgress-bar': accent
                  ? { backgroundImage: 'linear-gradient(90deg, #FACC15, #FFFFFF)' }
                  : undefined,
              }}
            />
          </Box>
        ) : null}
      </CardContent>
    </Card>
  );
}
