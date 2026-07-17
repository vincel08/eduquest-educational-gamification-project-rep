import { Avatar, Card, CardContent, Stack, Typography } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { motion } from 'framer-motion';

export default function BadgeCard({ badge }) {
  return (
    <Card
      component={motion.div}
      whileHover={{ scale: 1.02 }}
      sx={{ height: '100%' }}
    >
      <CardContent>
        <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <Avatar sx={{ bgcolor: badge.color || '#FFB300', width: 64, height: 64 }}>
            <EmojiEventsIcon />
          </Avatar>
          <Typography fontWeight={800}>{badge.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {badge.description}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
