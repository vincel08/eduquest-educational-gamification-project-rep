import { Box, Card, CardContent, LinearProgress, Typography } from '@mui/material';
import { motion } from 'framer-motion';

/**
 * Achievement-style glass card for Level / XP / badges dashboards.
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
        ...(accent
          ? {
              color: '#fff',
              backgroundImage: 'linear-gradient(135deg, #6366F1 0%, #3B82F6 100%)',
              backgroundColor: '#6366F1',
              border: '1px solid rgba(255,255,255,0.22)',
              boxShadow: '0 14px 32px rgba(99, 102, 241, 0.28)',
              '&:hover': {
                boxShadow: '0 16px 36px rgba(99, 102, 241, 0.34)',
              },
            }
          : {
              backgroundColor: 'background.paper',
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
