import { Box, Stack, Typography } from '@mui/material';
import { motion } from 'framer-motion';

const heroActionSx = {
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 1,
  alignItems: 'center',
  flex: '0 0 auto',
  maxWidth: '100%',
  '& .MuiButton-outlined': {
    color: '#1e1b4b',
    bgcolor: '#fff',
    borderColor: '#fff',
    fontWeight: 700,
    '&:hover': {
      color: '#1e1b4b',
      bgcolor: '#f8fafc',
      borderColor: '#f8fafc',
    },
  },
  '& .MuiButton-text, & .MuiIconButton-root': {
    color: '#fff',
  },
  '& .MuiButton-outlined .MuiSvgIcon-root, & .MuiButton-text .MuiSvgIcon-root, & .MuiIconButton-root .MuiSvgIcon-root': {
    color: 'inherit',
  },
};

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
      useFlexGap
      flexWrap="wrap"
      sx={{
        mb: 3,
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', md: 'center' },
      }}
    >
      <Box sx={{ position: 'relative', zIndex: 1, minWidth: 0, flex: '1 1 16rem' }}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{
            color: '#fff',
            fontWeight: 900,
            fontSize: { xs: '1.35rem', sm: '1.55rem', md: '1.85rem' },
            lineHeight: 1.2,
            wordBreak: 'break-word',
          }}
        >
          {title}
        </Typography>
        {subtitle ? (
          <Typography sx={{ color: 'rgba(255,255,255,0.9)', maxWidth: 560 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {action ? <Box sx={heroActionSx}>{action}</Box> : null}
    </Stack>
  );
}
