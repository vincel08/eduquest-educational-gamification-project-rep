import { useEffect, useMemo, useState } from 'react';
import { Box, LinearProgress, Stack, Typography, useTheme } from '@mui/material';
import StyleOutlinedIcon from '@mui/icons-material/StyleOutlined';
import AnswerFeedback from './AnswerFeedback';
import useAnswerFeedback from '../../hooks/useAnswerFeedback';
import { useRegisterTimeoutSubmit } from '../../contexts/GameSessionContext';
import { firstNonEmptyList } from '../../utils/gameDataLists';
import {
  AnimatePresence,
  MotionBox,
  MotionButton,
  MotionStack,
} from './GameMotion';

export default function Flashcards({ gameData, onComplete, xpReward = 50 }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const items = useMemo(
    () => firstNonEmptyList(gameData?.items, gameData?.pairs),
    [gameData]
  );
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [remembered, setRemembered] = useState([]);
  const [exitDir, setExitDir] = useState(0);
  const { feedback, showFeedback, handleNext } = useAnswerFeedback();
  useRegisterTimeoutSubmit(() => ({
    score: Math.round((known / Math.max(items.length, 1)) * 100),
    answers: { remembered },
  }));

  useEffect(() => {
    setExitDir(0);
    setFlipped(false);
  }, [index]);

  if (!items.length) {
    return <Typography color="text.secondary">No flashcard items available.</Typography>;
  }

  const current = items[index];
  const perCardXp = Math.max(5, Math.round(Number(xpReward) / items.length));
  const progress = (index / items.length) * 100;
  const front = current.term || current.front || '';
  const back = current.definition || current.back || '';

  function next(gotIt) {
    if (feedback?.open) return;
    const nextKnown = gotIt ? known + 1 : known;
    const nextScore = Math.round((nextKnown / items.length) * 100);

    setExitDir(gotIt ? 1 : -1);

    showFeedback({
      isCorrect: gotIt,
      userAnswer: gotIt ? 'Got it' : 'Still learning',
      correctAnswer: back,
      explanation: gotIt
        ? null
        : `Review this concept: ${front} — ${back}`,
      xpEarned: gotIt ? perCardXp : 0,
      score: nextScore,
      progress: (index + 1) / items.length,
      onNext: () => {
        const nextRemembered = [...remembered, Boolean(gotIt)];
        setRemembered(nextRemembered);
        if (index + 1 >= items.length) {
          onComplete?.({ score: nextScore, answers: { remembered: nextRemembered } });
          return;
        }
        setKnown(nextKnown);
        setIndex((prev) => prev + 1);
      },
    });
  }

  return (
    <Stack spacing={2.5}>
      <Stack spacing={1}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary" fontWeight={700}>
            Card {index + 1} of {items.length}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Known {known}
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 8,
            borderRadius: 999,
            bgcolor: 'action.hover',
            '& .MuiLinearProgress-bar': {
              borderRadius: 999,
              bgcolor: '#0D9488',
            },
          }}
        />
        <Stack direction="row" spacing={0.75} justifyContent="center" flexWrap="wrap" useFlexGap>
          {items.map((_, i) => (
            <MotionBox
              key={`dot-${i}`}
              animate={{
                scale: i === index ? 1.25 : 1,
                backgroundColor:
                  i < index
                    ? remembered[i]
                      ? '#0D9488'
                      : '#F59E0B'
                    : i === index
                      ? '#0F766E'
                      : 'rgba(148,163,184,0.45)',
              }}
              transition={{ type: 'spring', stiffness: 380, damping: 22 }}
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
              }}
            />
          ))}
        </Stack>
      </Stack>

      <Box
        sx={{
          position: 'relative',
          minHeight: { xs: 240, sm: 280 },
          perspective: 1200,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {/* Deck depth behind current card */}
        {index + 1 < items.length ? (
          <Box
            sx={{
              position: 'absolute',
              width: { xs: '92%', sm: 420 },
              height: { xs: 210, sm: 250 },
              borderRadius: 4,
              bgcolor: 'action.hover',
              border: '1px solid',
              borderColor: 'divider',
              transform: 'translateY(14px) scale(0.96)',
              zIndex: 0,
            }}
          />
        ) : null}
        {index + 2 < items.length ? (
          <Box
            sx={{
              position: 'absolute',
              width: { xs: '88%', sm: 400 },
              height: { xs: 200, sm: 240 },
              borderRadius: 4,
              bgcolor: 'action.selected',
              border: '1px solid',
              borderColor: 'divider',
              transform: 'translateY(26px) scale(0.92)',
              zIndex: 0,
              opacity: 0.7,
            }}
          />
        ) : null}

        <AnimatePresence mode="wait" custom={exitDir}>
          <MotionBox
            key={`flash-${index}`}
            custom={exitDir}
            initial={{ opacity: 0, y: 28, rotate: -4, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
            exit={(dir) => ({
              opacity: 0,
              x: dir === 0 ? 0 : dir * 160,
              y: dir === 0 ? -20 : 12,
              rotate: dir === 0 ? 0 : dir * 12,
              scale: 0.9,
            })}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            sx={{
              position: 'relative',
              zIndex: 1,
              width: { xs: '100%', sm: 440 },
              height: { xs: 230, sm: 270 },
              cursor: feedback?.open ? 'default' : 'pointer',
              transformStyle: 'preserve-3d',
            }}
            onClick={() => {
              if (feedback?.open) return;
              setFlipped((prev) => !prev);
            }}
          >
            <MotionBox
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              whileHover={feedback?.open ? undefined : { y: -4 }}
              whileTap={feedback?.open ? undefined : { scale: 0.985 }}
              style={{ transformStyle: 'preserve-3d' }}
              sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
              }}
            >
              {/* Front */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  borderRadius: 4,
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  border: '1px solid',
                  borderColor: 'divider',
                  background: isDark
                    ? `radial-gradient(circle at 20% 15%, rgba(13,148,136,0.22), transparent 45%),
                       linear-gradient(160deg, #1e293b 0%, #0f172a 100%)`
                    : `radial-gradient(circle at 20% 15%, rgba(13,148,136,0.14), transparent 45%),
                       linear-gradient(160deg, #ffffff 0%, #f8fafc 100%)`,
                  boxShadow: isDark
                    ? '0 18px 40px rgba(0,0,0,0.35)'
                    : '0 18px 40px rgba(15, 23, 42, 0.12)',
                  color: 'text.primary',
                }}
              >
                <MotionBox
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2.5,
                    mb: 1.5,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: 'rgba(13,148,136,0.14)',
                    color: '#0F766E',
                  }}
                >
                  <StyleOutlinedIcon />
                </MotionBox>
                <Typography variant="overline" sx={{ letterSpacing: 1.2, color: 'text.secondary', mb: 1 }}>
                  Term
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.3, px: 1 }}>
                  {front}
                </Typography>
                <MotionBox
                  animate={{ opacity: [0.55, 1, 0.55] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                    Tap to flip
                  </Typography>
                </MotionBox>
              </Box>

              {/* Back */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  borderRadius: 4,
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  border: '1px solid',
                  borderColor: 'rgba(13,148,136,0.35)',
                  background: isDark
                    ? `radial-gradient(circle at 80% 20%, rgba(245,158,11,0.18), transparent 40%),
                       linear-gradient(160deg, #134e4a 0%, #115e59 55%, #0f766e 100%)`
                    : `radial-gradient(circle at 80% 20%, rgba(245,158,11,0.16), transparent 40%),
                       linear-gradient(160deg, #ecfdf5 0%, #ccfbf1 55%, #f0fdfa 100%)`,
                  boxShadow: isDark
                    ? '0 18px 40px rgba(0,0,0,0.4)'
                    : '0 18px 40px rgba(13, 148, 136, 0.2)',
                  color: isDark ? '#ECFDF5' : '#134E4A',
                }}
              >
                <Typography variant="overline" sx={{ letterSpacing: 1.2, opacity: 0.8, mb: 1 }}>
                  Definition
                </Typography>
                <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.45, px: 1 }}>
                  {back}
                </Typography>
                <Typography variant="caption" sx={{ mt: 2, opacity: 0.75, display: 'block' }}>
                  Tap to flip back
                </Typography>
              </Box>
            </MotionBox>
          </MotionBox>
        </AnimatePresence>
      </Box>

      <MotionStack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.25}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <MotionButton
          variant="outlined"
          fullWidth
          disabled={feedback?.open}
          onClick={() => next(false)}
          whileHover={{ x: -4 }}
          whileTap={{ scale: 0.97 }}
          sx={{ py: 1.25, fontWeight: 800 }}
        >
          Still learning
        </MotionButton>
        <MotionButton
          variant="contained"
          fullWidth
          disabled={feedback?.open}
          onClick={() => next(true)}
          whileHover={{ x: 4, scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          sx={{
            py: 1.25,
            fontWeight: 800,
            bgcolor: '#0D9488',
            '&:hover': { bgcolor: '#0F766E' },
          }}
        >
          Got it
        </MotionButton>
      </MotionStack>

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
        nextLabel={index + 1 >= items.length ? 'See Results' : 'Next Card'}
      />
    </Stack>
  );
}
