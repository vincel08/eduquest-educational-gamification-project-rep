import { Box, LinearProgress, Stack, Typography } from '@mui/material';

export default function XpBar({ xp = 0, level = 1, xpInLevel = 0, xpToNextLevel = 100 }) {
  const progress = xpToNextLevel
    ? Math.min(100, Math.round((xpInLevel / 100) * 100))
    : 0;

  return (
    <Box>
      <Stack direction="row" sx={{ mb: 1, justifyContent: 'space-between' }}>
        <Typography fontWeight={800}>Level {level}</Typography>
        <Typography color="text.secondary">{xp} XP</Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 12,
          borderRadius: 999,
          bgcolor: 'rgba(15,118,110,0.12)',
          '& .MuiLinearProgress-bar': {
            borderRadius: 999,
            background: 'linear-gradient(90deg, #0F766E, #F59E0B)',
          },
        }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
        {xpInLevel}/100 XP to next level
      </Typography>
    </Box>
  );
}
