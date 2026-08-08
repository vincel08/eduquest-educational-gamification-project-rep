import { useMemo, useState } from 'react';
import { Button, Paper, Stack, Typography } from '@mui/material';
import AnswerFeedback from './AnswerFeedback';
import useAnswerFeedback from '../../hooks/useAnswerFeedback';

export default function SpinWheel({ gameData, onComplete, xpReward = 50 }) {
  const items = useMemo(() => gameData?.items || [], [gameData]);
  const [index, setIndex] = useState(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const { feedback, showFeedback, handleNext } = useAnswerFeedback();

  const totalRounds = Math.min(items.length, 5);
  const perSpinXp = Math.max(5, Math.round(Number(xpReward) / Math.max(totalRounds, 1)));
  const points = Math.round(100 / Math.max(totalRounds, 1));

  if (!items.length) {
    return <Typography color="text.secondary">No spin-wheel items available.</Typography>;
  }

  function spin() {
    if (spinning || feedback?.open || index !== null) return;
    setSpinning(true);
    setTimeout(() => {
      setIndex(Math.floor(Math.random() * items.length));
      setSpinning(false);
    }, 500);
  }

  function answer(choiceIndex) {
    if (index === null || feedback?.open) return;
    const current = items[index];
    const isCorrect = choiceIndex === current.correctIndex;
    const nextScore = isCorrect ? Math.min(100, score + points) : score;
    const nextAnswered = answered + 1;
    const userAnswer = current.choices?.[choiceIndex] ?? '';
    const correctAnswer = current.choices?.[current.correctIndex] ?? '';

    showFeedback({
      isCorrect,
      userAnswer,
      correctAnswer,
      explanation: current.explanation || (isCorrect ? null : `The correct choice is "${correctAnswer}".`),
      xpEarned: isCorrect ? perSpinXp : 0,
      score: nextScore,
      progress: nextAnswered / totalRounds,
      onNext: () => {
        const nextRounds = [...roundsPlayed, { itemIndex: index, choiceIndex }];
        setRoundsPlayed(nextRounds);
        setScore(nextScore);
        setAnswered(nextAnswered);
        setIndex(null);
        if (nextAnswered >= totalRounds) {
          onComplete?.({ score: nextScore, answers: { rounds: nextRounds } });
        }
      },
    });
  }

  const current = index === null ? null : items[index];

  return (
    <Stack spacing={2}>
      <Typography variant="body2">
        Score: {score} · Spins used: {answered}/{totalRounds}
      </Typography>
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {spinning ? 'Spinning...' : current?.label || 'Spin the wheel'}
        </Typography>
        <Button
          variant="contained"
          onClick={spin}
          disabled={spinning || Boolean(current) || feedback?.open || answered >= totalRounds}
        >
          Spin
        </Button>
      </Paper>

      {current ? (
        <Stack spacing={1}>
          <Typography fontWeight={700}>{current.question}</Typography>
          {(current.choices || []).map((choice, choiceIndex) => (
            <Button
              key={`${choice}-${choiceIndex}`}
              variant="outlined"
              disabled={feedback?.open}
              onClick={() => answer(choiceIndex)}
            >
              {choice}
            </Button>
          ))}
        </Stack>
      ) : null}

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
        nextLabel={answered + 1 >= totalRounds ? 'See Results' : 'Spin Again'}
      />
    </Stack>
  );
}
