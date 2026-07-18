import { Avatar, Card, CardContent, Stack, Typography } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { motion } from 'framer-motion';

export default function BadgeCard({ badge }) {
  return (
    <Card
      className="glass-panel eq-achievement-glow"
      component={motion.div}
      whileHover={{ scale: 1.04, y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      sx={{ height: '100%' }}
    >
      <CardContent>
        <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <Avatar
            sx={{
              bgcolor: badge.color || '#FACC15',
              color: '#1E1B4B',
              width: 72,
              height: 72,
              boxShadow: '0 10px 24px rgba(250, 204, 21, 0.45)',
            }}
          >
            <EmojiEventsIcon sx={{ fontSize: 36 }} />
          </Avatar>
          <Typography fontWeight={900}>{badge.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {badge.description}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
