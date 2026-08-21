import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import AnswerFeedback from './AnswerFeedback';
import useAnswerFeedback from '../../hooks/useAnswerFeedback';
import { firstNonEmptyList } from '../../utils/gameDataLists';
import { playSound, SOUND_KEYS, syncMillionaireMusic } from '../../utils/soundEffects';
import { useRegisterTimeoutSubmit } from '../../contexts/GameSessionContext';
import {
  AnimatePresence,
  MotionBox,
  MotionButton,
  MotionStack,
  choiceItemVariants,
  choiceListProps,
} from './GameMotion';

const LADDER = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000];
const LETTERS = ['A', 'B', 'C', 'D'];
const ATTEMPTS_PER_QUESTION = 2;

export default function Millionaire({
  gameData,
  onComplete,
  xpReward = 50,
  sessionTimedOut = false,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const items = useMemo(
    () => firstNonEmptyList(gameData?.items, gameData?.rounds),
    [gameData],
  );
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [choices, setChoices] = useState([]);
  const [attemptsLeft, setAttemptsLeft] = useState(ATTEMPTS_PER_QUESTION);
  const [nextLabel, setNextLabel] = useState('Next Question');
  const submittedRef = useRef(false);
  const { feedback, showFeedback, clearFeedback, handleNext } = useAnswerFeedback();

  useRegisterTimeoutSubmit(() => ({
    score,
    answers: { choices, completed: false },
  }));

  const finish = useCallback((finalScore, finalChoices, reason) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    clearFeedback();
    onComplete?.({
      score: Math.max(0, Math.min(100, Math.round(finalScore))),
      answers: {
        choices: finalChoices,
        timedOut: reason === 'timeout',
        completed: reason === 'complete',
      },
    });
  }, [clearFeedback, onComplete]);

  useEffect(() => {
    if (!items.length || submittedRef.current) return;
    syncMillionaireMusic(index, items.length);
  }, [index, items.length]);

  if (!items.length) {
    return <Typography color="text.secondary">No Millionaire questions available.</Typography>;
  }

  const current = items[index];
  const ladderValue = LADDER[Math.min(index, LADDER.length - 1)];
  const perXp = Math.max(5, Math.round(Number(xpReward) / items.length));
  const visibleLadder = LADDER.slice(0, Math.min(items.length, LADDER.length));

  function answer(choiceIndex) {
    if (feedback?.open || submittedRef.current || sessionTimedOut) return;

    const isCorrect = choiceIndex === current.correctIndex;

    if (isCorrect) {
      const nextScore = Math.min(100, score + Math.round(100 / items.length));
      const nextChoices = [...choices, choiceIndex];
      const finishedAll = index + 1 >= items.length;

      setNextLabel(finishedAll ? 'See Results' : 'Next Question');
      showFeedback({
        isCorrect: true,
        soundKey: SOUND_KEYS.millionaireVictory,
        userAnswer: current.choices?.[choiceIndex],
        correctAnswer: current.choices?.[current.correctIndex],
        explanation: finishedAll
          ? 'You climbed the full ladder!'
          : `Safe at ${ladderValue.toLocaleString()} points!`,
        xpEarned: perXp,
        score: nextScore,
        progress: (index + 1) / items.length,
        onNext: () => {
          setChoices(nextChoices);
          setScore(nextScore);
          if (finishedAll) {
            playSound(SOUND_KEYS.gameComplete);
            finish(nextScore, nextChoices, 'complete');
            return;
          }
          setAttemptsLeft(ATTEMPTS_PER_QUESTION);
          setIndex((prev) => prev + 1);
        },
      });
      return;
    }

    const remaining = attemptsLeft - 1;

    if (remaining > 0) {
      setAttemptsLeft(remaining);
      setNextLabel('Try Again');
      showFeedback({
        isCorrect: false,
        soundKey: SOUND_KEYS.millionaireFail,
        userAnswer: current.choices?.[choiceIndex],
        correctAnswer: null,
        explanation: `Wrong answer. ${remaining} attempt left on this question.`,
        xpEarned: 0,
        score,
        progress: index / items.length,
        onNext: () => {},
      });
      return;
    }

    setNextLabel('Restart Ladder');
    showFeedback({
      isCorrect: false,
      soundKey: SOUND_KEYS.millionaireFail,
      userAnswer: current.choices?.[choiceIndex],
      correctAnswer: current.choices?.[current.correctIndex],
      explanation: 'No attempts left. Back to the start of the ladder!',
      xpEarned: 0,
      score: 0,
      progress: 0,
      onNext: () => {
        setIndex(0);
        setScore(0);
        setChoices([]);
        setAttemptsLeft(ATTEMPTS_PER_QUESTION);
      },
    });
  }

  return (
    <Stack spacing={2} direction={{ xs: 'column', md: 'row' }}>
      <MotionBox
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        sx={{
          width: { xs: '100%', md: 148 },
          flexShrink: 0,
          p: 1.25,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          background: isDark
            ? 'linear-gradient(180deg, #1e293b, #0f172a)'
            : 'linear-gradient(180deg, #fffbeb, #ffffff)',
        }}
      >
        <Typography variant="caption" fontWeight={800} sx={{ display: 'block', mb: 1, color: '#CA8A04' }}>
          Prize ladder
        </Typography>
        <Stack spacing={0.5} sx={{ flexDirection: { xs: 'row', md: 'column-reverse' }, flexWrap: 'wrap' }}>
          {visibleLadder.map((value, ladderIndex) => {
            const isCurrent = ladderIndex === index;
            const isCleared = ladderIndex < index;
            return (
              <MotionBox
                key={value}
                animate={
                  isCurrent
                    ? { scale: [1, 1.06, 1], backgroundColor: isDark ? '#854D0E' : '#FDE68A' }
                    : { scale: 1 }
                }
                transition={{ duration: 0.8, repeat: isCurrent ? Infinity : 0 }}
                sx={{
                  px: 1,
                  py: 0.6,
                  borderRadius: 1,
                  fontSize: 12,
                  fontWeight: 800,
                  textAlign: 'center',
                  minWidth: 64,
                  bgcolor: isCleared
                    ? (isDark ? 'rgba(202,138,4,0.25)' : 'rgba(202,138,4,0.15)')
                    : isCurrent
                      ? 'transparent'
                      : 'action.hover',
                  color: isCurrent || isCleared ? (isDark ? '#FDE68A' : '#854D0E') : 'text.secondary',
                  border: isCurrent ? '1px solid #CA8A04' : '1px solid transparent',
                }}
              >
                {value.toLocaleString()}
              </MotionBox>
            );
          })}
        </Stack>
      </MotionBox>

      <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
        <MotionBox
          key={`hotseat-${index}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: [0.9, 1.05, 1] }}
          transition={{ duration: 0.45 }}
          sx={{
            alignSelf: 'flex-start',
            px: 1.75,
            py: 0.85,
            borderRadius: 999,
            bgcolor: '#CA8A04',
            color: '#1C1917',
            fontWeight: 900,
            letterSpacing: 0.4,
            boxShadow: '0 8px 20px rgba(202,138,4,0.35)',
          }}
        >
          {ladderValue.toLocaleString()} points
        </MotionBox>

        <Typography variant="body2" color="text.secondary">
          Score: {score} · Q{index + 1}/{items.length} · Attempts left: {attemptsLeft}/{ATTEMPTS_PER_QUESTION}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          2 tries per question. Miss both and the ladder resets. Results submit when you finish or when the teacher time limit runs out.
        </Typography>

        <AnimatePresence mode="wait">
          <MotionStack
            key={`m-${index}-${attemptsLeft}`}
            spacing={2}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
            sx={{
              p: 2,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              background: isDark
                ? 'radial-gradient(circle at 50% 0%, rgba(202,138,4,0.2), transparent 50%), #0f172a'
                : 'radial-gradient(circle at 50% 0%, rgba(253,230,138,0.55), transparent 50%), #fff',
            }}
          >
            <Typography variant="h6" fontWeight={800} textAlign="center">
              {current.question}
            </Typography>
            <MotionBox
              component={Stack}
              spacing={1}
              {...choiceListProps}
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}
            >
              {(current.choices || []).map((choice, choiceIndex) => (
                <MotionButton
                  key={`${choice}-${choiceIndex}`}
                  variants={choiceItemVariants}
                  variant="outlined"
                  disabled={feedback?.open || sessionTimedOut}
                  onClick={() => answer(choiceIndex)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  sx={{
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    py: 1.4,
                    borderWidth: 2,
                    fontWeight: 700,
                  }}
                >
                  <Box component="span" sx={{ color: '#CA8A04', fontWeight: 900, mr: 1 }}>
                    {LETTERS[choiceIndex]}.
                  </Box>
                  {choice}
                </MotionButton>
              ))}
            </MotionBox>
          </MotionStack>
        </AnimatePresence>
      </Stack>

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
        nextLabel={nextLabel}
      />
    </Stack>
  );
}
