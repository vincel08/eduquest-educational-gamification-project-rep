import { useMemo, useState } from 'react';
import { Button, Paper, Stack, Typography } from '@mui/material';
import AnswerFeedback from './AnswerFeedback';
import useAnswerFeedback from '../../hooks/useAnswerFeedback';

export default function MissionAdventure({ gameData, onComplete, xpReward = 50 }) {
  const missions = useMemo(() => gameData?.missions || [], [gameData]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [choices, setChoices] = useState([]);
  const { feedback, showFeedback, handleNext } = useAnswerFeedback();

  if (!missions.length) {
    return <Typography color="text.secondary">No mission adventure data available.</Typography>;
  }

  const current = missions[index];
  const perXp = Math.max(5, Math.round(Number(xpReward) / missions.length));

  function choose(choiceIndex) {
    if (feedback?.open) return;
    const isCorrect = choiceIndex === current.correctIndex;
    const nextScore = isCorrect ? Math.min(100, score + Math.round(100 / missions.length)) : score;

    showFeedback({
      isCorrect,
      userAnswer: current.choices?.[choiceIndex],
      correctAnswer: current.choices?.[current.correctIndex],
      explanation: current.title,
      xpEarned: isCorrect ? (Number(current.xp) || perXp) : 0,
      score: nextScore,
      progress: (index + 1) / missions.length,
      onNext: () => {
        const nextChoices = [...choices, choiceIndex];
        setChoices(nextChoices);
        setScore(nextScore);
        if (index + 1 >= missions.length) {
          onComplete?.({ score: nextScore, answers: { choices: nextChoices } });
          return;
        }
        setIndex((prev) => prev + 1);
      },
    });
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2">Mission {index + 1}/{missions.length} · Score {score}</Typography>
      <Paper sx={{ p: 2 }}>
        <Typography fontWeight={800}>{current.title}</Typography>
        <Typography sx={{ mt: 1 }}>{current.prompt}</Typography>
      </Paper>
      <Stack spacing={1}>
        {(current.choices || []).map((choice, choiceIndex) => (
          <Button
            key={`${choice}-${choiceIndex}`}
            variant="outlined"
            disabled={feedback?.open}
            onClick={() => choose(choiceIndex)}
          >
            {choice}
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
        nextLabel={index + 1 >= missions.length ? 'See Results' : 'Next Mission'}
      />
    </Stack>
  );
}
