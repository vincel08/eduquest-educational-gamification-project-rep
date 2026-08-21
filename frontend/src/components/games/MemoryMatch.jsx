import { useMemo, useState } from 'react';
import { LinearProgress, Stack, Typography, useTheme } from '@mui/material';
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

export default function MemoryMatch({ gameData, onComplete, xpReward = 50 }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const pairs = useMemo(
    () => firstNonEmptyList(gameData?.items, gameData?.pairs),
    [gameData]
  );
  const cards = useMemo(() => {
    const built = pairs.flatMap((pair, index) => ([
      { id: `t-${index}`, pairId: index, text: pair.term, kind: 'term' },
      { id: `d-${index}`, pairId: index, text: pair.definition, kind: 'definition' },
    ]));
    return shuffle(built);
  }, [pairs]);

  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);
  const [shakeIds, setShakeIds] = useState([]);
  const { feedback, showFeedback, handleNext } = useAnswerFeedback({ autoAdvanceMs: 1800 });
  useRegisterTimeoutSubmit(() => {
    const totalPairs = pairs.length || Math.floor(cards.length / 2);
    const matchedPairs = matched.length / 2;
    const score = totalPairs ? Math.round((matchedPairs / totalPairs) * 100) : 0;
    return {
      score,
      answers: { moves, matchedPairs },
    };
  });

  const totalPairs = pairs.length || Math.floor(cards.length / 2);
  const perPairXp = Math.max(5, Math.round(Number(xpReward) / Math.max(totalPairs, 1)));
  const matchedPairs = matched.length / 2;

  function selectCard(card) {
    if (lock || feedback?.open || matched.includes(card.id) || flipped.find((item) => item.id === card.id)) {
      return;
    }

    const nextFlipped = [...flipped, card];
    setFlipped(nextFlipped);
    playSound(SOUND_KEYS.flip);

    // First card only — wait for the second pick before judging.
    if (nextFlipped.length < 2) return;

    const nextMoves = moves + 1;
    setMoves(nextMoves);
    setLock(true);
    const [first, second] = nextFlipped;
    const isCorrect = first.pairId === second.pairId;
    const matchedCount = isCorrect ? matched.length + 2 : matched.length;
    const score = Math.max(40, 100 - nextMoves * 3);
    const progress = totalPairs ? (matchedCount / 2) / totalPairs : 0;

    // Let the second card finish flipping before correct/incorrect feedback.
    const REVEAL_MS = 550;
    window.setTimeout(() => {
      if (!isCorrect) {
        setShakeIds([first.id, second.id]);
        window.setTimeout(() => setShakeIds([]), 500);
      }

      showFeedback({
        isCorrect,
        soundKey: isCorrect ? SOUND_KEYS.match : SOUND_KEYS.wrong,
        userAnswer: `${first.text} + ${second.text}`,
        correctAnswer: isCorrect
          ? 'Matching pair'
          : 'Pick a term and its matching definition',
        explanation: isCorrect
          ? null
          : 'Those cards do not belong together. Try again!',
        xpEarned: isCorrect ? perPairXp : 0,
        score,
        progress,
        onNext: () => {
          if (isCorrect) {
            const nextMatched = [...matched, first.id, second.id];
            setMatched(nextMatched);
            setFlipped([]);
            setLock(false);
            if (nextMatched.length === cards.length) {
              const finalScore = Math.max(40, 100 - nextMoves * 3);
              onComplete?.({
                score: finalScore,
                answers: {
                  moves: nextMoves,
                  matchedPairs: nextMatched.length / 2,
                },
              });
            }
            return;
          }

          setFlipped([]);
          setLock(false);
        },
      });
    }, REVEAL_MS);
  }

  if (!cards.length) {
    return <Typography color="text.secondary">No memory pairs available.</Typography>;
  }

  return (
    <Stack spacing={2}>
      <Stack spacing={1}>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary" fontWeight={700}>
            Moves: {moves}
          </Typography>
          <Typography variant="body2" color="text.secondary" fontWeight={700}>
            Matched: {matchedPairs}/{totalPairs}
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={totalPairs ? (matchedPairs / totalPairs) * 100 : 0}
          sx={{
            height: 8,
            borderRadius: 999,
            bgcolor: 'action.hover',
            '& .MuiLinearProgress-bar': { borderRadius: 999, bgcolor: '#0D9488' },
          }}
        />
      </Stack>

      <MotionBox
        {...choiceListProps}
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(auto-fill, minmax(148px, 1fr))',
            sm: 'repeat(auto-fill, minmax(168px, 1fr))',
          },
          gap: 1.5,
        }}
      >
        {cards.map((card, cardIndex) => {
          const isOpen = flipped.some((item) => item.id === card.id) || matched.includes(card.id);
          const isMatched = matched.includes(card.id);
          const isShaking = shakeIds.includes(card.id);
          const text = String(card.text || '');
          const longText = text.length > 48;
          return (
            <MotionBox
              key={card.id}
              custom={cardIndex}
              variants={gridItemVariants}
              onClick={() => selectCard(card)}
              animate={{
                rotateY: isOpen ? 0 : 180,
                scale: isMatched ? [1, 1.1, 1] : 1,
                x: isShaking ? [0, -8, 8, -6, 6, 0] : 0,
              }}
              transition={{
                rotateY: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
                scale: { duration: 0.45 },
                x: { duration: 0.45 },
              }}
              whileHover={feedback?.open || isMatched ? undefined : { y: -4 }}
              whileTap={{ scale: feedback?.open ? 1 : 0.95 }}
              style={{ transformStyle: 'preserve-3d' }}
              sx={{
                height: { xs: 128, sm: 140 },
                cursor: feedback?.open || isMatched ? 'default' : 'pointer',
                position: 'relative',
              }}
            >
              {/* Back (hidden face) */}
              <MotionBox
                sx={{
                  position: 'absolute',
                  inset: 0,
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  borderRadius: 2.5,
                  display: 'grid',
                  placeItems: 'center',
                  border: '2px solid',
                  borderColor: 'divider',
                  overflow: 'hidden',
                  background: isDark
                    ? 'repeating-linear-gradient(45deg, #1e293b, #1e293b 8px, #0f172a 8px, #0f172a 16px)'
                    : 'repeating-linear-gradient(45deg, #e2e8f0, #e2e8f0 8px, #f1f5f9 8px, #f1f5f9 16px)',
                  boxShadow: '0 8px 20px rgba(15,23,42,0.1)',
                }}
              >
                <Typography variant="h5" fontWeight={900} color="text.secondary">?</Typography>
              </MotionBox>

              {/* Front (revealed) */}
              <MotionBox
                sx={{
                  position: 'absolute',
                  inset: 0,
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  borderRadius: 2.5,
                  px: 1.25,
                  py: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid',
                  borderColor: isMatched ? '#0D9488' : 'divider',
                  bgcolor: isMatched
                    ? (isDark ? 'rgba(13,148,136,0.25)' : 'rgba(13,148,136,0.12)')
                    : 'background.paper',
                  boxShadow: isMatched
                    ? '0 0 0 3px rgba(13,148,136,0.25), 0 10px 24px rgba(13,148,136,0.2)'
                    : '0 8px 20px rgba(15,23,42,0.1)',
                  overflow: 'hidden',
                }}
              >
                <Typography
                  component="span"
                  textAlign="center"
                  fontWeight={700}
                  title={text}
                  sx={{
                    width: '100%',
                    maxHeight: '100%',
                    overflowY: 'auto',
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                    hyphens: 'auto',
                    lineHeight: 1.3,
                    fontSize: longText
                      ? { xs: '0.72rem', sm: '0.8rem' }
                      : { xs: '0.85rem', sm: '0.9rem' },
                  }}
                >
                  {text}
                </Typography>
              </MotionBox>
            </MotionBox>
          );
        })}
      </MotionBox>

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
        nextLabel={matched.length + 2 >= cards.length && feedback?.isCorrect ? 'See Results' : 'Continue'}
      />
    </Stack>
  );
}
