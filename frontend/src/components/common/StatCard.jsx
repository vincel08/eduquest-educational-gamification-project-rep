import { Box, Card, CardContent, Typography } from '@mui/material';
import { motion } from 'framer-motion';

export default function StatCard({ label, value, icon, color, subtitle }) {
  const iconBg = color || 'linear-gradient(135deg, #3B82F6, #8B5CF6)';
  const isYellow = typeof color === 'string' && /#(FACC15|FDE047|F59E0B|FFB300)/i.test(color);

  return (
    <Card
      component={motion.div}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      sx={{
        height: '100%',
        overflow: 'hidden',
        '@media (prefers-reduced-motion: reduce)': {
          transform: 'none !important',
        },
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom fontWeight={700}>
              {label}
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1.15 }}>
              {value}
            </Typography>
            {subtitle ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          {icon ? (
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: 3,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                background: iconBg,
                color: isYellow ? '#1E1B4B' : '#fff',
                boxShadow: isYellow
                  ? '0 8px 18px rgba(250, 204, 21, 0.35)'
                  : '0 8px 18px rgba(99, 102, 241, 0.25)',
              }}
            >
              {icon}
            </Box>
          ) : null}
        </Box>
      </CardContent>
    </Card>
  );
}
