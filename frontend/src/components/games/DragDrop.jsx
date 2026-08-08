import { useMemo, useState } from 'react';
import { Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import AnswerFeedback from './AnswerFeedback';
import useAnswerFeedback from '../../hooks/useAnswerFeedback';

function shuffle(list) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export default function DragDrop({ gameData, onComplete, xpReward = 50 }) {
  const items = useMemo(() => gameData?.items || gameData?.pairs || [], [gameData]);
  const definitions = useMemo(
    () => shuffle(items.map((item) => item.definition)),
    [items]
  );
  const [matches, setMatches] = useState({});
  const [checked, setChecked] = useState({});
  const [correctCount, setCorrectCount] = useState(0);
  const { feedback, showFeedback, handleNext } = useAnswerFeedback();

  if (!items.length) {
    return <Typography color="text.secondary">No drag-and-drop pairs available.</Typography>;
  }

  const perItemXp = Math.max(5, Math.round(Number(xpReward) / items.length));

  function checkItem(index) {
    if (feedback?.open || checked[index]) return;
    const item = items[index];
    const userAnswer = matches[index] || '';
    const isCorrect = userAnswer === item.definition;
    const nextCorrect = isCorrect ? correctCount + 1 : correctCount;
    const nextChecked = { ...checked, [index]: isCorrect ? 'correct' : 'missed' };
    const score = Math.round((nextCorrect / items.length) * 100);

    showFeedback({
      isCorrect,
      userAnswer: userAnswer || '(none selected)',
      correctAnswer: item.definition,
      explanation: isCorrect
        ? null
        : `"${item.term}" matches: ${item.definition}`,
      xpEarned: isCorrect ? perItemXp : 0,
      score,
      progress: Object.keys(nextChecked).length / items.length,
      onNext: () => {
        setChecked(nextChecked);
        setCorrectCount(nextCorrect);
        if (Object.keys(nextChecked).length >= items.length) {
          onComplete?.({ score, answers: { matches: { ...matches } } });
        }
      },
    });
  }

  function checkAll() {
    if (feedback?.open) return;
    let nextCorrect = 0;
    const nextChecked = {};
    items.forEach((item, index) => {
      const isCorrect = matches[index] === item.definition;
      if (isCorrect) nextCorrect += 1;
      nextChecked[index] = isCorrect ? 'correct' : 'missed';
    });
    const score = Math.round((nextCorrect / items.length) * 100);
    const allCorrect = nextCorrect === items.length;

    showFeedback({
      isCorrect: allCorrect,
      userAnswer: `${nextCorrect}/${items.length} matched`,
      correctAnswer: allCorrect ? 'All pairs matched' : 'Review mismatched terms',
      explanation: allCorrect
        ? null
        : items
          .map((item, index) => (nextChecked[index] === 'missed' ? `${item.term} → ${item.definition}` : null))
          .filter(Boolean)
          .join(' · '),
      xpEarned: Math.round((nextCorrect / items.length) * Number(xpReward)),
      score,
      progress: 1,
      onNext: () => {
        setChecked(nextChecked);
        setCorrectCount(nextCorrect);
        onComplete?.({ score, answers: { matches: { ...matches } } });
      },
    });
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Match each term with the correct definition.
      </Typography>
      {items.map((item, index) => (
        <Stack
          key={`${item.term}-${index}`}
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ alignItems: { sm: 'center' } }}
        >
          <Typography sx={{ minWidth: { sm: 160 }, fontWeight: 700 }}>{item.term}</Typography>
          <TextField
            select
            size="small"
            fullWidth
            label="Definition"
            value={matches[index] || ''}
            disabled={Boolean(checked[index]) || feedback?.open}
            onChange={(event) => setMatches((prev) => ({ ...prev, [index]: event.target.value }))}
          >
            {definitions.map((definition) => (
              <MenuItem key={definition} value={definition}>{definition}</MenuItem>
            ))}
          </TextField>
          <Button
            variant="outlined"
            disabled={Boolean(checked[index]) || feedback?.open}
            onClick={() => checkItem(index)}
          >
            Check
          </Button>
        </Stack>
      ))}
      <Button variant="contained" disabled={feedback?.open} onClick={checkAll}>
        Check Matches
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
