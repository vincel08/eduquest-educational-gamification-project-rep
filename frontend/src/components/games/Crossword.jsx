import { useMemo, useState } from 'react';
import { Button, Stack, TextField, Typography } from '@mui/material';
import AnswerFeedback from './AnswerFeedback';
import useAnswerFeedback from '../../hooks/useAnswerFeedback';

export default function Crossword({ gameData, onComplete, xpReward = 50 }) {
  const clues = useMemo(() => gameData?.items || [], [gameData]);
  const [answers, setAnswers] = useState({});
  const [checked, setChecked] = useState({});
  const [correctCount, setCorrectCount] = useState(0);
  const { feedback, showFeedback, handleNext } = useAnswerFeedback();

  if (!clues.length) {
    return <Typography color="text.secondary">No crossword clues available.</Typography>;
  }

  const perClueXp = Math.max(5, Math.round(Number(xpReward) / clues.length));
  const answeredCount = Object.keys(checked).length;

  function checkClue(index) {
    if (feedback?.open || checked[index]) return;

    const clue = clues[index];
    const expected = String(clue.answer || '').replace(/\s+/g, '').toUpperCase();
    const given = String(answers[index] || '').replace(/\s+/g, '').toUpperCase();
    const isCorrect = Boolean(expected && expected === given);
    const nextCorrect = isCorrect ? correctCount + 1 : correctCount;
    const nextChecked = { ...checked, [index]: isCorrect ? 'correct' : 'missed' };
    const progress = Object.keys(nextChecked).length / clues.length;
    const score = Math.round((nextCorrect / clues.length) * 100);

    showFeedback({
      isCorrect,
      userAnswer: answers[index] || '(blank)',
      correctAnswer: clue.answer,
      explanation: clue.explanation || (isCorrect ? null : `For "${clue.clue}", the answer is ${clue.answer}.`),
      xpEarned: isCorrect ? perClueXp : 0,
      score,
      progress,
      onNext: () => {
        setChecked(nextChecked);
        setCorrectCount(nextCorrect);
        if (Object.keys(nextChecked).length >= clues.length) {
          onComplete?.(score);
        }
      },
    });
  }

  function checkAll() {
    if (feedback?.open) return;
    let nextCorrect = 0;
    const nextChecked = {};
    clues.forEach((clue, index) => {
      const expected = String(clue.answer || '').replace(/\s+/g, '').toUpperCase();
      const given = String(answers[index] || '').replace(/\s+/g, '').toUpperCase();
      const isCorrect = Boolean(expected && expected === given);
      if (isCorrect) nextCorrect += 1;
      nextChecked[index] = isCorrect ? 'correct' : 'missed';
    });

    const score = Math.round((nextCorrect / clues.length) * 100);
    const allCorrect = nextCorrect === clues.length;

    showFeedback({
      isCorrect: allCorrect,
      userAnswer: `${nextCorrect}/${clues.length} correct`,
      correctAnswer: allCorrect ? 'All clues solved' : 'Review missed clues',
      explanation: allCorrect
        ? null
        : clues
          .map((clue, index) => (nextChecked[index] === 'missed' ? `${index + 1}. ${clue.answer}` : null))
          .filter(Boolean)
          .join(' · '),
      xpEarned: allCorrect ? Number(xpReward) : Math.round((nextCorrect / clues.length) * Number(xpReward)),
      score,
      progress: 1,
      onNext: () => {
        setChecked(nextChecked);
        setCorrectCount(nextCorrect);
        onComplete?.(score);
      },
    });
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Checked {answeredCount}/{clues.length} · Score preview {Math.round((correctCount / clues.length) * 100)}
      </Typography>
      {clues.map((clue, index) => (
        <Stack key={`${clue.clue}-${index}`} spacing={0.5}>
          <Typography fontWeight={700}>
            {index + 1}. ({clue.direction || 'across'}) {clue.clue}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              size="small"
              label="Answer"
              value={answers[index] || ''}
              disabled={Boolean(checked[index]) || feedback?.open}
              onChange={(event) => setAnswers((prev) => ({ ...prev, [index]: event.target.value }))}
              fullWidth
            />
            <Button
              variant="outlined"
              disabled={Boolean(checked[index]) || feedback?.open}
              onClick={() => checkClue(index)}
            >
              Check
            </Button>
          </Stack>
        </Stack>
      ))}
      <Button variant="contained" disabled={feedback?.open} onClick={checkAll}>
        Check All Answers
      </Button>

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
        nextLabel={feedback?.progress >= 1 ? 'See Results' : 'Continue'}
      />
    </Stack>
  );
}
