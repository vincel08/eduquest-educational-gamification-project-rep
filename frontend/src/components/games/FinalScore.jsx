import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { motion } from 'framer-motion';

const MotionPaper = motion.create(Paper);

function Stars({ percentage }) {
  const filled = percentage >= 90 ? 3 : percentage >= 70 ? 2 : percentage >= 40 ? 1 : 0;
  return (
    <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ my: 1.5 }}>
      {[0, 1, 2].map((index) => (
        index < filled
          ? <StarIcon key={index} sx={{ color: '#FACC15', fontSize: 36 }} />
          : <StarBorderIcon key={index} sx={{ color: 'rgba(148,163,184,0.8)', fontSize: 36 }} />
      ))}
    </Stack>
  );
}

export default function FinalScore({
  score = 0,
  percentage = null,
  xpEarned = 0,
  badges = [],
  medals = [],
  motivation = '',
  onPlayAgain,
  onDashboard,
  onLeaderboard,
  onContinue,
  nextGame = null,
  onNextGame,
  title = 'Game Complete!',
  attemptsRemaining = null,
  maxAttempts = null,
  passed = null,
  releasedToGradebook = false,
  releasingGrade = false,
}) {
  const percent = percentage == null ? Math.max(0, Math.min(100, Number(score) || 0)) : percentage;
  const canRetry = Boolean(onPlayAgain);
  const didPass = passed == null ? percent >= 70 : Boolean(passed);
  const keepLabel = releasingGrade
    ? 'Submitting…'
    : releasedToGradebook
      ? 'Back to games'
      : didPass
        ? 'Submit grade to teacher'
        : 'Submit this score to teacher';
  const retryLabel = didPass
    ? `Try for a higher score (${Math.max(0, Number(attemptsRemaining) || 0)} left)`
    : `Play again (${Math.max(0, Number(attemptsRemaining) || 0)} left)`;
  const choiceCopy = releasedToGradebook
    ? 'Your result is now visible to your teacher (best score counts).'
    : canRetry
      ? didPass
        ? 'You passed. Submit this grade to your teacher now, or use a remaining attempt first. Teachers only see a result after you submit or use all attempts.'
        : 'Not passed yet (need 70%+). Retry, or submit this score to your teacher now. Teachers only see a result after you submit or use all attempts.'
      : didPass
        ? 'Great job — your result was sent to your teacher because no attempts remain.'
        : 'No attempts left — your best result was sent to your teacher.';

  return (
    <MotionPaper
      className="game-panel"
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      sx={{
        p: { xs: 2.5, sm: 3.5 },
        borderRadius: 4,
        border: '2px solid rgba(139,92,246,0.28)',
        background: 'linear-gradient(145deg, rgba(59,130,246,0.12), rgba(139,92,246,0.12), #ffffff)',
        boxShadow: '0 20px 48px rgba(59,130,246,0.2)',
      }}
    >
      <Typography
        variant="h4"
        fontWeight={900}
        textAlign="center"
        sx={{
          background: 'linear-gradient(90deg, #3B82F6, #8B5CF6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {title}
      </Typography>
      {motivation ? (
        <Typography color="secondary.main" textAlign="center" fontWeight={800} sx={{ mt: 0.75 }}>
          {motivation}
        </Typography>
      ) : (
        <Typography color="text.secondary" textAlign="center" sx={{ mt: 0.5 }}>
          Here is how you did
        </Typography>
      )}

      <Stars percentage={percent} />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mt: 1, justifyContent: 'center' }}
      >
        <ScoreStat label="Score" value={score} />
        <ScoreStat label="Percentage" value={`${percent}%`} />
        <ScoreStat label="XP Earned" value={`+${xpEarned}`} accent />
      </Stack>

      <Chip
        size="small"
        label={didPass ? 'Passed' : 'Not passed'}
        color={didPass ? 'success' : 'default'}
        variant={didPass ? 'filled' : 'outlined'}
        sx={{ display: 'flex', mx: 'auto', mt: 1.5, width: 'fit-content', fontWeight: 800 }}
      />

      {maxAttempts != null ? (
        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          sx={{ mt: 1.5 }}
        >
          Attempts left: {Math.max(0, Number(attemptsRemaining) || 0)} / {maxAttempts}
          {!canRetry ? ' · No retries left' : ''}
        </Typography>
      ) : null}

      <Typography
        variant="body2"
        color="text.secondary"
        textAlign="center"
        sx={{ mt: 1.5, maxWidth: 480, mx: 'auto' }}
      >
        {choiceCopy}
      </Typography>

      {(badges.length || medals.length) ? (
        <Stack spacing={1} sx={{ mt: 3 }}>
          <Typography fontWeight={900}>Achievements Unlocked</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {badges.map((badge) => (
              <Chip
                key={badge.id || badge.name}
                icon={<EmojiEventsIcon />}
                label={badge.name}
                sx={{ bgcolor: 'rgba(250,204,21,0.22)', fontWeight: 800 }}
              />
            ))}
            {medals.map((medal) => (
              <Chip
                key={medal.id || medal.name}
                icon={<MilitaryTechIcon />}
                label={medal.name}
                color="secondary"
                variant="outlined"
              />
            ))}
          </Stack>
        </Stack>
      ) : null}

      {nextGame ? (
        <Box sx={{ mt: 3, p: 2, borderRadius: 3, bgcolor: 'rgba(59,130,246,0.08)', textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={800}>
            Next recommended game
          </Typography>
          <Typography fontWeight={900}>{nextGame.title}</Typography>
          {onNextGame ? (
            <Button sx={{ mt: 1 }} variant="contained" color="secondary" onClick={onNextGame}>
              Play Next
            </Button>
          ) : null}
        </Box>
      ) : null}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ mt: 3, justifyContent: 'center' }}
      >
        {canRetry ? (
          <Button
            variant="contained"
            color={didPass ? 'secondary' : 'primary'}
            onClick={onPlayAgain}
            disabled={releasingGrade}
          >
            {retryLabel}
          </Button>
        ) : null}
        {onContinue ? (
          <Button
            variant={canRetry ? 'outlined' : 'contained'}
            color="secondary"
            onClick={onContinue}
            disabled={releasingGrade}
          >
            {keepLabel}
          </Button>
        ) : null}
        {onLeaderboard ? (
          <Button variant="outlined" onClick={onLeaderboard}>Leaderboard</Button>
        ) : null}
        {onDashboard ? (
          <Button variant="text" onClick={onDashboard}>Continue Learning</Button>
        ) : null}
      </Stack>
    </MotionPaper>
  );
}

function ScoreStat({ label, value, accent = false }) {
  return (
    <Box
      component={motion.div}
      whileHover={{ scale: 1.03 }}
      sx={{
        minWidth: 110,
        p: 1.5,
        borderRadius: 3,
        textAlign: 'center',
        border: '1px solid rgba(59,130,246,0.16)',
        bgcolor: accent ? 'rgba(250,204,21,0.18)' : 'rgba(255,255,255,0.7)',
        cursor: 'default',
      }}
    >
      <Typography variant="caption" color="text.secondary" fontWeight={800}>{label}</Typography>
      <Typography variant="h5" fontWeight={900}>{value}</Typography>
    </Box>
  );
}
