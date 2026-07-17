import {
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import { motion } from 'framer-motion';

const MotionPaper = motion.create(Paper);

export default function FinalScore({
  score = 0,
  percentage = null,
  xpEarned = 0,
  level = null,
  xpInLevel = null,
  xpToNextLevel = null,
  badges = [],
  medals = [],
  onPlayAgain,
  onDashboard,
  onLeaderboard,
  title = 'Game Complete!',
}) {
  const percent = percentage == null ? Math.max(0, Math.min(100, Number(score) || 0)) : percentage;
  const levelProgress = xpToNextLevel
    ? Math.round(((Number(xpInLevel) || 0) / Number(xpToNextLevel)) * 100)
    : 0;

  return (
    <MotionPaper
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      sx={{
        p: { xs: 2.5, sm: 3.5 },
        borderRadius: 4,
        border: '1px solid rgba(15,118,110,0.25)',
        background: 'linear-gradient(145deg, rgba(15,118,110,0.12), rgba(255,255,255,0.78))',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 18px 40px rgba(15,118,110,0.18)',
      }}
    >
      <Typography variant="h4" fontWeight={900} textAlign="center">
        {title}
      </Typography>
      <Typography color="text.secondary" textAlign="center" sx={{ mt: 0.5 }}>
        Here is how you did
      </Typography>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mt: 3, justifyContent: 'center' }}
      >
        <StatCard label="Score" value={score} />
        <StatCard label="Percentage" value={`${percent}%`} />
        <StatCard label="XP Earned" value={`+${xpEarned}`} accent />
      </Stack>

      {level != null ? (
        <Box sx={{ mt: 3 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="body2" fontWeight={700}>Level {level}</Typography>
            <Typography variant="caption" color="text.secondary">
              {xpInLevel || 0} / {xpToNextLevel || 0} XP
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={Math.max(0, Math.min(100, levelProgress))}
            sx={{
              height: 12,
              borderRadius: 999,
              bgcolor: 'rgba(15,23,42,0.08)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 999,
                bgcolor: '#0F766E',
              },
            }}
          />
        </Box>
      ) : null}

      {(badges?.length || medals?.length) ? (
        <Stack spacing={1.5} sx={{ mt: 3 }}>
          {badges?.length ? (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Badges Earned
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {badges.map((badge) => (
                  <Chip
                    key={badge.id || badge.badge_id || badge.name}
                    icon={<EmojiEventsIcon />}
                    label={badge.name || badge.badge_name || 'Badge'}
                    color="warning"
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Box>
          ) : null}
          {medals?.length ? (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Medals Earned
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {medals.map((medal) => (
                  <Chip
                    key={medal.id || medal.medal_id || medal.name}
                    icon={<MilitaryTechIcon />}
                    label={medal.name || medal.medal_name || 'Medal'}
                    color="secondary"
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Box>
          ) : null}
        </Stack>
      ) : null}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ mt: 3.5 }}
      >
        <Button fullWidth variant="contained" onClick={onPlayAgain}>
          Play Again
        </Button>
        <Button fullWidth variant="outlined" onClick={onDashboard}>
          Back to Dashboard
        </Button>
        <Button fullWidth variant="outlined" onClick={onLeaderboard}>
          Leaderboard
        </Button>
      </Stack>
    </MotionPaper>
  );
}

function StatCard({ label, value, accent = false }) {
  return (
    <Box
      sx={{
        flex: 1,
        p: 2,
        borderRadius: 3,
        textAlign: 'center',
        border: '1px solid',
        borderColor: accent ? 'rgba(15,118,110,0.35)' : 'divider',
        bgcolor: accent ? 'rgba(15,118,110,0.08)' : 'rgba(255,255,255,0.55)',
      }}
    >
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h5" fontWeight={900}>{value}</Typography>
    </Box>
  );
}
