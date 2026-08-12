import { Box, Typography } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';

export default function XpFloatLayer({ items = [] }) {
  return (
    <Box
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: '28%',
        zIndex: 2000,
        pointerEvents: 'none',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <AnimatePresence>
        {items.map((item) => (
          <Typography
            key={item.id}
            component={motion.div}
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: -48, scale: 1.08 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            sx={{
              position: 'absolute',
              fontWeight: 900,
              fontSize: { xs: '1.6rem', md: '2rem' },
              color: '#FACC15',
              textShadow: '0 6px 18px rgba(250,204,21,0.55)',
            }}
          >
            +{item.amount} XP
          </Typography>
        ))}
      </AnimatePresence>
    </Box>
  );
}
