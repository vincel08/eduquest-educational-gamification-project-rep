import { Box, CircularProgress, Typography } from '@mui/material';
import { motion } from 'framer-motion';

export default function LoadingScreen({ label = 'Loading EduQuest...' }) {
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
      <Box
        className="glass-panel"
        sx={{
          p: 4,
          borderRadius: 4,
          display: 'grid',
          placeItems: 'center',
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
      </Box>
    </Box>
  );
}
