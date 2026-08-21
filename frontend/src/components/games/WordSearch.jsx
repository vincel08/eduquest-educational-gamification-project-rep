import { useMemo, useState } from 'react';
import { Button, Chip, Stack, Typography } from '@mui/material';
import AnswerFeedback from './AnswerFeedback';
import useAnswerFeedback from '../../hooks/useAnswerFeedback';
import { resolveWordSearchPuzzle } from '../../utils/wordSearchGrid';
import { SOUND_KEYS } from '../../utils/soundEffects';
import { useRegisterTimeoutSubmit } from '../../contexts/GameSessionContext';
import { MotionBox } from './GameMotion';

function cellsToWord(path, grid) {
  return path.map(([r, c]) => grid[r]?.[c] || '').join('');
}

function buildLinePath(start, end) {
  if (!start || !end) return [];
  const [r1, c1] = start;
  const [r2, c2] = end;
  const deltaR = r2 - r1;
  const deltaC = c2 - c1;
  const sameRow = deltaR === 0;
  const sameCol = deltaC === 0;
  const diagonal = Math.abs(deltaR) === Math.abs(deltaC);
  // Straight lines only: horizontal, vertical, or 45° diagonal (either way).
  if (!sameRow && !sameCol && !diagonal) return [];
  if (deltaR === 0 && deltaC === 0) return [[r1, c1]];
  const steps = Math.max(Math.abs(deltaR), Math.abs(deltaC));
  const dr = Math.sign(deltaR);
  const dc = Math.sign(deltaC);
  const path = [];
  for (let i = 0; i <= steps; i += 1) {
    path.push([r1 + dr * i, c1 + dc * i]);
  }
  return path;
}

export default function WordSearch({ gameData, onComplete, xpReward = 50 }) {
  const puzzle = useMemo(() => resolveWordSearchPuzzle(gameData), [gameData]);
  const { grid, words } = puzzle;
  const size = grid.length;

  const [found, setFound] = useState([]);
  const [foundCells, setFoundCells] = useState(() => new Set());
  const [selecting, setSelecting] = useState(false);
  const [startCell, setStartCell] = useState(null);
  const [activePath, setActivePath] = useState([]);
  const { feedback, showFeedback, handleNext } = useAnswerFeedback();
  useRegisterTimeoutSubmit(() => ({
    score: words.length ? Math.round((found.length / words.length) * 100) : 0,
    answers: { foundWords: found },
  }));

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
    setActivePath([[row, col]]);
  }

  function updateSelect(row, col) {
    if (!selecting || !startCell) return;
    const path = buildLinePath(startCell, [row, col]);
    if (path.length) {
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
      return;
    }

    if (found.includes(matched)) {
      setActivePath([]);
      setStartCell(null);
      return;
    }

    const nextFound = [...found, matched];
    const score = Math.round((nextFound.length / words.length) * 100);
    showFeedback({
      isCorrect: true,
      soundKey: SOUND_KEYS.wordFound,
      userAnswer: matched,
      correctAnswer: matched,
      explanation: null,
      xpEarned: perWordXp,
      score,
      progress: nextFound.length / words.length,
      onNext: () => {
        setFound(nextFound);
        setFoundCells((prev) => {
          const next = new Set(prev);
          activePath.forEach(([r, c]) => next.add(`${r}:${c}`));
          return next;
        });
        setActivePath([]);
        setStartCell(null);
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
      <Typography variant="body2" fontWeight={700} color="text.secondary">
        Drag any direction (including diagonals & reverse):{' '}
        {words.filter((w) => !found.includes(w)).join(', ') || 'All found!'}
      </Typography>
      <MotionBox
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${size}, minmax(24px, 32px))`,
          gap: '2px',
          width: 'fit-content',
          maxWidth: '100%',
          userSelect: 'none',
          touchAction: 'none',
          p: 1,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
        onMouseLeave={() => {
          if (selecting) endSelect();
        }}
        onTouchEnd={endSelect}
      >
        {grid.flatMap((row, rowIndex) => row.map((cell, colIndex) => {
          const key = `${rowIndex}:${colIndex}`;
          const active = pathSet.has(key);
          const isFound = foundCells.has(key);
          return (
            <MotionBox
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
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{
                opacity: 1,
                scale: active ? 1.1 : isFound ? 1.04 : 1,
                backgroundColor: active
                  ? '#0d9488'
                  : isFound
                    ? 'rgba(13,148,136,0.28)'
                    : undefined,
              }}
              transition={{
                delay: Math.min((rowIndex * size + colIndex) * 0.008, 0.4),
                type: 'spring',
                stiffness: 420,
                damping: 24,
              }}
              sx={{
                width: { xs: 26, sm: 30 },
                height: { xs: 26, sm: 30 },
                border: '1px solid',
                borderColor: active || isFound ? '#0d9488' : 'divider',
                bgcolor: 'background.paper',
                color: active ? '#fff' : 'text.primary',
                display: 'grid',
                placeItems: 'center',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                borderRadius: 0.75,
              }}
            >
              {cell}
            </MotionBox>
          );
        }))}
      </MotionBox>

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ alignItems: 'center' }}>
        <Chip label={`Found ${found.length}/${words.length}`} />
        {found.map((word) => (
          <MotionBox
            key={word}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 18 }}
          >
            <Chip color="success" label={word} size="small" />
          </MotionBox>
        ))}
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
