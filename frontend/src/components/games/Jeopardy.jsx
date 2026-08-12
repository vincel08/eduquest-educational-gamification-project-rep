import { useMemo, useState } from 'react';
import { Button, Paper, Stack, TextField, Typography } from '@mui/material';
import AnswerFeedback from './AnswerFeedback';
import useAnswerFeedback from '../../hooks/useAnswerFeedback';

export default function Jeopardy({ gameData, onComplete, xpReward = 50 }) {
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
      <Typography variant="body2">Score: {score}</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
        {categories.map((category, categoryIndex) => (
          <Paper key={category.name || categoryIndex} sx={{ p: 1.5, flex: 1 }}>
            <Typography fontWeight={800} sx={{ mb: 1 }}>{category.name}</Typography>
            <Stack spacing={1}>
              {(category.clues || []).map((clue, clueIndex) => {
                const key = `${categoryIndex}-${clueIndex}`;
                return (
                  <Button
                    key={key}
                    variant={answered[key] ? 'contained' : 'outlined'}
                    color={answered[key] === 'correct' ? 'success' : 'primary'}
                    disabled={Boolean(answered[key]) || feedback?.open}
                    onClick={() => openClue(categoryIndex, clueIndex)}
                  >
                    {clue.points || (clueIndex + 1) * 100}
                  </Button>
                );
              })}
            </Stack>
          </Paper>
        ))}
      </Stack>

      {selected ? (
        <Paper sx={{ p: 2 }}>
          <Typography sx={{ mb: 1 }}>
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
            />
            <Button variant="contained" disabled={feedback?.open} onClick={submitClue}>
              Submit
            </Button>
          </Stack>
        </Paper>
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
        nextLabel={Object.keys(answered).length + 1 >= totalClues ? 'See Results' : 'Continue'}
      />
    </Stack>
  );
}
