import {
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { motion } from 'framer-motion';

export default function LeaderboardCard({ entries = [] }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Leaderboard
      </Typography>
      <List>
        {entries.map((entry, index) => (
          <ListItem
            key={entry.userId}
            component={motion.div}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            sx={{
              mb: 1,
              borderRadius: 3,
              bgcolor: index < 3 ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
            }}
          >
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                {entry.firstName?.[0]}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={`${entry.rank}. ${entry.firstName} ${entry.lastName}`}
              secondary={`Level ${entry.level} · ${entry.badgeCount} badges`}
            />
            <Stack sx={{ alignItems: 'flex-end' }}>
              <Typography fontWeight={800}>{entry.xp} XP</Typography>
            </Stack>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
