import { useMemo, useState } from 'react';
import { Button, Stack, Typography, Chip } from '@mui/material';
import AnswerFeedback from './AnswerFeedback';
import useAnswerFeedback from '../../hooks/useAnswerFeedback';

const LADDER = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000];

export default function Millionaire({ gameData, onComplete, xpReward = 50 }) {
  const items = useMemo(() => gameData?.items || [], [gameData]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const { feedback, showFeedback, handleNext } = useAnswerFeedback();

  if (!items.length) {
    return <Typography color="text.secondary">No Millionaire questions available.</Typography>;
  }

  const current = items[index];
  const ladderValue = LADDER[Math.min(index, LADDER.length - 1)];
  const perXp = Math.max(5, Math.round(Number(xpReward) / items.length));

  function answer(choiceIndex) {
    if (feedback?.open) return;
    const isCorrect = choiceIndex === current.correctIndex;
    const nextScore = isCorrect ? Math.min(100, score + Math.round(100 / items.length)) : score;

    showFeedback({
      isCorrect,
      userAnswer: current.choices?.[choiceIndex],
      correctAnswer: current.choices?.[current.correctIndex],
      explanation: isCorrect ? `Safe at ${ladderValue} points!` : 'That ends this ladder climb.',
      xpEarned: isCorrect ? perXp : 0,
      score: nextScore,
      progress: (index + 1) / items.length,
      onNext: () => {
        if (!isCorrect || index + 1 >= items.length) {
          onComplete?.(isCorrect ? nextScore : Math.max(0, score));
          return;
        }
        setScore(nextScore);
        setIndex((prev) => prev + 1);
      },
    });
  }

  return (
    <Stack spacing={2}>
      <Chip label={`Question for ${ladderValue}`} color="secondary" sx={{ alignSelf: 'flex-start' }} />
      <Typography variant="body2">Score: {score} · Q{index + 1}/{items.length}</Typography>
      <Typography variant="h6">{current.question}</Typography>
      <Stack spacing={1}>
        {(current.choices || []).map((choice, choiceIndex) => (
          <Button
            key={`${choice}-${choiceIndex}`}
            variant="outlined"
            disabled={feedback?.open}
            onClick={() => answer(choiceIndex)}
          >
            {String.fromCharCode(65 + choiceIndex)}. {choice}
          </Button>
        ))}
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
        nextLabel={!feedback?.isCorrect || index + 1 >= items.length ? 'See Results' : 'Next Question'}
      />
    </Stack>
  );
}
