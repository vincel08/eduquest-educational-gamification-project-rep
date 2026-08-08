import { useMemo, useState } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
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

export default function MemoryMatch({ gameData, onComplete, xpReward = 50 }) {
  const pairs = useMemo(() => gameData?.items || gameData?.pairs || [], [gameData]);
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
  const { feedback, showFeedback, handleNext } = useAnswerFeedback({ autoAdvanceMs: 1800 });

  const totalPairs = pairs.length || Math.floor(cards.length / 2);
  const perPairXp = Math.max(5, Math.round(Number(xpReward) / Math.max(totalPairs, 1)));

  function selectCard(card) {
    if (lock || feedback?.open || matched.includes(card.id) || flipped.find((item) => item.id === card.id)) {
      return;
    }

    const nextFlipped = [...flipped, card];
    setFlipped(nextFlipped);

    if (nextFlipped.length < 2) return;

    const nextMoves = moves + 1;
    setMoves(nextMoves);
    setLock(true);
    const [first, second] = nextFlipped;
    const isCorrect = first.pairId === second.pairId;
    const matchedCount = isCorrect ? matched.length + 2 : matched.length;
    const score = Math.max(40, 100 - nextMoves * 3);
    const progress = totalPairs ? (matchedCount / 2) / totalPairs : 0;

    showFeedback({
      isCorrect,
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
  }

  if (!cards.length) {
    return <Typography color="text.secondary">No memory pairs available.</Typography>;
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Moves: {moves} · Matched: {matched.length / 2}/{totalPairs}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 1.5 }}>
        {cards.map((card) => {
          const isOpen = flipped.some((item) => item.id === card.id) || matched.includes(card.id);
          return (
            <Paper
              key={card.id}
              onClick={() => selectCard(card)}
              sx={{
                p: 2,
                minHeight: 90,
                cursor: feedback?.open ? 'default' : 'pointer',
                display: 'grid',
                placeItems: 'center',
                bgcolor: matched.includes(card.id) ? 'rgba(15,118,110,0.15)' : 'background.paper',
              }}
            >
              <Typography variant="body2" textAlign="center">
                {isOpen ? card.text : '?'}
              </Typography>
            </Paper>
          );
        })}
      </Box>

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
