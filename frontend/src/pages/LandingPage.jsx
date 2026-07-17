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
        background:
          'linear-gradient(135deg, rgba(15,118,110,0.92), rgba(13,148,136,0.85)), url("https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1800&q=80") center/cover',
        color: '#fff',
      }}
    >
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Stack
          spacing={3}
          component={motion.div}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          sx={{ maxWidth: 720 }}
        >
          <Typography
            component={motion.h1}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            variant="h1"
            sx={{ fontSize: { xs: '3rem', md: '5rem' }, lineHeight: 1 }}
          >
            EduQuest
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 600, maxWidth: 560 }}>
            Level up learning with AI-powered quests for high school students.
          </Typography>
          <Typography sx={{ maxWidth: 520, opacity: 0.92 }}>
            Earn XP, unlock badges, compete on leaderboards, and master lessons through
            gamified courses built for real classroom engagement.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              component={RouterLink}
              to="/register"
              variant="contained"
              color="secondary"
              size="large"
            >
              Start Your Quest
            </Button>
            <Button
              component={RouterLink}
              to="/login"
              variant="outlined"
              size="large"
              sx={{ borderColor: '#fff', color: '#fff' }}
            >
              Login
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
