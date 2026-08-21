import { useMemo, useState } from 'react';
import { Button, Stack, TextField, Typography, useTheme } from '@mui/material';
import ExtensionIcon from '@mui/icons-material/Extension';
import AnswerFeedback from './AnswerFeedback';
import useAnswerFeedback from '../../hooks/useAnswerFeedback';
import { firstNonEmptyList } from '../../utils/gameDataLists';
import {
  AnimatePresence,
  MotionBox,
  MotionStack,
} from './GameMotion';

function scrambleLetters(answer) {
  const chars = String(answer || '')
    .replace(/\s+/g, '')
    .toUpperCase()
    .slice(0, 8)
    .split('');
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars;
}

export default function PuzzleChallenge({ gameData, onComplete, xpReward = 50 }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const items = useMemo(
    () => firstNonEmptyList(gameData?.items, gameData?.clues),
    [gameData],
  );
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState('');
  const [score, setScore] = useState(0);
  const [responses, setResponses] = useState([]);
  const { feedback, showFeedback, handleNext } = useAnswerFeedback();

  const current = items[index];
  const hintLetters = useMemo(
    () => scrambleLetters(current?.answer),
    // Rescramble only when the puzzle card changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index, current?.answer]
  );

  if (!items.length) {
    return <Typography color="text.secondary">No puzzle challenge items available.</Typography>;
  }

  const perXp = Math.max(5, Math.round(Number(xpReward) / items.length));

  function submit() {
    if (feedback?.open) return;
    const expected = String(current.answer || '').replace(/\s+/g, '').toUpperCase();
    const given = draft.replace(/\s+/g, '').toUpperCase();
    const isCorrect = Boolean(expected && expected === given);
    const nextScore = isCorrect ? Math.min(100, score + Math.round(100 / items.length)) : score;

    showFeedback({
      isCorrect,
      userAnswer: draft || '(blank)',
      correctAnswer: current.answer,
      explanation: isCorrect ? null : (current.hint || 'Try a shorter keyword from the lesson.'),
      xpEarned: isCorrect ? perXp : 0,
      score: nextScore,
      progress: (index + 1) / items.length,
      onNext: () => {
        const nextResponses = [...responses, draft];
        setResponses(nextResponses);
        setScore(nextScore);
        setDraft('');
        if (index + 1 >= items.length) {
          onComplete?.({ score: nextScore, answers: { responses: nextResponses } });
          return;
        }
        setIndex((prev) => prev + 1);
      },
    });
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary" fontWeight={700}>
        Puzzle {index + 1}/{items.length} · Score {score}
      </Typography>

      <AnimatePresence mode="wait">
        <MotionBox
          key={`puzzle-${index}`}
          initial={{ opacity: 0, rotate: -3, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, rotate: 0, y: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 3, y: -16, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          sx={{
            p: 2.5,
            borderRadius: 3,
            border: '2px dashed',
            borderColor: isDark ? 'rgba(217,119,6,0.4)' : 'rgba(180,83,9,0.3)',
            background: isDark
              ? 'linear-gradient(145deg, rgba(120,53,15,0.35), #0f172a)'
              : 'linear-gradient(145deg, #fffbeb, #ffffff)',
            boxShadow: '0 14px 32px rgba(15,23,42,0.08)',
          }}
        >
          <MotionStack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <MotionBox
                animate={{ rotate: [0, -8, 8, 0] }}
                transition={{ duration: 2.8, repeat: Infinity }}
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'rgba(217,119,6,0.15)',
                  color: '#B45309',
                }}
              >
                <ExtensionIcon />
              </MotionBox>
              <Typography variant="h6" fontWeight={800}>{current.prompt}</Typography>
            </Stack>

            {hintLetters.length ? (
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {hintLetters.map((letter, letterIndex) => (
                  <MotionBox
                    key={`${letter}-${letterIndex}`}
                    initial={{ opacity: 0, y: 10, rotate: -10 }}
                    animate={{ opacity: 1, y: 0, rotate: 0 }}
                    transition={{ delay: letterIndex * 0.05 }}
                    sx={{
                      width: 34,
                      height: 40,
                      borderRadius: 1,
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 900,
                      bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#fef3c7',
                      border: '1px solid',
                      borderColor: 'divider',
                      color: '#B45309',
                    }}
                  >
                    {letter}
                  </MotionBox>
                ))}
              </Stack>
            ) : null}

            <TextField
              label="Your answer"
              value={draft}
              disabled={feedback?.open}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
            <Button
              variant="contained"
              disabled={feedback?.open}
              onClick={submit}
              sx={{ fontWeight: 800, bgcolor: '#B45309', '&:hover': { bgcolor: '#92400E' } }}
            >
              Solve puzzle
            </Button>
          </MotionStack>
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
        nextLabel={index + 1 >= items.length ? 'See Results' : 'Next Puzzle'}
      />
    </Stack>
  );
}
