import { Box, Button, Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { motion } from 'framer-motion';
import { Link as RouterLink } from 'react-router-dom';

export default function EmptyState({
  icon,
  title = 'Nothing here yet',
  description = 'Start exploring to fill this space with progress.',
  actionLabel,
  onAction,
  to,
  color = '#3B82F6',
}) {
  return (
    <Stack
      component={motion.div}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      spacing={1.5}
      sx={{
        py: 5,
        px: 3,
        alignItems: 'center',
        textAlign: 'center',
        borderRadius: 4,
        border: '2px dashed',
        borderColor: 'rgba(59,130,246,0.25)',
        bgcolor: 'rgba(59,130,246,0.04)',
      }}
    >
      <Box
        className="eq-float"
        sx={{
          width: 72,
          height: 72,
          borderRadius: '22px',
          display: 'grid',
          placeItems: 'center',
          background: `linear-gradient(135deg, ${color}, #8B5CF6)`,
          color: '#fff',
          boxShadow: '0 12px 28px rgba(59,130,246,0.28)',
        }}
      >
        {icon || <AutoAwesomeIcon sx={{ fontSize: 36 }} />}
      </Box>
      <Typography variant="h6" fontWeight={900}>{title}</Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 360 }}>
        {description}
      </Typography>
      {actionLabel ? (
        <Button
          variant="contained"
          component={to ? RouterLink : 'button'}
          to={to}
          onClick={onAction}
          sx={{ mt: 1 }}
        >
          {actionLabel}
        </Button>
      ) : null}
    </Stack>
  );
}
