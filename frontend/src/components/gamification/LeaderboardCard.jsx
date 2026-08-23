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

const RANK_STYLES = [
  {
    background: 'linear-gradient(135deg, #FACC15, #F59E0B)',
    color: '#1E293B',
    border: '1px solid rgba(250,204,21,0.55)',
    bgcolor: 'rgba(250, 204, 21, 0.14)',
    label: 'Gold',
  },
  {
    background: 'linear-gradient(135deg, #E2E8F0, #94A3B8)',
    color: '#0F172A',
    border: '1px solid rgba(148,163,184,0.55)',
    bgcolor: 'rgba(226, 232, 240, 0.35)',
    label: 'Silver',
  },
  {
    background: 'linear-gradient(135deg, #FDBA74, #EA580C)',
    color: '#fff',
    border: '1px solid rgba(249,115,22,0.45)',
    bgcolor: 'rgba(249, 115, 22, 0.12)',
    label: 'Bronze',
  },
];

export default function LeaderboardCard({ entries = [], title = 'Leaderboard' }) {
  return (
    <Paper className="quest-card" sx={{ p: 2.5 }}>
      <Typography variant="h6" sx={{ mb: 2 }} fontWeight={900}>
        {title}
      </Typography>
      <List>
        {entries.map((entry, index) => {
          const style = RANK_STYLES[index];
          return (
            <ListItem
              key={entry.userId || entry.id || index}
              component={motion.div}
              layout
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.03, x: 4 }}
              sx={{
                mb: 1,
                borderRadius: 3,
                border: style?.border || '1px solid rgba(59,130,246,0.12)',
                bgcolor: style?.bgcolor || 'rgba(255,255,255,0.55)',
                cursor: 'pointer',
                boxShadow: index < 3 ? '0 10px 24px rgba(15,23,42,0.08)' : 'none',
                transition: 'box-shadow 0.2s ease, transform 0.2s ease',
              }}
            >
              <ListItemAvatar>
                <Avatar
                  sx={{
                    background: style?.background || 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                    color: style?.color || '#fff',
                    fontWeight: 900,
                  }}
                >
                  {entry.rank || index + 1}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                sx={{ minWidth: 0, pr: 1 }}
                primary={`${entry.firstName || entry.first_name} ${entry.lastName || entry.last_name}`}
                secondary={
                  index < 3
                    ? `${style.label} · ${entry.badgeCount ?? entry.badge_count ?? 0} badges`
                    : `${entry.badgeCount ?? entry.badge_count ?? 0} badges`
                }
                primaryTypographyProps={{
                  fontWeight: 800,
                  noWrap: true,
                  title: `${entry.firstName || entry.first_name} ${entry.lastName || entry.last_name}`,
                }}
              />
              <Stack sx={{ alignItems: 'flex-end', flexShrink: 0 }}>
                <Typography fontWeight={900} color="secondary.main" noWrap>
                  {entry.xp} XP
                </Typography>
              </Stack>
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );
}
