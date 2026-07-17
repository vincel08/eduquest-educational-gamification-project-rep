import { useMemo, useState } from 'react';
import { Button, Stack, TextField, Typography } from '@mui/material';
import AnswerFeedback from './AnswerFeedback';
import useAnswerFeedback from '../../hooks/useAnswerFeedback';

export default function EscapeRoom({ gameData, onComplete, xpReward = 50 }) {
  const stages = useMemo(() => gameData?.stages || [], [gameData]);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState('');
  const [score, setScore] = useState(0);
  const { feedback, showFeedback, handleNext } = useAnswerFeedback();

  if (!stages.length) {
    return <Typography color="text.secondary">No escape room stages available.</Typography>;
  }

  const current = stages[index];
  const perXp = Math.max(5, Math.round(Number(xpReward) / stages.length));

  function submit() {
    if (feedback?.open) return;
    const expected = String(current.answer || '').trim().toLowerCase();
    const given = draft.trim().toLowerCase();
    const isCorrect = Boolean(expected && given === expected);
    const nextScore = isCorrect ? Math.min(100, score + Math.round(100 / stages.length)) : score;

    showFeedback({
      isCorrect,
      userAnswer: draft || '(blank)',
      correctAnswer: current.answer,
      explanation: isCorrect ? null : (current.hint || `The code is related to: ${current.clue}`),
      xpEarned: isCorrect ? perXp : 0,
      score: nextScore,
      progress: (index + 1) / stages.length,
      onNext: () => {
        if (!isCorrect) {
          onComplete?.(score);
          return;
        }
        if (index + 1 >= stages.length) {
          onComplete?.(nextScore);
          return;
        }
        setScore(nextScore);
        setDraft('');
        setIndex((prev) => prev + 1);
      },
    });
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2">Stage {index + 1}/{stages.length} · Score {score}</Typography>
      <Typography variant="h6">{current.name || `Stage ${index + 1}`}</Typography>
      <Typography>{current.clue}</Typography>
      <TextField
        label="Enter the code / answer"
        value={draft}
        disabled={feedback?.open}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <Button variant="contained" disabled={feedback?.open} onClick={submit}>Unlock</Button>
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
        nextLabel={!feedback?.isCorrect || index + 1 >= stages.length ? 'See Results' : 'Next Stage'}
      />
    </Stack>
  );
}
