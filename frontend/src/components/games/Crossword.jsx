import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import AnswerFeedback from './AnswerFeedback';
import useAnswerFeedback from '../../hooks/useAnswerFeedback';
import { buildCrosswordBoard, normalizeAnswer, syncCrosswordGameData } from '../../utils/crosswordGrid';
import { MotionBox } from './GameMotion';

export default function Crossword({ gameData, onComplete, xpReward = 50 }) {
  const synced = useMemo(() => syncCrosswordGameData(gameData), [gameData]);
  const clues = synced.items || [];
  const boardKey = useMemo(
    () => clues.map((clue) => `${normalizeAnswer(clue.answer)}:${clue.direction || ''}`).join('|'),
    [clues],
  );
  const board = useMemo(() => buildCrosswordBoard(clues), [clues, boardKey]);
  const [letters, setLetters] = useState({});
  const [activeEntry, setActiveEntry] = useState(board.entries[0]?.index ?? 0);
  const { feedback, showFeedback, handleNext } = useAnswerFeedback();

  useEffect(() => {
    setLetters({});
    setActiveEntry(board.entries[0]?.index ?? 0);
  }, [boardKey]);

  if (!board.entries.length) {
    return <Typography color="text.secondary">No crossword clues available.</Typography>;
  }

  const active = board.entries.find((entry) => entry.index === activeEntry) || board.entries[0];
  const activeBoxCount = (() => {
    let count = 0;
    for (const row of board.cells) {
      for (const cell of row) {
        if (cell?.entries?.some((ref) => ref.entryIndex === active.index)) count += 1;
      }
    }
    return count;
  })();

  function cellKey(row, col) {
    return `${row}:${col}`;
  }

  function setCellLetter(row, col, value) {
    const letter = String(value || '').replace(/[^a-zA-Z0-9]/g, '').slice(-1).toUpperCase();
    setLetters((prev) => ({ ...prev, [cellKey(row, col)]: letter }));
  }

  function getEntryLetters(entry) {
    const chars = [];
    for (let i = 0; i < entry.answer.length; i += 1) {
      const r = entry.direction === 'down' ? entry.row + i : entry.row;
      const c = entry.direction === 'across' ? entry.col + i : entry.col;
      chars.push(letters[cellKey(r, c)] || '');
    }
    return chars;
  }

  function readEntryAnswer(entry) {
    return getEntryLetters(entry).join('');
  }

  function isEntryCorrect(entry) {
    const chars = getEntryLetters(entry);
    return chars.length === entry.answer.length
      && chars.every(Boolean)
      && chars.join('') === entry.answer;
  }

  function focusEntry(entryIndex) {
    setActiveEntry(entryIndex);
  }

  function checkAll() {
    if (feedback?.open) return;
    const answers = {};
    let correct = 0;
    board.entries.forEach((entry) => {
      const given = normalizeAnswer(readEntryAnswer(entry));
      answers[entry.index] = given;
      if (isEntryCorrect(entry)) correct += 1;
    });
    const score = Math.round((correct / board.entries.length) * 100);
    const missed = board.entries.filter((entry) => !isEntryCorrect(entry));
    showFeedback({
      isCorrect: correct === board.entries.length,
      userAnswer: `${correct}/${board.entries.length} correct`,
      correctAnswer: correct === board.entries.length ? 'All clues solved' : 'Review missed clues',
      explanation: missed
        .map((entry) => `${entry.number}. ${entry.answer}`)
        .join(' · ') || null,
      xpEarned: Math.round((correct / board.entries.length) * Number(xpReward)),
      score,
      progress: 1,
      onNext: () => onComplete?.({ score, answers: { answers } }),
    });
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Fill the grid using Across and Down clues. Tap a clue to highlight its word.
      </Typography>

      <MotionBox
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${board.cols}, 32px)`,
          gridAutoRows: '32px',
          gap: 0,
          width: 'fit-content',
          maxWidth: '100%',
          overflow: 'auto',
          border: '2px solid',
          borderColor: 'text.primary',
          bgcolor: '#0b1220',
        }}
      >
        {board.cells.flatMap((row, rowIndex) => row.map((cell, colIndex) => {
          if (!cell) {
            return (
              <Box
                key={`block-${rowIndex}-${colIndex}`}
                sx={{ width: 32, height: 32, bgcolor: '#0b1220' }}
              />
            );
          }
          const inActive = cell.entries.some((ref) => ref.entryIndex === active.index);
          const filled = Boolean(letters[cellKey(rowIndex, colIndex)]);
          return (
            <MotionBox
              key={`cell-${rowIndex}-${colIndex}`}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{
                opacity: 1,
                scale: inActive ? 1.04 : 1,
              }}
              transition={{
                delay: Math.min((rowIndex * board.cols + colIndex) * 0.008, 0.25),
                duration: 0.2,
              }}
              sx={{
                width: 32,
                height: 32,
                position: 'relative',
                border: '1px solid',
                borderColor: inActive ? '#0d9488' : 'rgba(15,23,42,0.35)',
                bgcolor: inActive
                  ? 'rgba(13,148,136,0.28)'
                  : filled
                    ? 'rgba(248,250,252,0.96)'
                    : '#f8fafc',
                boxSizing: 'border-box',
              }}
            >
              {cell.number ? (
                <Typography
                  variant="caption"
                  sx={{
                    position: 'absolute',
                    top: 1,
                    left: 2,
                    fontSize: 8,
                    fontWeight: 800,
                    lineHeight: 1,
                    color: '#0f172a',
                    pointerEvents: 'none',
                  }}
                >
                  {cell.number}
                </Typography>
              ) : null}
              <Box
                component="input"
                value={letters[cellKey(rowIndex, colIndex)] || ''}
                disabled={feedback?.open}
                onFocus={() => {
                  const preferred = cell.entries.find((ref) => ref.entryIndex === active.index)
                    || cell.entries[0];
                  if (preferred) focusEntry(preferred.entryIndex);
                }}
                onChange={(event) => setCellLetter(rowIndex, colIndex, event.target.value)}
                maxLength={1}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  outline: 'none',
                  textAlign: 'center',
                  fontWeight: 800,
                  fontSize: 15,
                  color: '#0f172a',
                  background: 'transparent',
                  textTransform: 'uppercase',
                  paddingTop: 4,
                }}
              />
            </MotionBox>
          );
        }))}
      </MotionBox>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Stack spacing={1} sx={{ flex: 1 }}>
          <Typography fontWeight={800}>Across</Typography>
          {board.across.map((entry) => (
            <Button
              key={`across-${entry.index}`}
              size="small"
              variant={active.index === entry.index ? 'contained' : 'text'}
              onClick={() => focusEntry(entry.index)}
              sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
            >
              {entry.number}. {entry.clue || entry.prompt}
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                ({entry.answer.length})
              </Typography>
            </Button>
          ))}
        </Stack>
        <Stack spacing={1} sx={{ flex: 1 }}>
          <Typography fontWeight={800}>Down</Typography>
          {board.down.map((entry) => (
            <Button
              key={`down-${entry.index}`}
              size="small"
              variant={active.index === entry.index ? 'contained' : 'text'}
              onClick={() => focusEntry(entry.index)}
              sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
            >
              {entry.number}. {entry.clue || entry.prompt}
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                ({entry.answer.length})
              </Typography>
            </Button>
          ))}
        </Stack>
      </Stack>

      <TextField
        label={`Clue ${active.number} · ${active.direction} · ${activeBoxCount} boxes`}
        value={readEntryAnswer(active)}
        helperText={
          activeBoxCount === active.answer.length
            ? `${active.clue || active.prompt || ''} · Fill all ${active.answer.length} boxes`
            : `${active.clue || active.prompt || ''} · Answer is ${active.answer.length} letters but grid has ${activeBoxCount} boxes`
        }
        error={activeBoxCount !== active.answer.length}
        disabled={feedback?.open}
        onChange={(event) => {
          const chars = normalizeAnswer(event.target.value).slice(0, active.answer.length).split('');
          chars.forEach((char, i) => {
            const r = active.direction === 'down' ? active.row + i : active.row;
            const c = active.direction === 'across' ? active.col + i : active.col;
            setCellLetter(r, c, char);
          });
          for (let i = chars.length; i < active.answer.length; i += 1) {
            const r = active.direction === 'down' ? active.row + i : active.row;
            const c = active.direction === 'across' ? active.col + i : active.col;
            setCellLetter(r, c, '');
          }
        }}
      />

      <Button variant="contained" disabled={feedback?.open} onClick={checkAll}>
        Check Crossword
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
        nextLabel="See Results"
      />
    </Stack>
  );
}
