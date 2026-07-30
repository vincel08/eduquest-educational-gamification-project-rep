import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import { motion } from 'framer-motion';

export default function XpBar({ xp = 0, level = 1, xpInLevel = 0, xpToNextLevel = 100 }) {
  const progress = xpToNextLevel
    ? Math.min(100, Math.round((xpInLevel / 100) * 100))
    : 0;

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Stack direction="row" sx={{ mb: 1, justifyContent: 'space-between' }}>
        <Typography fontWeight={900} sx={{
          background: 'linear-gradient(90deg, #3B82F6, #8B5CF6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
        >
          Level {level}
        </Typography>
        <Typography fontWeight={800} sx={{ color: '#F97316' }}>{xp} XP</Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 14,
          borderRadius: 999,
          bgcolor: 'rgba(59,130,246,0.12)',
          '& .MuiLinearProgress-bar': {
            borderRadius: 999,
            background: 'linear-gradient(90deg, #3B82F6, #8B5CF6, #FACC15)',
            backgroundSize: '200% 100%',
            animation: 'eq-shimmer 2.4s linear infinite',
          },
        }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
        {xpInLevel}/{xpToNextLevel || 100} XP to next level
      </Typography>
    </Box>
  );
}
