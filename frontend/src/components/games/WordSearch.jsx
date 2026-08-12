import { useMemo, useState } from 'react';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import AnswerFeedback from './AnswerFeedback';
import useAnswerFeedback from '../../hooks/useAnswerFeedback';
import { resolveWordSearchPuzzle } from '../../utils/wordSearchGrid';

function cellsToWord(path, grid) {
  return path.map(([r, c]) => grid[r]?.[c] || '').join('');
}

function buildLinePath(start, end) {
  if (!start || !end) return [];
  const [r1, c1] = start;
  const [r2, c2] = end;
  const dr = Math.sign(r2 - r1);
  const dc = Math.sign(c2 - c1);
  const sameRow = r1 === r2;
  const sameCol = c1 === c2;
  if (!sameRow && !sameCol) return [];
  const length = sameRow ? Math.abs(c2 - c1) : Math.abs(r2 - r1);
  const path = [];
  for (let i = 0; i <= length; i += 1) {
    path.push([r1 + dr * i, c1 + dc * i]);
  }
  return path;
}

export default function WordSearch({ gameData, onComplete, xpReward = 50 }) {
  const puzzle = useMemo(() => resolveWordSearchPuzzle(gameData), [gameData]);
  const { grid, words } = puzzle;
  const size = grid.length;

  const [found, setFound] = useState([]);
  const [selecting, setSelecting] = useState(false);
  const [startCell, setStartCell] = useState(null);
  const [hoverCell, setHoverCell] = useState(null);
  const [activePath, setActivePath] = useState([]);
  const { feedback, showFeedback, handleNext } = useAnswerFeedback();

  const perWordXp = Math.max(5, Math.round(Number(xpReward) / Math.max(words.length, 1)));
  const pathSet = useMemo(
    () => new Set(activePath.map(([r, c]) => `${r}:${c}`)),
    [activePath]
  );

  if (!words.length || !size) {
    return <Typography color="text.secondary">No word search data available.</Typography>;
  }

  function beginSelect(row, col) {
    if (feedback?.open) return;
    setSelecting(true);
    setStartCell([row, col]);
    setHoverCell([row, col]);
    setActivePath([[row, col]]);
  }

  function updateSelect(row, col) {
    if (!selecting || !startCell) return;
    const path = buildLinePath(startCell, [row, col]);
    if (path.length) {
      setHoverCell([row, col]);
      setActivePath(path);
    }
  }

  function endSelect() {
    if (!selecting) return;
    setSelecting(false);
    const normalized = cellsToWord(activePath, grid);
    const reversed = normalized.split('').reverse().join('');
    const matched = words.find((word) => word === normalized || word === reversed);

    if (!matched) {
      setActivePath([]);
      setStartCell(null);
      setHoverCell(null);
      return;
    }

    if (found.includes(matched)) {
      setActivePath([]);
      setStartCell(null);
      setHoverCell(null);
      return;
    }

    const nextFound = [...found, matched];
    const score = Math.round((nextFound.length / words.length) * 100);
    showFeedback({
      isCorrect: true,
      userAnswer: matched,
      correctAnswer: matched,
      explanation: null,
      xpEarned: perWordXp,
      score,
      progress: nextFound.length / words.length,
      onNext: () => {
        setFound(nextFound);
        setActivePath([]);
        setStartCell(null);
        setHoverCell(null);
        if (nextFound.length === words.length) {
          onComplete?.({ score: 100, answers: { foundWords: nextFound } });
        }
      },
    });
  }

  function finishEarly() {
    if (feedback?.open) return;
    const score = Math.round((found.length / words.length) * 100);
    onComplete?.({ score, answers: { foundWords: found } });
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2">
        Find these words by dragging across letters: {words.join(', ')}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${size}, minmax(24px, 32px))`,
          gap: '2px',
          width: 'fit-content',
          maxWidth: '100%',
          userSelect: 'none',
          touchAction: 'none',
        }}
        onMouseLeave={() => {
          if (selecting) endSelect();
        }}
        onTouchEnd={endSelect}
      >
        {grid.flatMap((row, rowIndex) => row.map((cell, colIndex) => {
          const key = `${rowIndex}:${colIndex}`;
          const active = pathSet.has(key);
          return (
            <Box
              key={key}
              onMouseDown={() => beginSelect(rowIndex, colIndex)}
              onMouseEnter={() => updateSelect(rowIndex, colIndex)}
              onMouseUp={endSelect}
              onTouchStart={(event) => {
                event.preventDefault();
                beginSelect(rowIndex, colIndex);
              }}
              onTouchMove={(event) => {
                const touch = event.touches[0];
                if (!touch) return;
                const el = document.elementFromPoint(touch.clientX, touch.clientY);
                const r = Number(el?.dataset?.row);
                const c = Number(el?.dataset?.col);
                if (Number.isFinite(r) && Number.isFinite(c)) updateSelect(r, c);
              }}
              data-row={rowIndex}
              data-col={colIndex}
              sx={{
                width: { xs: 26, sm: 30 },
                height: { xs: 26, sm: 30 },
                border: '1px solid',
                borderColor: active ? 'secondary.main' : 'divider',
                bgcolor: active ? 'secondary.light' : 'background.paper',
                color: active ? 'secondary.contrastText' : 'text.primary',
                display: 'grid',
                placeItems: 'center',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {cell}
            </Box>
          );
        }))}
      </Box>

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ alignItems: 'center' }}>
        <Chip label={`Found ${found.length}/${words.length}`} />
        {found.map((word) => <Chip key={word} color="success" label={word} size="small" />)}
        <Button variant="outlined" disabled={feedback?.open || !found.length} onClick={finishEarly}>
          Submit Found Words
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
        nextLabel={found.length + 1 >= words.length ? 'See Results' : 'Continue'}
      />
    </Stack>
  );
}
