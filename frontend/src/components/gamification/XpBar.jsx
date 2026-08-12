import { Box, Stack, Typography } from '@mui/material';
import { motion } from 'framer-motion';

export default function XpBar({ xp = 0 }) {
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
          Total XP
        </Typography>
        <Typography fontWeight={800} sx={{ color: '#F97316' }}>{xp} XP</Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
        Keep completing lessons, quizzes, and games to earn more XP.
      </Typography>
    </Box>
  );
}
