import { useMemo, useState } from 'react';
import { Button, Paper, Stack, Typography } from '@mui/material';
import AnswerFeedback from './AnswerFeedback';
import useAnswerFeedback from '../../hooks/useAnswerFeedback';

export default function Flashcards({ gameData, onComplete, xpReward = 50 }) {
  const items = useMemo(
    () => gameData?.items || gameData?.pairs || [],
    [gameData]
  );
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [remembered, setRemembered] = useState([]);
  const { feedback, showFeedback, handleNext } = useAnswerFeedback();

  if (!items.length) {
    return <Typography color="text.secondary">No flashcard items available.</Typography>;
  }

  const current = items[index];
  const perCardXp = Math.max(5, Math.round(Number(xpReward) / items.length));

  function next(gotIt) {
    if (feedback?.open) return;
    const nextKnown = gotIt ? known + 1 : known;
    const nextScore = Math.round((nextKnown / items.length) * 100);
    const definition = current.definition || current.back || '';

    showFeedback({
      isCorrect: gotIt,
      userAnswer: gotIt ? 'Got it' : 'Still learning',
      correctAnswer: definition,
      explanation: gotIt
        ? null
        : `Review this concept: ${current.term || current.front} — ${definition}`,
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
        setFlipped(false);
        setIndex((prev) => prev + 1);
      },
    });
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Card {index + 1} of {items.length}
      </Typography>
      <Paper
        onClick={() => setFlipped((prev) => !prev)}
        sx={{
          p: 4,
          minHeight: 180,
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          bgcolor: flipped ? 'rgba(15,118,110,0.08)' : 'background.paper',
        }}
      >
        <Typography variant="h6" textAlign="center">
          {flipped ? (current.definition || current.back) : (current.term || current.front)}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
          Tap to flip
        </Typography>
      </Paper>
      <Stack direction="row" spacing={1}>
        <Button variant="outlined" disabled={feedback?.open} onClick={() => next(false)}>
          Still learning
        </Button>
        <Button variant="contained" disabled={feedback?.open} onClick={() => next(true)}>
          Got it
        </Button>
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
        nextLabel={index + 1 >= items.length ? 'See Results' : 'Next Card'}
      />
    </Stack>
  );
}
