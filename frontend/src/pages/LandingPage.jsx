import {
  Box,
  Button,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import BrandLogo from '../components/common/BrandLogo';

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
          'radial-gradient(ellipse 80% 60% at 15% 10%, rgba(147,197,253,0.55), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 18%, rgba(196,181,253,0.45), transparent 50%), linear-gradient(135deg, rgba(15,23,42,0.88), rgba(30,58,138,0.82)), url("https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1800&q=80") center/cover',
        color: '#0F172A',
      }}
    >
      <Box
        component={motion.div}
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        sx={{
          position: 'absolute',
          width: 240,
          height: 240,
          borderRadius: '50%',
          right: '8%',
          top: '14%',
          background:
            'radial-gradient(circle, rgba(255,255,255,0.4), rgba(250,204,21,0.25) 45%, transparent 70%)',
          filter: 'blur(6px)',
        }}
      />
      <Box
        component={motion.div}
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
        sx={{
          position: 'absolute',
          width: 180,
          height: 180,
          borderRadius: '50%',
          left: '5%',
          bottom: '14%',
          background:
            'radial-gradient(circle, rgba(167,139,250,0.35), transparent 70%)',
          filter: 'blur(8px)',
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
            borderRadius: '28px',
            border: '1px solid rgba(255,255,255,0.7)',
            background:
              'linear-gradient(160deg, rgba(255,255,255,0.94), rgba(255,255,255,0.88))',
            backdropFilter: 'blur(28px) saturate(1.35)',
            WebkitBackdropFilter: 'blur(28px) saturate(1.35)',
            boxShadow:
              '0 28px 70px rgba(15,23,42,0.28), inset 0 1px 0 rgba(255,255,255,0.95)',
            position: 'relative',
            overflow: 'hidden',
            color: '#0F172A',
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'linear-gradient(120deg, rgba(255,255,255,0.4) 0%, transparent 40%)',
              opacity: 0.5,
            },
            '& .MuiTypography-root': {
              position: 'relative',
            },
          }}
        >
          <Box
            component={motion.div}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            sx={{
              alignSelf: 'flex-start',
              p: 1.5,
              borderRadius: '18px',
              bgcolor: 'rgba(255,255,255,0.95)',
              border: '1px solid rgba(255,255,255,0.9)',
              boxShadow:
                '0 12px 28px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.9)',
              position: 'relative',
            }}
          >
            <BrandLogo size="hero" />
          </Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              maxWidth: 560,
              fontSize: { xs: '1.35rem', sm: '1.75rem', md: '2.125rem' },
              lineHeight: 1.25,
              color: '#0F172A',
            }}
          >
            Level up learning with AI-powered quests for junior high students
            (Grades 7–10).
          </Typography>
          <Typography
            sx={{ maxWidth: 520, color: '#475569', fontWeight: 500 }}
          >
            Earn XP, unlock badges, compete on leaderboards, and master lessons through
            gamified courses built for real classroom engagement.
          </Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ position: 'relative' }}
          >
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
              variant="contained"
              color="primary"
              size="large"
            >
              Login
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
