import { Box, CircularProgress, Typography } from '@mui/material';

export default function LoadingScreen({ label = 'Loading EduQuest...' }) {
  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'grid',
        placeItems: 'center',
        gap: 2,
      }}
    >
      <CircularProgress color="primary" />
      <Typography color="text.secondary">{label}</Typography>
    </Box>
  );
}
