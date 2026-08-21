import { useMemo, useState } from 'react';
import { Box, Button, LinearProgress, Stack, Typography, useTheme } from '@mui/material';
import ExploreIcon from '@mui/icons-material/Explore';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FlagIcon from '@mui/icons-material/Flag';
import AnswerFeedback from './AnswerFeedback';
import useAnswerFeedback from '../../hooks/useAnswerFeedback';
import { playSound, SOUND_KEYS } from '../../utils/soundEffects';
import {
  AnimatePresence,
  MotionBox,
  MotionButton,
  MotionStack,
  choiceItemVariants,
  choiceListProps,
} from './GameMotion';

const STARTING_ENERGY = 3;

const NARRATIVE_BEATS = [
  'Your adventure begins. Choose carefully — every wrong turn costs energy.',
  'The path ahead splits. Trust what you have learned.',
  'A checkpoint appears through the mist. One choice moves you forward.',
  'You are deep into the mission. Stay sharp.',
  'The final stretch. Finish strong.',
];

function locationLabel(mission, index) {
  const title = String(mission?.title || '').trim();
  if (title) return title.length > 22 ? `${title.slice(0, 20)}…` : title;
  return `Stop ${index + 1}`;
}

function beatForIndex(index, total) {
  if (index === 0) return NARRATIVE_BEATS[0];
  if (index >= total - 1) return NARRATIVE_BEATS[4];
  return NARRATIVE_BEATS[Math.min(3, 1 + Math.floor((index / Math.max(total - 1, 1)) * 2))];
}

export default function MissionAdventure({ gameData, onComplete, xpReward = 50 }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const missions = useMemo(() => gameData?.missions || [], [gameData]);
  const briefing = String(gameData?.briefing || gameData?.story || '').trim()
    || 'You are on a learning expedition. Follow the map, answer each challenge, and protect your energy. Reach the final flag to complete the mission.';

  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [choices, setChoices] = useState([]);
  const [energy, setEnergy] = useState(STARTING_ENERGY);
  const [failed, setFailed] = useState(false);
  const { feedback, showFeedback, handleNext } = useAnswerFeedback();

  if (!missions.length) {
    return <Typography color="text.secondary">No mission adventure data available.</Typography>;
  }

  const current = missions[index];
  const perXp = Math.max(5, Math.round(Number(xpReward) / missions.length));
  const progressPct = (index / missions.length) * 100;

  function finish(finalScore, finalChoices, reason, energyLeft) {
    onComplete?.({
      score: Math.max(0, Math.min(100, Math.round(finalScore))),
      answers: {
        choices: finalChoices,
        energyLeft,
        failed: reason === 'energy',
        completed: reason === 'complete',
      },
    });
  }

  function choose(choiceIndex) {
    if (feedback?.open || failed || !started) return;

    const isCorrect = choiceIndex === current.correctIndex;
    const nextScore = isCorrect ? Math.min(100, score + Math.round(100 / missions.length)) : score;
    const nextEnergy = isCorrect ? energy : Math.max(0, energy - 1);
    const outOfEnergy = !isCorrect && nextEnergy <= 0;
    const finishedAll = index + 1 >= missions.length;

    showFeedback({
      isCorrect,
      soundKey: isCorrect
        ? SOUND_KEYS.correct
        : (outOfEnergy ? SOUND_KEYS.fail : SOUND_KEYS.energyDown),
      userAnswer: current.choices?.[choiceIndex],
      correctAnswer: current.choices?.[current.correctIndex],
      explanation: isCorrect
        ? `Path clear — advancing toward ${finishedAll ? 'the final flag' : locationLabel(missions[index + 1], index + 1)}.`
        : (outOfEnergy
          ? 'You are out of energy. The mission ends here.'
          : `Setback! Energy -1. ${nextEnergy} left.`),
      xpEarned: isCorrect ? (Number(current.xp) || perXp) : 0,
      score: nextScore,
      progress: (index + 1) / missions.length,
      onNext: () => {
        const nextChoices = [...choices, choiceIndex];
        setChoices(nextChoices);
        setScore(nextScore);
        setEnergy(nextEnergy);

        if (outOfEnergy) {
          setFailed(true);
          finish(nextScore, nextChoices, 'energy', nextEnergy);
          return;
        }

        if (finishedAll) {
          finish(nextScore, nextChoices, 'complete', nextEnergy);
          return;
        }

        setIndex((prev) => prev + 1);
      },
    });
  }

  if (!started) {
    return (
      <MotionStack
        spacing={2.5}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          background: isDark
            ? 'radial-gradient(circle at 20% 0%, rgba(34,197,94,0.25), transparent 45%), linear-gradient(160deg, #14532d, #0f172a)'
            : 'radial-gradient(circle at 20% 0%, rgba(34,197,94,0.2), transparent 45%), linear-gradient(160deg, #ecfdf5, #ffffff)',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'rgba(21,128,61,0.2)',
              color: '#15803d',
            }}
          >
            <ExploreIcon fontSize="large" />
          </Box>
          <Box>
            <Typography variant="overline" sx={{ color: '#15803d', fontWeight: 800, letterSpacing: 1.2 }}>
              Mission briefing
            </Typography>
            <Typography variant="h6" fontWeight={900}>
              {gameData?.title || 'Learning Expedition'}
            </Typography>
          </Box>
        </Stack>

        <Typography sx={{ lineHeight: 1.6 }}>{briefing}</Typography>

        <Stack spacing={1}>
          <Typography variant="body2" fontWeight={700} color="text.secondary">
            Route · {missions.length} checkpoints
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {missions.map((mission, i) => (
              <Box
                key={`brief-${i}`}
                sx={{
                  px: 1.25,
                  py: 0.5,
                  borderRadius: 999,
                  bgcolor: 'action.hover',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {i + 1}. {locationLabel(mission, i)}
              </Box>
            ))}
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" fontWeight={700}>Starting energy:</Typography>
          {Array.from({ length: STARTING_ENERGY }).map((_, i) => (
            <FavoriteIcon key={`e-${i}`} sx={{ color: '#dc2626', fontSize: 20 }} />
          ))}
        </Stack>

        <Typography variant="caption" color="text.secondary">
          Correct choices keep your energy. Wrong choices cost 1 heart. Empty energy ends the mission early.
        </Typography>

        <Button
          variant="contained"
          size="large"
          onClick={() => {
            playSound(SOUND_KEYS.missionStart);
            setStarted(true);
          }}
          sx={{ alignSelf: 'flex-start', bgcolor: '#15803d', '&:hover': { bgcolor: '#166534' }, fontWeight: 800 }}
        >
          Begin mission
        </Button>
      </MotionStack>
    );
  }

  return (
    <Stack spacing={2}>
      <Stack spacing={1.25}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" useFlexGap flexWrap="wrap" spacing={1}>
          <Typography variant="body2" fontWeight={700} color="text.secondary">
            Checkpoint {index + 1}/{missions.length} · Score {score}
          </Typography>
          <Stack direction="row" spacing={0.35} alignItems="center" aria-label={`${energy} energy left`}>
            {Array.from({ length: STARTING_ENERGY }).map((_, i) => (
              i < energy
                ? <FavoriteIcon key={`heart-${i}`} sx={{ color: '#dc2626', fontSize: 22 }} />
                : <FavoriteBorderIcon key={`heart-${i}`} sx={{ color: 'text.disabled', fontSize: 22 }} />
            ))}
          </Stack>
        </Stack>

        <LinearProgress
          variant="determinate"
          value={progressPct}
          sx={{
            height: 8,
            borderRadius: 999,
            bgcolor: 'action.hover',
            '& .MuiLinearProgress-bar': { borderRadius: 999, bgcolor: '#15803d' },
          }}
        />

        {/* Trail map */}
        <Box
          sx={{
            position: 'relative',
            px: 0.5,
            py: 1.5,
            overflowX: 'auto',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              left: 16,
              right: 16,
              top: '42%',
              height: 3,
              bgcolor: isDark ? 'rgba(34,197,94,0.25)' : 'rgba(21,128,61,0.2)',
              borderRadius: 999,
              zIndex: 0,
            }}
          />
          <Stack direction="row" spacing={1} sx={{ position: 'relative', zIndex: 1, minWidth: 'max-content' }}>
            {missions.map((mission, i) => {
              const cleared = i < index;
              const currentStop = i === index;
              return (
                <MotionBox
                  key={`map-${i}`}
                  animate={{
                    scale: currentStop ? 1.08 : 1,
                    y: currentStop ? -2 : 0,
                  }}
                  sx={{
                    width: 88,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.75,
                  }}
                >
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 12,
                      fontWeight: 900,
                      border: '2px solid',
                      borderColor: cleared || currentStop ? '#15803d' : 'divider',
                      bgcolor: cleared
                        ? '#15803d'
                        : currentStop
                          ? (isDark ? '#14532d' : '#bbf7d0')
                          : 'background.paper',
                      color: cleared ? '#fff' : currentStop ? '#15803d' : 'text.secondary',
                      boxShadow: currentStop ? '0 0 0 4px rgba(34,197,94,0.25)' : 'none',
                    }}
                  >
                    {i === missions.length - 1 ? <FlagIcon sx={{ fontSize: 16 }} /> : i + 1}
                  </Box>
                  <Typography
                    variant="caption"
                    textAlign="center"
                    fontWeight={currentStop ? 800 : 600}
                    color={currentStop ? 'text.primary' : 'text.secondary'}
                    sx={{ lineHeight: 1.2, maxWidth: 84 }}
                  >
                    {locationLabel(mission, i)}
                  </Typography>
                </MotionBox>
              );
            })}
          </Stack>
        </Box>
      </Stack>

      <AnimatePresence mode="wait">
        <MotionStack
          key={`mission-${index}`}
          spacing={2}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -36 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            {beatForIndex(index, missions.length)}
          </Typography>

          <MotionBox
            initial={{ scale: 0.96, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              background: isDark
                ? `
                  radial-gradient(circle at 10% 20%, rgba(34,197,94,0.2), transparent 40%),
                  linear-gradient(145deg, #14532d 0%, #0f172a 55%)
                `
                : `
                  radial-gradient(circle at 10% 20%, rgba(34,197,94,0.18), transparent 40%),
                  linear-gradient(145deg, #ecfdf5 0%, #ffffff 55%)
                `,
              boxShadow: '0 14px 32px rgba(15,23,42,0.1)',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <MotionBox
                animate={{ rotate: [0, 12, -8, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'rgba(21,128,61,0.15)',
                  color: '#15803d',
                }}
              >
                <ExploreIcon />
              </MotionBox>
              <Box>
                <Typography variant="caption" fontWeight={800} sx={{ color: '#15803d' }}>
                  Location
                </Typography>
                <Typography fontWeight={900}>{current.title || `Checkpoint ${index + 1}`}</Typography>
              </Box>
            </Stack>
            <Typography sx={{ mt: 0.5, lineHeight: 1.55 }}>{current.prompt}</Typography>
          </MotionBox>

          <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 0.6 }}>
            CHOOSE YOUR ACTION
          </Typography>

          <MotionBox component={Stack} spacing={1} {...choiceListProps}>
            {(current.choices || []).map((choice, choiceIndex) => (
              <MotionButton
                key={`${choice}-${choiceIndex}`}
                variants={choiceItemVariants}
                variant="outlined"
                disabled={feedback?.open || failed}
                onClick={() => choose(choiceIndex)}
                whileTap={{ scale: 0.98 }}
                whileHover={{ x: 8 }}
                sx={{
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  py: 1.35,
                  fontWeight: 700,
                  borderWidth: 2,
                }}
              >
                <Box component="span" sx={{ mr: 1, color: '#15803d', fontWeight: 900 }}>
                  →
                </Box>
                {choice}
              </MotionButton>
            ))}
          </MotionBox>
        </MotionStack>
      </AnimatePresence>

      <AnswerFeedback
        open={feedback?.open}
        isCorrect={feedback?.isCorrect}
        correctAnswer={feedback?.correctAnswer}
        userAnswer={feedback?.userAnswer}
        explanation={feedback?.explanation}
        xpEarned={feedback?.xpEarned}
        score={feedback?.score}
        progress={feedback?.progress}
        message={feedback?.message}
        onNext={handleNext}
        nextLabel={
          (!feedback?.isCorrect && energy <= 1)
            || (feedback?.isCorrect && index + 1 >= missions.length)
            ? 'See Results'
            : 'Continue path'
        }
      />
    </Stack>
  );
}
