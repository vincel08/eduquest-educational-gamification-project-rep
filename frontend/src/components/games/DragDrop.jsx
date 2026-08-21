import { useMemo, useState } from 'react';
import { Button, Paper, Stack, Typography } from '@mui/material';
import AnswerFeedback from './AnswerFeedback';
import useAnswerFeedback from '../../hooks/useAnswerFeedback';
import { firstNonEmptyList } from '../../utils/gameDataLists';
import { playSound, SOUND_KEYS } from '../../utils/soundEffects';
import { useRegisterTimeoutSubmit } from '../../contexts/GameSessionContext';
import {
  MotionBox,
  choiceListProps,
  gridItemVariants,
} from './GameMotion';

function shuffle(list) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function itemDefinition(item) {
  return item.definition || item.back || item.right || '';
}

export default function DragDrop({ gameData, onComplete, xpReward = 50 }) {
  const items = useMemo(
    () => firstNonEmptyList(gameData?.items, gameData?.pairs),
    [gameData]
  );
  const targets = useMemo(
    () => shuffle(items.map((item, index) => ({
      id: `target-${index}`,
      definition: itemDefinition(item),
      sourceIndex: index,
    }))),
    [items]
  );

  const [matches, setMatches] = useState({});
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [justFilled, setJustFilled] = useState(null);
  const { feedback, showFeedback, handleNext } = useAnswerFeedback();
  useRegisterTimeoutSubmit(() => {
    let correct = 0;
    items.forEach((item, index) => {
      if (matches[index] === itemDefinition(item)) correct += 1;
    });
    const score = items.length ? Math.round((correct / items.length) * 100) : 0;
    return { score, answers: { matches: { ...matches } } };
  });

  if (!items.length) {
    return <Typography color="text.secondary">No drag-and-drop pairs available.</Typography>;
  }

  const unmatched = items
    .map((item, index) => ({ item, index }))
    .filter(({ index }) => matches[index] == null);

  function pickUp(termIndex) {
    if (feedback?.open) return;
    playSound(SOUND_KEYS.dragPickup);
    setDraggingIndex(termIndex);
    setSelectedIndex(termIndex);
  }

  function assignMatch(termIndex, definition) {
    if (feedback?.open || termIndex == null || !definition) return;

    const expected = itemDefinition(items[termIndex]);
    const isCorrect = expected === definition;

    if (!isCorrect) {
      playSound(SOUND_KEYS.dragMiss);
      setDraggingIndex(null);
      return;
    }

    const nextMatches = { ...matches, [termIndex]: definition };
    setMatches(nextMatches);
    setDraggingIndex(null);
    setSelectedIndex(null);
    setJustFilled(definition);
    window.setTimeout(() => setJustFilled(null), 450);

    playSound(SOUND_KEYS.dragMatch);

    const allPlaced = Object.keys(nextMatches).length >= items.length;
    if (allPlaced) {
      window.setTimeout(() => playSound(SOUND_KEYS.dragComplete), 180);
    }
  }

  function clearMatch(termIndex) {
    if (feedback?.open) return;
    playSound(SOUND_KEYS.dragPickup);
    setMatches((prev) => {
      const next = { ...prev };
      delete next[termIndex];
      return next;
    });
  }

  function finish() {
    if (feedback?.open) return;
    let correct = 0;
    items.forEach((item, index) => {
      if (matches[index] === itemDefinition(item)) correct += 1;
    });
    const score = Math.round((correct / items.length) * 100);
    const allCorrect = correct === items.length;
    const xpEarned = Math.round((correct / items.length) * Number(xpReward));

    showFeedback({
      isCorrect: allCorrect,
      soundKey: allCorrect ? SOUND_KEYS.dragComplete : SOUND_KEYS.dragMiss,
      userAnswer: `${correct}/${items.length} matched`,
      correctAnswer: allCorrect ? 'All pairs matched' : 'Review mismatched pairs',
      explanation: items
        .map((item, index) => (
          matches[index] === itemDefinition(item)
            ? null
            : `${item.term} → ${itemDefinition(item)}`
        ))
        .filter(Boolean)
        .join(' · ') || null,
      xpEarned,
      score,
      progress: 1,
      onNext: () => {
        if (xpEarned > 0) playSound(SOUND_KEYS.xpGain);
        onComplete?.({ score, answers: { matches: { ...matches } } });
      },
    });
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Drag each term onto the matching definition. Wrong drops bounce back. On touch, tap a term then tap a target.
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography fontWeight={800} sx={{ mb: 1 }}>Terms</Typography>
          <MotionBox component={Stack} spacing={1} {...choiceListProps}>
            {unmatched.map(({ item, index }, listIndex) => (
              <MotionBox
                key={`term-${index}`}
                custom={listIndex}
                variants={gridItemVariants}
                draggable
                onDragStart={() => pickUp(index)}
                onDragEnd={() => setDraggingIndex(null)}
                onClick={() => pickUp(index)}
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                animate={
                  selectedIndex === index || draggingIndex === index
                    ? { scale: 1.04, y: -4 }
                    : { scale: 1, y: 0 }
                }
                sx={{
                  px: 1.5,
                  py: 1.25,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: selectedIndex === index ? 'secondary.main' : 'divider',
                  bgcolor: selectedIndex === index ? 'action.selected' : 'background.paper',
                  cursor: 'grab',
                  fontWeight: 700,
                  userSelect: 'none',
                }}
              >
                {item.term || item.front || item.left}
              </MotionBox>
            ))}
            {!unmatched.length ? (
              <Typography variant="body2" color="text.secondary">All terms placed.</Typography>
            ) : null}
          </MotionBox>
        </Paper>

        <Paper sx={{ p: 2, flex: 1.2 }}>
          <Typography fontWeight={800} sx={{ mb: 1 }}>Targets</Typography>
          <Stack spacing={1}>
            {targets.map((target) => {
              const filledIndex = Object.entries(matches).find(([, value]) => value === target.definition)?.[0];
              const filledItem = filledIndex != null ? items[Number(filledIndex)] : null;
              return (
                <MotionBox
                  key={target.id}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    assignMatch(draggingIndex, target.definition);
                  }}
                  onClick={() => {
                    if (filledIndex != null) {
                      clearMatch(Number(filledIndex));
                      return;
                    }
                    assignMatch(selectedIndex, target.definition);
                  }}
                  animate={
                    filledItem
                      ? {
                          scale: justFilled === target.definition ? [1, 1.08, 1] : 1,
                          y: justFilled === target.definition ? [0, -4, 0] : 0,
                        }
                      : draggingIndex != null || selectedIndex != null
                        ? { scale: [1, 1.02, 1], borderColor: ['#94a3b8', '#0d9488', '#94a3b8'] }
                        : { scale: 1 }
                  }
                  transition={{
                    duration: filledItem ? 0.4 : 1.4,
                    repeat: filledItem ? 0 : (draggingIndex != null || selectedIndex != null ? Infinity : 0),
                  }}
                  layout
                  sx={{
                    minHeight: 64,
                    px: 1.5,
                    py: 1.25,
                    borderRadius: 2,
                    border: '2px dashed',
                    borderColor: filledItem ? 'success.main' : 'divider',
                    bgcolor: filledItem ? 'success.light' : 'action.hover',
                    boxShadow: filledItem ? '0 8px 18px rgba(13,148,136,0.2)' : 'none',
                  }}
                >
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {target.definition}
                  </Typography>
                  <Typography fontWeight={800}>
                    {filledItem
                      ? (filledItem.term || filledItem.front || filledItem.left)
                      : 'Drop term here'}
                  </Typography>
                </MotionBox>
              );
            })}
          </Stack>
        </Paper>
      </Stack>

      <Button
        variant="contained"
        disabled={feedback?.open || Object.keys(matches).length < items.length}
        onClick={finish}
      >
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
        nextLabel="See Results"
      />
    </Stack>
  );
}
