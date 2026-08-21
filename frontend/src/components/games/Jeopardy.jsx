import { useMemo, useState } from 'react';
import { Button, Stack, TextField, Typography, useTheme } from '@mui/material';
import AnswerFeedback from './AnswerFeedback';
import useAnswerFeedback from '../../hooks/useAnswerFeedback';
import {
  AnimatePresence,
  MotionBox,
  MotionButton,
  MotionPaper,
  MotionStack,
  choiceListProps,
  gridItemVariants,
} from './GameMotion';

export default function Jeopardy({ gameData, onComplete, xpReward = 50 }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const categories = useMemo(() => gameData?.categories || [], [gameData]);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState({});
  const [responses, setResponses] = useState([]);
  const [score, setScore] = useState(0);
  const [draft, setDraft] = useState('');
  const { feedback, showFeedback, handleNext } = useAnswerFeedback();

  const totalClues = categories.reduce((sum, category) => sum + (category.clues?.length || 0), 0);
  const maxPoints = categories.reduce(
    (sum, category) => sum + (category.clues || []).reduce((inner, clueItem) => inner + (Number(clueItem.points) || 100), 0),
    0
  );
  const perClueXp = Math.max(5, Math.round(Number(xpReward) / Math.max(totalClues, 1)));

  if (!categories.length) {
    return <Typography color="text.secondary">No Jeopardy categories available.</Typography>;
  }

  function openClue(categoryIndex, clueIndex) {
    const key = `${categoryIndex}-${clueIndex}`;
    if (answered[key] || feedback?.open) return;
    setSelected({ categoryIndex, clueIndex, key });
    setDraft('');
  }

  function submitClue() {
    if (!selected || feedback?.open) return;
    const clue = categories[selected.categoryIndex].clues[selected.clueIndex];
    const expected = String(clue.answer || '').trim().toLowerCase();
    const given = draft.trim().toLowerCase();
    const isCorrect = Boolean(expected && given === expected);
    const points = Number(clue.points) || 100;
    const nextScore = isCorrect ? score + points : score;
    const nextAnswered = { ...answered, [selected.key]: isCorrect ? 'correct' : 'missed' };
    const percent = maxPoints ? Math.round((nextScore / maxPoints) * 100) : 0;
    const progress = Object.keys(nextAnswered).length / totalClues;

    showFeedback({
      isCorrect,
      userAnswer: draft || '(blank)',
      correctAnswer: clue.answer,
      explanation: clue.explanation || (isCorrect ? null : `The answer is "${clue.answer}".`),
      xpEarned: isCorrect ? perClueXp : 0,
      score: percent,
      progress,
      onNext: () => {
        const nextResponses = [
          ...responses,
          {
            categoryIndex: selected.categoryIndex,
            clueIndex: selected.clueIndex,
            answer: draft,
          },
        ];
        setResponses(nextResponses);
        setScore(nextScore);
        setAnswered(nextAnswered);
        setSelected(null);
        setDraft('');
        if (Object.keys(nextAnswered).length >= totalClues) {
          onComplete?.({ score: percent, answers: { responses: nextResponses } });
        }
      },
    });
  }

  return (
    <Stack spacing={2}>
      <MotionBox
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        sx={{
          alignSelf: 'flex-start',
          px: 1.5,
          py: 0.75,
          borderRadius: 2,
          bgcolor: isDark ? '#1e3a8a' : '#1d4ed8',
          color: '#fff',
          fontWeight: 900,
          letterSpacing: 0.6,
        }}
      >
        Score: {score}
      </MotionBox>

      <MotionStack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1}
        {...choiceListProps}
      >
        {categories.map((category, categoryIndex) => (
          <MotionPaper
            key={category.name || categoryIndex}
            variants={gridItemVariants}
            custom={categoryIndex}
            sx={{
              p: 1.25,
              flex: 1,
              bgcolor: isDark ? '#0f172a' : '#1e3a8a',
              color: '#fff',
              border: '2px solid',
              borderColor: isDark ? '#1e40af' : '#1e40af',
            }}
          >
            <Typography fontWeight={900} sx={{ mb: 1, textAlign: 'center', color: '#FDE68A' }}>
              {category.name}
            </Typography>
            <Stack spacing={1}>
              {(category.clues || []).map((clue, clueIndex) => {
                const key = `${categoryIndex}-${clueIndex}`;
                const state = answered[key];
                return (
                  <MotionButton
                    key={key}
                    disabled={Boolean(state) || feedback?.open}
                    onClick={() => openClue(categoryIndex, clueIndex)}
                    whileHover={{ scale: state ? 1 : 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    animate={
                      state === 'correct'
                        ? { scale: [1, 1.08, 1], rotateY: [0, 180, 360] }
                        : state
                          ? { opacity: 0.45 }
                          : { opacity: 1 }
                    }
                    transition={{ duration: 0.5 }}
                    sx={{
                      py: 1.4,
                      fontWeight: 900,
                      fontSize: '1.05rem',
                      bgcolor: state === 'correct'
                        ? '#15803d'
                        : state === 'missed'
                          ? '#7f1d1d'
                          : (isDark ? '#1e40af' : '#2563eb'),
                      color: '#FDE68A',
                      border: 'none',
                      '&:hover': {
                        bgcolor: state ? undefined : '#3b82f6',
                      },
                      '&.Mui-disabled': {
                        color: '#FDE68A',
                        opacity: state ? 0.55 : 1,
                      },
                    }}
                  >
                    {state ? (state === 'correct' ? '✓' : '—') : (clue.points || (clueIndex + 1) * 100)}
                  </MotionButton>
                );
              })}
            </Stack>
          </MotionPaper>
        ))}
      </MotionStack>

      <AnimatePresence>
        {selected ? (
          <MotionPaper
            key={selected.key}
            initial={{ opacity: 0, rotateX: -70, y: 24 }}
            animate={{ opacity: 1, rotateX: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            sx={{
              p: 2.5,
              bgcolor: isDark ? '#0f172a' : '#1e3a8a',
              color: '#fff',
              border: '3px solid #FDE68A',
            }}
          >
            <Typography variant="overline" sx={{ color: '#FDE68A', fontWeight: 800 }}>
              Clue for {categories[selected.categoryIndex].clues[selected.clueIndex].points || 100}
            </Typography>
            <Typography sx={{ mb: 2, mt: 0.5, fontWeight: 700, fontSize: '1.1rem' }}>
              {categories[selected.categoryIndex].clues[selected.clueIndex].clue}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                fullWidth
                size="small"
                label="Your answer"
                value={draft}
                disabled={feedback?.open}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submitClue();
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(253,230,138,0.4)' },
                  },
                  '& .MuiInputLabel-root': { color: 'rgba(253,230,138,0.75)' },
                }}
              />
              <Button
                variant="contained"
                disabled={feedback?.open}
                onClick={submitClue}
                sx={{ bgcolor: '#CA8A04', color: '#1c1917', fontWeight: 800, '&:hover': { bgcolor: '#EAB308' } }}
              >
                Submit
              </Button>
            </Stack>
          </MotionPaper>
        ) : null}
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
        nextLabel={Object.keys(answered).length + 1 >= totalClues ? 'See Results' : 'Continue'}
      />
    </Stack>
  );
}
