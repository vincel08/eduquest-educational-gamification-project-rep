import { useMemo, useState } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import AnswerFeedback from './AnswerFeedback';
import useAnswerFeedback from '../../hooks/useAnswerFeedback';
import { buildCrosswordBoard, normalizeAnswer } from '../../utils/crosswordGrid';

export default function Crossword({ gameData, onComplete, xpReward = 50 }) {
  const clues = useMemo(() => gameData?.items || gameData?.clues || [], [gameData]);
  const board = useMemo(() => buildCrosswordBoard(clues), [clues]);
  const [letters, setLetters] = useState({});
  const [activeEntry, setActiveEntry] = useState(board.entries[0]?.index ?? 0);
  const { feedback, showFeedback, handleNext } = useAnswerFeedback();

  if (!board.entries.length) {
    return <Typography color="text.secondary">No crossword clues available.</Typography>;
  }

  const active = board.entries.find((entry) => entry.index === activeEntry) || board.entries[0];

  function cellKey(row, col) {
    return `${row}:${col}`;
  }

  function setCellLetter(row, col, value) {
    const letter = String(value || '').replace(/[^a-zA-Z]/g, '').slice(-1).toUpperCase();
    setLetters((prev) => ({ ...prev, [cellKey(row, col)]: letter }));
  }

  function readEntryAnswer(entry) {
    let value = '';
    for (let i = 0; i < entry.answer.length; i += 1) {
      const r = entry.direction === 'down' ? entry.row + i : entry.row;
      const c = entry.direction === 'across' ? entry.col + i : entry.col;
      value += letters[cellKey(r, c)] || '';
    }
    return value;
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
      if (given && given === entry.answer) correct += 1;
    });
    const score = Math.round((correct / board.entries.length) * 100);
    showFeedback({
      isCorrect: correct === board.entries.length,
      userAnswer: `${correct}/${board.entries.length} correct`,
      correctAnswer: correct === board.entries.length ? 'All clues solved' : 'Review missed clues',
      explanation: board.entries
        .filter((entry) => normalizeAnswer(readEntryAnswer(entry)) !== entry.answer)
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

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${board.cols}, minmax(26px, 34px))`,
          gap: '2px',
          width: 'fit-content',
          maxWidth: '100%',
        }}
      >
        {board.cells.flatMap((row, rowIndex) => row.map((cell, colIndex) => {
          if (!cell) {
            return (
              <Box
                key={`block-${rowIndex}-${colIndex}`}
                sx={{ width: 30, height: 30, bgcolor: 'grey.900', borderRadius: 0.5 }}
              />
            );
          }
          const inActive = cell.entries.some((ref) => ref.entryIndex === active.index);
          return (
            <Box
              key={`cell-${rowIndex}-${colIndex}`}
              sx={{
                width: 30,
                height: 30,
                position: 'relative',
                border: '1px solid',
                borderColor: inActive ? 'secondary.main' : 'divider',
                bgcolor: inActive ? 'secondary.light' : 'background.paper',
              }}
            >
              {cell.number ? (
                <Typography
                  variant="caption"
                  sx={{ position: 'absolute', top: 0, left: 2, fontSize: 9, fontWeight: 800 }}
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
                  background: 'transparent',
                  textTransform: 'uppercase',
                }}
              />
            </Box>
          );
        }))}
      </Box>

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
            </Button>
          ))}
        </Stack>
      </Stack>

      <TextField
        label={`Active clue ${active.number} (${active.direction})`}
        value={readEntryAnswer(active)}
        helperText={active.clue || active.prompt}
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
