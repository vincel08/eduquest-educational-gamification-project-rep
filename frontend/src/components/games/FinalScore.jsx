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
      className="game-panel"
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      sx={{
        p: { xs: 2.5, sm: 3.5 },
        borderRadius: 4,
        border: '1px solid rgba(124,58,237,0.28)',
        background: 'linear-gradient(145deg, rgba(37,99,235,0.14), rgba(124,58,237,0.12), rgba(255,255,255,0.78))',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 20px 48px rgba(37,99,235,0.2)',
      }}
    >
      <Typography
        variant="h4"
        fontWeight={900}
        textAlign="center"
        sx={{
          background: 'linear-gradient(90deg, #2563EB, #7C3AED)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
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
        <ScoreStat label="Score" value={score} />
        <ScoreStat label="Percentage" value={`${percent}%`} />
        <ScoreStat label="XP Earned" value={`+${xpEarned}`} accent />
      </Stack>

      {level != null ? (
        <Box sx={{ mt: 3 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="body2" fontWeight={800}>Level {level}</Typography>
            <Typography variant="caption" color="text.secondary">
              {xpInLevel || 0} / {xpToNextLevel || 0} XP
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={Math.max(0, Math.min(100, levelProgress))}
            sx={{
              height: 14,
              borderRadius: 999,
              bgcolor: 'rgba(37,99,235,0.12)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 999,
                background: 'linear-gradient(90deg, #2563EB, #7C3AED, #FACC15)',
              },
            }}
          />
        </Box>
      ) : null}

      {(badges?.length || medals?.length) ? (
        <Stack spacing={1.5} sx={{ mt: 3 }}>
          {badges?.length ? (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }} fontWeight={800}>
                Badges Earned
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {badges.map((badge) => (
                  <Chip
                    key={badge.id || badge.badge_id || badge.name}
                    icon={<EmojiEventsIcon />}
                    label={badge.name || badge.badge_name || 'Badge'}
                    sx={{
                      bgcolor: 'rgba(250,204,21,0.22)',
                      color: 'warning.dark',
                      fontWeight: 800,
                      border: '1px solid rgba(250,204,21,0.5)',
                    }}
                  />
                ))}
              </Stack>
            </Box>
          ) : null}
          {medals?.length ? (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }} fontWeight={800}>
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
                    sx={{ fontWeight: 800 }}
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
        <Button fullWidth variant="outlined" color="secondary" onClick={onDashboard}>
          Back to Dashboard
        </Button>
        <Button fullWidth variant="outlined" onClick={onLeaderboard}>
          Leaderboard
        </Button>
      </Stack>
    </MotionPaper>
  );
}

function ScoreStat({ label, value, accent = false }) {
  return (
    <Box
      sx={{
        flex: 1,
        p: 2,
        borderRadius: 3,
        textAlign: 'center',
        border: '1px solid',
        borderColor: accent ? 'rgba(250,204,21,0.5)' : 'rgba(37,99,235,0.2)',
        background: accent
          ? 'linear-gradient(145deg, rgba(250,204,21,0.22), rgba(255,255,255,0.7))'
          : 'linear-gradient(145deg, rgba(37,99,235,0.12), rgba(255,255,255,0.7))',
        backdropFilter: 'blur(10px)',
      }}
    >
      <Typography variant="caption" color="text.secondary" fontWeight={700}>{label}</Typography>
      <Typography variant="h5" fontWeight={900}>{value}</Typography>
    </Box>
  );
}
