import { useMemo, useState } from 'react';
import { Button, Stack, TextField, Typography } from '@mui/material';
import AnswerFeedback from './AnswerFeedback';
import useAnswerFeedback from '../../hooks/useAnswerFeedback';

export default function PuzzleChallenge({ gameData, onComplete, xpReward = 50 }) {
  const items = useMemo(() => gameData?.items || [], [gameData]);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState('');
  const [score, setScore] = useState(0);
  const [responses, setResponses] = useState([]);
  const { feedback, showFeedback, handleNext } = useAnswerFeedback();

  if (!items.length) {
    return <Typography color="text.secondary">No puzzle challenge items available.</Typography>;
  }

  const current = items[index];
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
      <Typography variant="body2">Puzzle {index + 1}/{items.length} · Score {score}</Typography>
      <Typography variant="h6">{current.prompt}</Typography>
      <TextField
        label="Your answer"
        value={draft}
        disabled={feedback?.open}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <Button variant="contained" disabled={feedback?.open} onClick={submit}>Submit</Button>
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
