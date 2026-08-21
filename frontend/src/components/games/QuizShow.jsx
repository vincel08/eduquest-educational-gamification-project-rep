import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, LinearProgress, Stack, Typography, useTheme } from '@mui/material';
import AnswerFeedback from './AnswerFeedback';
import useAnswerFeedback from '../../hooks/useAnswerFeedback';
import { firstNonEmptyList } from '../../utils/gameDataLists';
import { playSound, SOUND_KEYS } from '../../utils/soundEffects';
import {
  AnimatePresence,
  MotionBox,
  MotionButton,
  choiceItemVariants,
  choiceListProps,
} from './GameMotion';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const QUESTION_SECONDS = 30;
const UNANSWERED = -1;

export default function QuizShow({ gameData, onComplete, xpReward = 50 }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const rounds = useMemo(() => {
    const fromRounds = firstNonEmptyList(gameData?.rounds);
    if (fromRounds.length) return fromRounds;
    return (gameData?.items || []).map((item) => ({
      prompt: item.question || item.prompt,
      choices: item.choices || [],
      correctIndex: item.correctIndex ?? 0,
      explanation: item.explanation || null,
    }));
  }, [gameData]);

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [choices, setChoices] = useState([]);
  const [locked, setLocked] = useState(false);
  const [pressed, setPressed] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_SECONDS);
  const resolvedRef = useRef(false);
  const stateRef = useRef({ score: 0, choices: [], index: 0 });
  const { feedback, showFeedback, handleNext } = useAnswerFeedback();

  useEffect(() => {
    stateRef.current = { score, choices, index };
  }, [score, choices, index]);

  const advance = useCallback((choiceIndex, nextScore, fromTimeout = false) => {
    const latest = stateRef.current;
    const questionIndex = latest.index;
    const round = rounds[questionIndex];
    const nextChoices = [...latest.choices, choiceIndex];
    const isCorrect = choiceIndex !== UNANSWERED && choiceIndex === round?.correctIndex;
    const correctLabel = round?.choices?.[round?.correctIndex] ?? '';
    const perQuestionXp = Math.max(5, Math.round(Number(xpReward) / Math.max(rounds.length, 1)));

    showFeedback({
      isCorrect,
      silent: fromTimeout,
      soundKey: fromTimeout ? undefined : (isCorrect ? SOUND_KEYS.correct : SOUND_KEYS.wrong),
      userAnswer: fromTimeout ? 'No answer' : (round?.choices?.[choiceIndex] ?? ''),
      correctAnswer: correctLabel,
      explanation: fromTimeout
        ? 'Time is up — moving to the next question.'
        : (round?.explanation || (isCorrect ? null : `The correct choice is "${correctLabel}".`)),
      xpEarned: isCorrect ? perQuestionXp : 0,
      score: nextScore,
      progress: (questionIndex + 1) / rounds.length,
      autoAdvanceMs: fromTimeout ? 1200 : undefined,
      onNext: () => {
        setChoices(nextChoices);
        setScore(nextScore);
        setLocked(false);
        setPressed(null);
        if (questionIndex + 1 >= rounds.length) {
          onComplete?.({ score: nextScore, answers: { choices: nextChoices } });
          return;
        }
        setIndex(questionIndex + 1);
      },
    });
  }, [onComplete, rounds, showFeedback, xpReward]);

  // Reset the 30s clock whenever a new question starts.
  useEffect(() => {
    if (!rounds.length) return undefined;
    resolvedRef.current = false;
    setSecondsLeft(QUESTION_SECONDS);
    setLocked(false);
    setPressed(null);

    const timer = setInterval(() => {
      if (resolvedRef.current) return;
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [index, rounds.length]);

  // Time expired → treat as unanswered and move on.
  useEffect(() => {
    if (secondsLeft > 0 || resolvedRef.current || !rounds.length) return;
    resolvedRef.current = true;
    setLocked(true);
    playSound(SOUND_KEYS.timeout);
    advance(UNANSWERED, stateRef.current.score, true);
  }, [secondsLeft, rounds.length, advance]);

  useEffect(() => {
    if (locked || feedback?.open || resolvedRef.current) return;
    if (secondsLeft === 5 || secondsLeft === 3 || secondsLeft === 1) {
      playSound(SOUND_KEYS.timerUrgent);
    }
  }, [secondsLeft, locked, feedback?.open]);

  if (!rounds.length) {
    return <Typography color="text.secondary">No quiz show questions available.</Typography>;
  }

  const current = rounds[index];
  const points = Math.round(100 / rounds.length);
  const timeUrgent = secondsLeft <= 5;

  function answer(choiceIndex) {
    if (locked || feedback?.open || resolvedRef.current) return;
    resolvedRef.current = true;
    setLocked(true);
    setPressed(choiceIndex);

    const isCorrect = choiceIndex === current.correctIndex;
    const nextScore = isCorrect ? Math.min(100, score + points) : score;
    advance(choiceIndex, nextScore, false);
  }

  return (
    <Stack spacing={2}>
      <Stack spacing={1}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          useFlexGap
          flexWrap="wrap"
          spacing={1}
        >
          <Typography variant="body2" color="text.secondary" fontWeight={700}>
            Question {index + 1} / {rounds.length}
          </Typography>
          <Box
            sx={{
              px: 1.25,
              py: 0.4,
              borderRadius: 999,
              border: '1px solid',
              borderColor: timeUrgent ? 'error.main' : 'divider',
              bgcolor: timeUrgent
                ? (isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.08)')
                : 'action.hover',
              color: timeUrgent ? 'error.main' : 'text.primary',
              fontWeight: 800,
              fontVariantNumeric: 'tabular-nums',
              fontSize: 13,
            }}
          >
            {secondsLeft}s
          </Box>
          <Typography variant="body2" color="text.secondary" fontWeight={700}>
            Score {score}
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={(secondsLeft / QUESTION_SECONDS) * 100}
          sx={{
            height: 8,
            borderRadius: 999,
            bgcolor: 'action.hover',
            '& .MuiLinearProgress-bar': {
              borderRadius: 999,
              bgcolor: timeUrgent ? 'error.main' : '#EA580C',
            },
          }}
        />
        <Typography variant="caption" color="text.secondary">
          30 seconds per question — unanswered questions move on automatically.
        </Typography>
      </Stack>

      <AnimatePresence mode="wait">
        <MotionBox
          key={`studio-${index}`}
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, y: -14, scale: 0.98 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            background: isDark
              ? 'radial-gradient(ellipse at 50% 0%, rgba(234,88,12,0.22), transparent 55%), linear-gradient(180deg, #1e293b, #0f172a)'
              : 'radial-gradient(ellipse at 50% 0%, rgba(234,88,12,0.14), transparent 55%), linear-gradient(180deg, #fff7ed, #ffffff)',
            boxShadow: '0 16px 36px rgba(15,23,42,0.1)',
          }}
        >
          <MotionBox
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            sx={{
              mb: 2.5,
              p: 2,
              borderRadius: 2,
              bgcolor: isDark ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.85)',
              border: '1px solid',
              borderColor: 'divider',
              textAlign: 'center',
            }}
          >
            <Typography variant="overline" sx={{ letterSpacing: 1.4, color: '#EA580C', fontWeight: 800 }}>
              Live round
            </Typography>
            <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5 }}>
              {current.prompt}
            </Typography>
          </MotionBox>

          <MotionBox component={Stack} spacing={1.25} {...choiceListProps}>
            {(current.choices || []).map((choice, choiceIndex) => {
              const isPressed = pressed === choiceIndex;
              return (
                <MotionButton
                  key={`${choice}-${choiceIndex}`}
                  variants={choiceItemVariants}
                  variant="outlined"
                  disabled={locked || feedback?.open}
                  onClick={() => answer(choiceIndex)}
                  whileHover={{ scale: 1.015, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  animate={isPressed ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                  sx={{
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    py: 1.35,
                    px: 1.5,
                    borderWidth: 2,
                    borderColor: isPressed ? '#EA580C' : 'divider',
                    bgcolor: isPressed
                      ? (isDark ? 'rgba(234,88,12,0.2)' : 'rgba(234,88,12,0.08)')
                      : 'background.paper',
                    fontWeight: 700,
                  }}
                  startIcon={
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        bgcolor: '#EA580C',
                        color: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 13,
                        fontWeight: 900,
                      }}
                    >
                      {LETTERS[choiceIndex] || choiceIndex + 1}
                    </Box>
                  }
                >
                  {choice}
                </MotionButton>
              );
            })}
          </MotionBox>
        </MotionBox>
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
        nextLabel={index + 1 >= rounds.length ? 'See Results' : 'Next Question'}
      />
    </Stack>
  );
}
