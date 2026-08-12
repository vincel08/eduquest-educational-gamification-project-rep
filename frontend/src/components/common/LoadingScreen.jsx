import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import SkeletonCards from './SkeletonCards';

export default function LoadingScreen({ label = 'Loading EduWow...', showCards = false }) {
  if (showCards) {
    return (
      <Box sx={{ py: 2 }}>
        <Typography color="text.secondary" fontWeight={700} sx={{ mb: 2 }}>{label}</Typography>
        <SkeletonCards count={3} />
      </Box>
    );
  }

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      sx={{
        minHeight: '60vh',
        display: 'grid',
        placeItems: 'center',
        gap: 2,
      }}
    >
      <Stack
        className="quest-card"
        sx={{
          p: 4,
          borderRadius: 4,
          alignItems: 'center',
          gap: 2,
          minWidth: 220,
        }}
      >
        <CircularProgress
          size={48}
          thickness={5}
          sx={{
            color: 'primary.main',
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round',
            },
          }}
        />
        <Typography color="text.secondary" fontWeight={700}>{label}</Typography>
      </Stack>
    </Box>
  );
}
