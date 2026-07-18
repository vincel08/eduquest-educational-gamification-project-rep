import { Box, Stack, Typography } from '@mui/material';
import { motion } from 'framer-motion';

export default function PageHeader({ title, subtitle, action }) {
  return (
    <Stack
      className="page-hero"
      component={motion.div}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      sx={{
        mb: 3,
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', md: 'center' },
      }}
    >
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#fff', fontWeight: 900 }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography sx={{ color: 'rgba(255,255,255,0.9)', maxWidth: 560 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {action ? (
        <Box sx={{ position: 'relative', zIndex: 1 }}>{action}</Box>
      ) : null}
    </Stack>
  );
}
