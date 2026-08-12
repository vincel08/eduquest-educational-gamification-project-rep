import {
  Box,
  Button,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'stretch',
        position: 'relative',
        overflow: 'hidden',
        background:
          'linear-gradient(135deg, rgba(37,99,235,0.92), rgba(124,58,237,0.88)), url("https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1800&q=80") center/cover',
        color: '#fff',
      }}
    >
      <Box
        component={motion.div}
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        sx={{
          position: 'absolute',
          width: 220,
          height: 220,
          borderRadius: '50%',
          right: '8%',
          top: '18%',
          background: 'radial-gradient(circle, rgba(250,204,21,0.45), transparent 70%)',
          filter: 'blur(2px)',
        }}
      />
      <Box
        component={motion.div}
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
        sx={{
          position: 'absolute',
          width: 160,
          height: 160,
          borderRadius: '50%',
          left: '6%',
          bottom: '16%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.28), transparent 70%)',
        }}
      />
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 }, position: 'relative', zIndex: 1 }}>
        <Stack
          spacing={3}
          component={motion.div}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          sx={{
            maxWidth: 720,
            p: { xs: 2.5, md: 3.5 },
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.28)',
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 24px 60px rgba(30,27,75,0.28)',
          }}
        >
          <Typography
            component={motion.h1}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            variant="h1"
            sx={{ fontSize: { xs: '3rem', md: '5rem' }, lineHeight: 1, fontWeight: 900 }}
          >
            EduWow
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, maxWidth: 560 }}>
            Level up learning with AI-powered quests for high school students.
          </Typography>
          <Typography sx={{ maxWidth: 520, opacity: 0.95 }}>
            Earn XP, unlock badges, compete on leaderboards, and master lessons through
            gamified courses built for real classroom engagement.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              component={RouterLink}
              to="/register"
              variant="contained"
              color="warning"
              size="large"
              sx={{ color: '#1E1B4B', fontWeight: 900 }}
            >
              Start Your Quest
            </Button>
            <Button
              component={RouterLink}
              to="/login"
              variant="outlined"
              size="large"
              sx={{
                borderColor: '#fff',
                color: '#fff',
                bgcolor: 'rgba(255,255,255,0.08)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.16)', borderColor: '#fff' },
              }}
            >
              Login
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
