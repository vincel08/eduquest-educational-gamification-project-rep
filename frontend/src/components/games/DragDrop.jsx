import { useMemo, useRef, useState } from 'react';
import { Button, Paper, Stack, Typography } from '@mui/material';
import AnswerFeedback from './AnswerFeedback';
import useAnswerFeedback from '../../hooks/useAnswerFeedback';
import { firstNonEmptyList } from '../../utils/gameDataLists';
import { playSound, SOUND_KEYS } from '../../utils/soundEffects';
import { useRegisterTimeoutSubmit } from '../../contexts/GameSessionContext';
import { MotionBox } from './GameMotion';

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

function itemTerm(item) {
  return item.term || item.front || item.left || '';
}

/** Build API payload: termIndex → definition text (what the server scores). */
function matchesPayload(matchesByTerm, targetsById) {
  const payload = {};
  Object.entries(matchesByTerm).forEach(([termIndex, targetId]) => {
    const target = targetsById.get(targetId);
    if (target) payload[termIndex] = target.definition;
  });
  return payload;
}

function countCorrect(matchesByTerm, targetsById, itemCount) {
  let correct = 0;
  for (let index = 0; index < itemCount; index += 1) {
    const targetId = matchesByTerm[index] ?? matchesByTerm[String(index)];
    const target = targetsById.get(targetId);
    if (target && Number(target.sourceIndex) === index) correct += 1;
  }
  return correct;
}

function isPlaced(matches, termIndex) {
  return matches[termIndex] != null || matches[String(termIndex)] != null;
}

export default function DragDrop({ gameData, onComplete, xpReward = 50 }) {
  const items = useMemo(
    () => firstNonEmptyList(gameData?.items, gameData?.pairs),
    [gameData],
  );
  const targets = useMemo(
    () =>
      shuffle(
        items.map((item, index) => ({
          id: `target-${index}`,
          definition: itemDefinition(item),
          sourceIndex: index,
        })),
      ),
    [items],
  );
  const targetsById = useMemo(
    () => new Map(targets.map((target) => [target.id, target])),
    [targets],
  );

  // termIndex → targetId (stable even when definitions duplicate)
  const [matches, setMatches] = useState({});
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [justFilled, setJustFilled] = useState(null);
  const { feedback, showFeedback, handleNext } = useAnswerFeedback();
  const suppressClickRef = useRef(false);
  const dragHadDropRef = useRef(false);

  useRegisterTimeoutSubmit(() => {
    const correct = countCorrect(matches, targetsById, items.length);
    const score = items.length ? Math.round((correct / items.length) * 100) : 0;
    return {
      score,
      answers: { matches: matchesPayload(matches, targetsById) },
    };
  });

  if (!items.length) {
    return (
      <Typography color="text.secondary">No drag-and-drop pairs available.</Typography>
    );
  }

  const unmatched = items
    .map((item, index) => ({ item, index }))
    .filter(({ index }) => !isPlaced(matches, index));

  const placedCount = Object.keys(matches).length;
  const holdingTerm = draggingIndex != null || selectedIndex != null;

  function clearMatch(termIndex) {
    if (feedback?.open) return;
    setMatches((prev) => {
      const next = { ...prev };
      delete next[termIndex];
      delete next[String(termIndex)];
      return next;
    });
  }

  function pickUp(termIndex) {
    if (feedback?.open || termIndex == null) return;
    playSound(SOUND_KEYS.dragPickup);
    setDraggingIndex(termIndex);
    setSelectedIndex(termIndex);
  }

  function returnToBank(termIndex) {
    if (feedback?.open || termIndex == null) return;
    clearMatch(termIndex);
    setDraggingIndex(null);
    setSelectedIndex(null);
    playSound(SOUND_KEYS.dragPickup);
  }

  function resolveDragTermIndex(event) {
    const raw = event?.dataTransfer?.getData?.('text/plain');
    if (raw !== '' && raw != null && Number.isFinite(Number(raw))) {
      return Number(raw);
    }
    return draggingIndex ?? selectedIndex;
  }

  function assignMatch(termIndex, targetId) {
    if (feedback?.open || termIndex == null || !targetId) return;
    if (!targetsById.has(targetId)) return;

    setMatches((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (next[key] === targetId) delete next[key];
      });
      delete next[termIndex];
      delete next[String(termIndex)];
      next[termIndex] = targetId;
      return next;
    });
    setDraggingIndex(null);
    setSelectedIndex(null);
    setJustFilled(targetId);
    window.setTimeout(() => setJustFilled(null), 450);
    playSound(SOUND_KEYS.dragMatch);
  }

  function finish() {
    if (feedback?.open) return;
    const correct = countCorrect(matches, targetsById, items.length);
    const score = Math.round((correct / items.length) * 100);
    const allCorrect = correct === items.length;
    const xpEarned = Math.round((correct / items.length) * Number(xpReward));
    const payload = matchesPayload(matches, targetsById);

    showFeedback({
      isCorrect: allCorrect,
      soundKey: allCorrect ? SOUND_KEYS.dragComplete : SOUND_KEYS.dragMiss,
      userAnswer: `${correct}/${items.length} matched`,
      correctAnswer: allCorrect ? 'All pairs matched' : 'Review mismatched pairs',
      explanation: items
        .map((item, index) => {
          const targetId = matches[index] ?? matches[String(index)];
          const target = targetsById.get(targetId);
          if (target && Number(target.sourceIndex) === index) return null;
          return `${itemTerm(item)} → ${itemDefinition(item)}`;
        })
        .filter(Boolean)
        .join(' · ') || null,
      xpEarned,
      score,
      progress: 1,
      onNext: () => {
        if (xpEarned > 0) playSound(SOUND_KEYS.xpGain);
        onComplete?.({ score, answers: { matches: payload } });
      },
    });
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Drag terms onto definitions (wrong placements are allowed). Drag a placed term
        back to Terms to return it, or onto another target to move it. On touch: tap a
        filled target to pick it up, then tap Terms to put it back.
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Paper
          sx={{
            p: 2,
            flex: 1,
            border: holdingTerm ? '2px dashed' : '1px solid',
            borderColor: holdingTerm ? 'secondary.main' : 'divider',
            bgcolor: holdingTerm ? 'action.hover' : 'background.paper',
            transition: 'border-color 0.2s ease, background-color 0.2s ease',
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(event) => {
            event.preventDefault();
            dragHadDropRef.current = true;
            const termIndex = resolveDragTermIndex(event);
            if (termIndex == null) return;
            returnToBank(termIndex);
          }}
          onClick={() => {
            if (feedback?.open || suppressClickRef.current) return;
            if (selectedIndex == null) return;
            returnToBank(selectedIndex);
          }}
        >
          <Typography fontWeight={800} sx={{ mb: 1 }}>
            Terms
          </Typography>
          <Stack spacing={1}>
            {unmatched.map(({ item, index }) => {
              const active = selectedIndex === index || draggingIndex === index;
              return (
                <MotionBox
                  key={`term-${index}`}
                  // Avoid staggered "hidden" variants — remounted terms stayed opacity: 0.
                  initial={false}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/plain', String(index));
                    event.dataTransfer.effectAllowed = 'move';
                    suppressClickRef.current = true;
                    dragHadDropRef.current = false;
                    pickUp(index);
                  }}
                  onDragEnd={() => {
                    setDraggingIndex(null);
                    window.setTimeout(() => {
                      suppressClickRef.current = false;
                    }, 0);
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (suppressClickRef.current) return;
                    pickUp(index);
                  }}
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  animate={active ? { scale: 1.04, y: -4 } : { scale: 1, y: 0, opacity: 1 }}
                  sx={{
                    px: 1.5,
                    py: 1.25,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: active ? 'secondary.main' : 'divider',
                    bgcolor: active ? 'action.selected' : 'background.paper',
                    cursor: 'grab',
                    fontWeight: 700,
                    userSelect: 'none',
                    opacity: 1,
                  }}
                >
                  {itemTerm(item)}
                </MotionBox>
              );
            })}
            {!unmatched.length ? (
              <Typography variant="body2" color="text.secondary">
                {holdingTerm ? 'Drop here to return a term' : 'All terms placed.'}
              </Typography>
            ) : holdingTerm ? (
              <Typography variant="caption" color="text.secondary">
                Drop here to return a term to the bank
              </Typography>
            ) : null}
          </Stack>
        </Paper>

        <Paper sx={{ p: 2, flex: 1.2 }}>
          <Typography fontWeight={800} sx={{ mb: 1 }}>
            Targets
          </Typography>
          <Stack spacing={1}>
            {targets.map((target) => {
              const filledEntry = Object.entries(matches).find(
                ([, targetId]) => targetId === target.id,
              );
              const filledIndex =
                filledEntry != null ? Number(filledEntry[0]) : null;
              const filledItem =
                filledIndex != null && Number.isFinite(filledIndex)
                  ? items[filledIndex]
                  : null;

              return (
                <MotionBox
                  key={target.id}
                  initial={false}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    dragHadDropRef.current = true;
                    const termIndex = resolveDragTermIndex(event);
                    assignMatch(termIndex, target.id);
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (feedback?.open || suppressClickRef.current) return;
                    if (selectedIndex != null) {
                      assignMatch(selectedIndex, target.id);
                      return;
                    }
                    if (filledIndex == null) return;
                    // Touch: lift into bank selection so it can be returned or moved.
                    clearMatch(filledIndex);
                    pickUp(filledIndex);
                  }}
                  draggable={Boolean(filledItem)}
                  onDragStart={(event) => {
                    if (filledIndex == null) {
                      event.preventDefault();
                      return;
                    }
                    event.dataTransfer.setData('text/plain', String(filledIndex));
                    event.dataTransfer.effectAllowed = 'move';
                    suppressClickRef.current = true;
                    dragHadDropRef.current = false;
                    // Keep placement until a successful drop so cancel doesn't lose the term.
                    pickUp(filledIndex);
                  }}
                  onDragEnd={() => {
                    setDraggingIndex(null);
                    // If the drag was cancelled (no drop), clear selection but keep placement.
                    if (!dragHadDropRef.current) {
                      setSelectedIndex(null);
                    }
                    window.setTimeout(() => {
                      suppressClickRef.current = false;
                    }, 0);
                  }}
                  animate={
                    filledItem
                      ? {
                          scale: justFilled === target.id ? [1, 1.08, 1] : 1,
                          y: justFilled === target.id ? [0, -4, 0] : 0,
                          opacity: 1,
                        }
                      : holdingTerm
                        ? {
                            scale: [1, 1.02, 1],
                            borderColor: ['#94a3b8', '#0d9488', '#94a3b8'],
                            opacity: 1,
                          }
                        : { scale: 1, opacity: 1 }
                  }
                  transition={{
                    duration: filledItem ? 0.4 : 1.4,
                    repeat: filledItem ? 0 : holdingTerm ? Infinity : 0,
                  }}
                  sx={{
                    minHeight: 64,
                    px: 1.5,
                    py: 1.25,
                    borderRadius: 2,
                    border: '2px dashed',
                    borderColor: filledItem ? 'primary.main' : 'divider',
                    bgcolor: filledItem ? 'action.selected' : 'action.hover',
                    boxShadow: filledItem
                      ? '0 8px 18px rgba(59,130,246,0.18)'
                      : 'none',
                    cursor: filledItem ? 'grab' : 'pointer',
                    userSelect: 'none',
                    opacity: 1,
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 0.5 }}
                  >
                    {target.definition}
                  </Typography>
                  <Typography fontWeight={800}>
                    {filledItem ? itemTerm(filledItem) : 'Drop term here'}
                  </Typography>
                </MotionBox>
              );
            })}
          </Stack>
        </Paper>
      </Stack>

      <Button
        variant="contained"
        disabled={feedback?.open || placedCount < items.length}
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
