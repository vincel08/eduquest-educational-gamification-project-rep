import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  LinearProgress,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import StyleOutlinedIcon from '@mui/icons-material/StyleOutlined';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import useAnswerFeedback from '../../hooks/useAnswerFeedback';
import { useRegisterTimeoutSubmit } from '../../contexts/GameSessionContext';
import {
  useRestoredGameProgress,
  useSaveGameProgress,
} from '../../hooks/useGamePlayProgress';
import { firstNonEmptyList } from '../../utils/gameDataLists';
import {
  AnimatePresence,
  MotionBox,
  MotionButton,
} from './GameMotion';

function expectedDefinition(item) {
  return String(item?.definition || item?.back || item?.answer || '').trim();
}

function expectedTerm(item) {
  return String(item?.term || item?.front || item?.prompt || '').trim();
}

function normalizeAnswer(value) {
  return String(value || '').trim().toLowerCase();
}

function scoreFromResponses(items, responses) {
  if (!items.length) return 0;
  let correct = 0;
  items.forEach((item, index) => {
    if (
      normalizeAnswer(responses[index]) === normalizeAnswer(expectedTerm(item))
    ) {
      correct += 1;
    }
  });
  return Math.round((correct / items.length) * 100);
}

export default function Flashcards({ gameData, onComplete, xpReward = 50 }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const items = useMemo(
    () => firstNonEmptyList(gameData?.items, gameData?.pairs),
    [gameData],
  );
  const saved = useRestoredGameProgress();
  const restoredResponses = Array.isArray(saved.responses) ? saved.responses : [];
  const restoredFlags = Array.isArray(saved.correctFlags) ? saved.correctFlags : [];
  const [index, setIndex] = useState(() => {
    const maxIdx = Math.max(0, items.length - 1);
    const fromSaved = Number(saved.index);
    const aligned =
      Number.isFinite(fromSaved) && fromSaved === restoredResponses.length
        ? fromSaved
        : restoredResponses.length;
    return Math.max(0, Math.min(aligned, maxIdx));
  });
  const [draft, setDraft] = useState(() => String(saved.draft || ''));
  const [flipped, setFlipped] = useState(false);
  const [responses, setResponses] = useState(() => restoredResponses);
  const [correctFlags, setCorrectFlags] = useState(() =>
    restoredFlags.slice(0, restoredResponses.length),
  );
  const { feedback, showFeedback, handleNext } = useAnswerFeedback({
    autoAdvanceMs: 0,
  });

  useSaveGameProgress(
    () => ({ index, draft, responses, correctFlags }),
    [index, draft, responses, correctFlags],
  );

  useRegisterTimeoutSubmit(() => {
    const filled = [...responses];
    if (filled.length === index) {
      filled.push(draft);
    }
    while (filled.length < items.length) {
      filled.push('');
    }
    return {
      score: scoreFromResponses(items, filled),
      answers: { responses: filled },
    };
  });

  const skipIndexResetRef = useRef(true);
  useEffect(() => {
    if (skipIndexResetRef.current) {
      skipIndexResetRef.current = false;
      return;
    }
    setDraft('');
    setFlipped(false);
  }, [index]);

  useEffect(() => {
    if (feedback?.open) {
      setFlipped(true);
    }
  }, [feedback?.open]);

  useEffect(() => {
    if (!feedback?.open) return undefined;
    function onKey(event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleNext();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [feedback?.open, handleNext]);

  if (!items.length) {
    return (
      <Typography color="text.secondary">No flashcard items available.</Typography>
    );
  }

  const current = items[index];
  const prompt = expectedDefinition(current);
  const answer = expectedTerm(current);
  const perCardXp = Math.max(5, Math.round(Number(xpReward) / items.length));
  const progress = (index / items.length) * 100;
  const known = correctFlags.filter(Boolean).length;
  const answered = Boolean(feedback?.open);
  const isCorrect = Boolean(feedback?.isCorrect);
  const resultColor = isCorrect ? '#16A34A' : '#DC2626';
  const nextLabel = index + 1 >= items.length ? 'See Results' : 'Next Card';
  const cardMinHeight = answered ? 460 : 400;

  function submit() {
    if (feedback?.open) return;
    const userAnswer = draft.trim();
    const correct =
      normalizeAnswer(userAnswer) === normalizeAnswer(answer) && Boolean(answer);
    const nextResponses = [...responses, userAnswer];
    const nextFlags = [...correctFlags, correct];
    const nextScore = scoreFromResponses(items, nextResponses);

    setResponses(nextResponses);
    setCorrectFlags(nextFlags);
    setFlipped(true);

    showFeedback({
      isCorrect: correct,
      userAnswer: userAnswer || '(blank)',
      correctAnswer: answer,
      explanation: null,
      xpEarned: correct ? perCardXp : 0,
      score: nextScore,
      progress: (index + 1) / items.length,
      onNext: () => {
        if (index + 1 >= items.length) {
          onComplete?.({
            score: nextScore,
            answers: { responses: nextResponses },
          });
          return;
        }
        setIndex((prev) => prev + 1);
      },
    });
  }

  return (
    <Stack spacing={2.5}>
      <Stack spacing={1}>
        <Typography variant="body2" color="text.secondary" fontWeight={700}>
          Card {index + 1} of {items.length} · Correct {known}
        </Typography>
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
        <Stack
          direction="row"
          spacing={0.75}
          justifyContent="flex-start"
          flexWrap="wrap"
          useFlexGap
        >
          {items.map((_, i) => (
            <MotionBox
              key={`dot-${i}`}
              animate={{
                scale: i === index ? 1.25 : 1,
                backgroundColor:
                  i < index
                    ? correctFlags[i]
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
          perspective: 1400,
          display: 'flex',
          justifyContent: 'center',
          px: 1,
        }}
      >
        <AnimatePresence mode="wait">
          <MotionBox
            key={`card-${index}`}
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            sx={{
              position: 'relative',
              width: '100%',
              maxWidth: 380,
              minHeight: cardMinHeight,
              aspectRatio: answered ? 'auto' : '3 / 4',
            }}
          >
            <MotionBox
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformStyle: 'preserve-3d' }}
              sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: cardMinHeight,
              }}
            >
              {/* Front — definition (question) + type answer */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  borderRadius: '18px',
                  p: { xs: 2.5, sm: 3 },
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  justifyContent: 'space-between',
                  textAlign: 'center',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(148,163,184,0.22)' : 'rgba(15,23,42,0.08)',
                  background: isDark
                    ? `radial-gradient(circle at 18% 12%, rgba(13,148,136,0.28), transparent 42%),
                       linear-gradient(165deg, #1e293b 0%, #0f172a 100%)`
                    : `radial-gradient(circle at 18% 12%, rgba(13,148,136,0.16), transparent 42%),
                       linear-gradient(165deg, #ffffff 0%, #f1f5f9 100%)`,
                  boxShadow: isDark
                    ? '0 22px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04) inset'
                    : '0 22px 48px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(255,255,255,0.7) inset',
                  color: 'text.primary',
                }}
              >
                <Box>
                  <Box sx={{ display: 'grid', placeItems: 'center', mb: 1 }}>
                    <MotionBox
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2.5,
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: 'rgba(13,148,136,0.14)',
                        color: '#0F766E',
                      }}
                    >
                      <StyleOutlinedIcon />
                    </MotionBox>
                  </Box>
                  <Typography
                    variant="overline"
                    sx={{ letterSpacing: 1.2, color: 'text.secondary', mb: 1, display: 'block' }}
                  >
                    Definition
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={800}
                    sx={{
                      lineHeight: 1.35,
                      px: 0.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 6,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {prompt}
                  </Typography>
                </Box>

                <Box sx={{ mt: 2.5 }}>
                  <TextField
                    label="Type answer"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        submit();
                      }
                    }}
                    fullWidth
                    autoComplete="off"
                    size="small"
                  />
                  <MotionButton
                    variant="contained"
                    fullWidth
                    disabled={!draft.trim()}
                    onClick={submit}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.97 }}
                    sx={{
                      mt: 1.25,
                      py: 1.15,
                      fontWeight: 800,
                      borderRadius: 2.5,
                      bgcolor: '#0D9488',
                      '&:hover': { bgcolor: '#0F766E' },
                    }}
                  >
                    Check answer
                  </MotionButton>
                </Box>
              </Box>

              {/* Back — result on the card */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  borderRadius: '18px',
                  p: { xs: 2.25, sm: 2.75 },
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  justifyContent: 'center',
                  textAlign: 'center',
                  overflow: 'auto',
                  border: `1px solid ${resultColor}66`,
                  background: isCorrect
                    ? isDark
                      ? `linear-gradient(145deg, rgba(22,163,74,0.28), rgba(15,118,110,0.55), rgba(15,23,42,0.92))`
                      : `linear-gradient(145deg, rgba(34,197,94,0.22), rgba(250,204,21,0.18), #f0fdf4)`
                    : isDark
                      ? `linear-gradient(145deg, rgba(220,38,38,0.28), rgba(127,29,29,0.45), rgba(15,23,42,0.92))`
                      : `linear-gradient(145deg, rgba(220,38,38,0.16), rgba(254,226,226,0.85), #fff)`,
                  boxShadow: isDark
                    ? `0 22px 48px ${resultColor}33`
                    : `0 22px 48px ${resultColor}28`,
                  color: isDark ? '#F8FAFC' : 'text.primary',
                }}
              >
                <Box sx={{ display: 'grid', placeItems: 'center', mb: 0.5 }}>
                  {isCorrect ? (
                    <CheckCircleRoundedIcon sx={{ fontSize: 48, color: resultColor }} />
                  ) : (
                    <CancelRoundedIcon sx={{ fontSize: 48, color: resultColor }} />
                  )}
                </Box>

                <Typography variant="h6" fontWeight={900} sx={{ color: resultColor }}>
                  {isCorrect ? 'Correct!' : 'Incorrect'}
                </Typography>

                {feedback?.message ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {feedback.message}
                  </Typography>
                ) : null}

                <Typography
                  variant="overline"
                  sx={{ letterSpacing: 1.1, mt: 1.5, opacity: 0.8 }}
                >
                  Term
                </Typography>
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  sx={{ lineHeight: 1.4, px: 0.5 }}
                >
                  {answer}
                </Typography>

                <Stack spacing={0.75} sx={{ mt: 1.75, textAlign: 'left' }}>
                  <Typography variant="body2">
                    Your answer:{' '}
                    <strong>{String(feedback?.userAnswer || '')}</strong>
                  </Typography>
                  {feedback?.xpEarned > 0 ? (
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      sx={{ color: resultColor }}
                    >
                      +{feedback.xpEarned} XP earned
                    </Typography>
                  ) : null}
                  <Typography variant="body2">
                    Current Score: <strong>{feedback?.score ?? 0}</strong>
                  </Typography>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Progress {Math.round((feedback?.progress || 0) * 100)}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.max(
                        0,
                        Math.min(100, (feedback?.progress || 0) * 100),
                      )}
                      sx={{
                        mt: 0.5,
                        height: 8,
                        borderRadius: 999,
                        bgcolor: 'action.hover',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 999,
                          bgcolor: resultColor,
                        },
                      }}
                    />
                  </Box>
                </Stack>

                <MotionButton
                  variant="contained"
                  fullWidth
                  onClick={handleNext}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  sx={{
                    mt: 2,
                    py: 1.15,
                    fontWeight: 800,
                    borderRadius: 2.5,
                    bgcolor: resultColor,
                    '&:hover': { bgcolor: resultColor, filter: 'brightness(0.92)' },
                  }}
                >
                  {nextLabel}
                </MotionButton>
              </Box>
            </MotionBox>
          </MotionBox>
        </AnimatePresence>
      </Box>
    </Stack>
  );
}
