import { useMemo, useState } from 'react';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import AnswerFeedback from './AnswerFeedback';
import useAnswerFeedback from '../../hooks/useAnswerFeedback';

function buildGrid(words, size = 10) {
  const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => ''));
  const placed = [];

  words.forEach((raw) => {
    const word = String(raw).toUpperCase().replace(/[^A-Z]/g, '');
    if (!word || word.length > size) return;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const row = Math.floor(Math.random() * size);
      const col = Math.floor(Math.random() * (size - word.length + 1));
      let fits = true;
      for (let i = 0; i < word.length; i += 1) {
        const cell = grid[row][col + i];
        if (cell && cell !== word[i]) {
          fits = false;
          break;
        }
      }
      if (!fits) continue;
      for (let i = 0; i < word.length; i += 1) {
        grid[row][col + i] = word[i];
      }
      placed.push(word);
      break;
    }
  });

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (!grid[r][c]) grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
    }
  }

  return { grid, placed };
}

export default function WordSearch({ gameData, onComplete, xpReward = 50 }) {
  const words = useMemo(() => {
    if (Array.isArray(gameData?.words) && gameData.words.length) {
      return gameData.words.map((word) => (typeof word === 'string' ? word : word.word));
    }
    return (gameData?.items || []).map((item) => item.term || item.answer).filter(Boolean);
  }, [gameData]);

  const size = Math.min(12, Math.max(8, Number(gameData?.gridSize) || 10));
  const { grid, placed } = useMemo(() => buildGrid(words, size), [words, size]);
  const [found, setFound] = useState([]);
  const [draft, setDraft] = useState('');
  const { feedback, showFeedback, handleNext } = useAnswerFeedback();

  const perWordXp = Math.max(5, Math.round(Number(xpReward) / Math.max(placed.length, 1)));

  function markFound() {
    if (feedback?.open) return;
    const normalized = draft.toUpperCase().replace(/[^A-Z]/g, '');
    if (!normalized) return;

    const isCorrect = placed.includes(normalized) && !found.includes(normalized);
    const nextFound = isCorrect ? [...found, normalized] : found;
    const score = Math.round((nextFound.length / placed.length) * 100);

    showFeedback({
      isCorrect,
      userAnswer: normalized,
      correctAnswer: isCorrect ? normalized : placed.filter((word) => !found.includes(word)).slice(0, 3).join(', '),
      explanation: isCorrect
        ? null
        : found.includes(normalized)
          ? 'You already found that word.'
          : 'That word is not in the puzzle. Keep looking!',
      xpEarned: isCorrect ? perWordXp : 0,
      score,
      progress: nextFound.length / placed.length,
      onNext: () => {
        if (isCorrect) {
          setFound(nextFound);
          setDraft('');
          if (nextFound.length === placed.length) {
            onComplete?.({ score: 100, answers: { foundWords: nextFound } });
          }
          return;
        }
        setDraft('');
      },
    });
  }

  if (!placed.length) {
    return <Typography color="text.secondary">No word search data available.</Typography>;
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2">Find: {placed.join(', ')}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${size}, 28px)`, gap: '2px', width: 'fit-content' }}>
        {grid.flatMap((row, rowIndex) => row.map((cell, colIndex) => (
          <Box
            key={`${rowIndex}-${colIndex}`}
            sx={{
              width: 28,
              height: 28,
              border: '1px solid',
              borderColor: 'divider',
              display: 'grid',
              placeItems: 'center',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {cell}
          </Box>
        )))}
      </Box>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ alignItems: 'center' }}>
        <Chip label={`Found ${found.length}/${placed.length}`} />
        <Box
          component="input"
          value={draft}
          disabled={feedback?.open}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') markFound();
          }}
          placeholder="Type a found word"
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc', minWidth: 180 }}
        />
        <Button variant="contained" disabled={feedback?.open} onClick={markFound}>
          Mark Found
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
        nextLabel={found.length + (feedback?.isCorrect ? 1 : 0) >= placed.length && feedback?.isCorrect
          ? 'See Results'
          : 'Continue'}
      />
    </Stack>
  );
}
