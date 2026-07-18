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

const rankGlow = [
  'linear-gradient(135deg, #FACC15, #F59E0B)',
  'linear-gradient(135deg, #E2E8F0, #94A3B8)',
  'linear-gradient(135deg, #FDBA74, #EA580C)',
];

export default function LeaderboardCard({ entries = [] }) {
  return (
    <Paper className="glass-panel" sx={{ p: 2.5 }}>
      <Typography variant="h6" sx={{ mb: 2 }} fontWeight={900}>
        Leaderboard
      </Typography>
      <List>
        {entries.map((entry, index) => (
          <ListItem
            key={entry.userId}
            component={motion.div}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.01, x: 4 }}
            sx={{
              mb: 1,
              borderRadius: 3,
              border: '1px solid',
              borderColor: index < 3 ? 'rgba(250,204,21,0.35)' : 'rgba(37,99,235,0.1)',
              bgcolor: index < 3 ? 'rgba(250, 204, 21, 0.12)' : 'rgba(255,255,255,0.35)',
            }}
          >
            <ListItemAvatar>
              <Avatar
                sx={{
                  background: rankGlow[index] || 'linear-gradient(135deg, #2563EB, #7C3AED)',
                  color: index === 0 ? '#1E1B4B' : '#fff',
                  fontWeight: 900,
                }}
              >
                {entry.rank || index + 1}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={`${entry.firstName} ${entry.lastName}`}
              secondary={`Level ${entry.level} · ${entry.badgeCount} badges`}
              primaryTypographyProps={{ fontWeight: 800 }}
            />
            <Stack sx={{ alignItems: 'flex-end' }}>
              <Typography fontWeight={900} color="secondary.main">{entry.xp} XP</Typography>
            </Stack>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
