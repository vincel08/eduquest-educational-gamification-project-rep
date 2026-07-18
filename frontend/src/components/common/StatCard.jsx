import { Box, Card, CardContent, Typography } from '@mui/material';
import { motion } from 'framer-motion';

export default function StatCard({ label, value, icon, color }) {
  const iconBg = color || 'linear-gradient(135deg, #2563EB, #7C3AED)';
  const isYellow = typeof color === 'string' && /#(FACC15|FDE047|F59E0B|FFB300)/i.test(color);

  return (
    <Card
      className="glass-panel"
      component={motion.div}
      whileHover={{ y: -6, scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      sx={{ height: '100%', overflow: 'hidden' }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom fontWeight={700}>
              {label}
            </Typography>
            <Typography variant="h4" fontWeight={900}>{value}</Typography>
          </Box>
          <Box
            className="eq-float"
            sx={{
              width: 56,
              height: 56,
              borderRadius: '18px',
              display: 'grid',
              placeItems: 'center',
              background: iconBg,
              color: isYellow ? '#1E1B4B' : '#fff',
              boxShadow: isYellow
                ? '0 10px 24px rgba(250, 204, 21, 0.4)'
                : '0 10px 24px rgba(37, 99, 235, 0.28)',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
