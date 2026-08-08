import { useMemo, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import AnswerFeedback from './AnswerFeedback';
import useAnswerFeedback from '../../hooks/useAnswerFeedback';

export default function QuizShow({ gameData, onComplete, xpReward = 50 }) {
  const rounds = useMemo(() => {
    if (Array.isArray(gameData?.rounds) && gameData.rounds.length) return gameData.rounds;
    return (gameData?.items || []).map((item) => ({
      prompt: item.question || item.prompt,
      choices: item.choices || [],
      correctIndex: item.correctIndex ?? 0,
      explanation: item.explanation || null,
    }));
  }, [gameData]);

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [choices, setChoices] = useState([]);
  const [locked, setLocked] = useState(false);
  const { feedback, showFeedback, handleNext } = useAnswerFeedback();

  if (!rounds.length) {
    return <Typography color="text.secondary">No quiz show questions available.</Typography>;
  }

  const current = rounds[index];
  const perQuestionXp = Math.max(5, Math.round(Number(xpReward) / rounds.length));
  const points = Math.round(100 / rounds.length);

  function answer(choiceIndex) {
    if (locked || feedback?.open) return;
    setLocked(true);

    const isCorrect = choiceIndex === current.correctIndex;
    const nextScore = isCorrect ? Math.min(100, score + points) : score;
    const userAnswer = current.choices?.[choiceIndex] ?? '';
    const correctAnswer = current.choices?.[current.correctIndex] ?? '';

    showFeedback({
      isCorrect,
      userAnswer,
      correctAnswer,
      explanation: current.explanation || (isCorrect ? null : `The correct choice is "${correctAnswer}".`),
      xpEarned: isCorrect ? perQuestionXp : 0,
      score: nextScore,
      progress: (index + 1) / rounds.length,
      onNext: () => {
        const nextChoices = [...choices, choiceIndex];
        setChoices(nextChoices);
        setScore(nextScore);
        setLocked(false);
        if (index + 1 >= rounds.length) {
          onComplete?.({ score: nextScore, answers: { choices: nextChoices } });
          return;
        }
        setIndex((prev) => prev + 1);
      },
    });
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Question {index + 1} / {rounds.length} · Score {score}
      </Typography>
      <Typography variant="h6">{current.prompt}</Typography>
      <Stack spacing={1}>
        {(current.choices || []).map((choice, choiceIndex) => (
          <Button
            key={`${choice}-${choiceIndex}`}
            variant="outlined"
            disabled={locked || feedback?.open}
            onClick={() => answer(choiceIndex)}
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
        nextLabel={index + 1 >= rounds.length ? 'See Results' : 'Next Question'}
      />
    </Stack>
  );
}
