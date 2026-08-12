import { useMemo, useState } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import AnswerFeedback from './AnswerFeedback';
import useAnswerFeedback from '../../hooks/useAnswerFeedback';

const COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#EF4444', '#0EA5E9', '#A855F7', '#14B8A6', '#F97316'];

export default function SpinWheel({ gameData, onComplete, xpReward = 50 }) {
  const items = useMemo(() => gameData?.items || [], [gameData]);
  const [index, setIndex] = useState(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const { feedback, showFeedback, handleNext } = useAnswerFeedback();

  const totalRounds = Math.min(items.length, 5);
  const perSpinXp = Math.max(5, Math.round(Number(xpReward) / Math.max(totalRounds, 1)));
  const points = Math.round(100 / Math.max(totalRounds, 1));
  const segment = items.length ? 360 / items.length : 360;

  const gradient = useMemo(() => {
    if (!items.length) return '#ccc';
    const stops = items.map((_, i) => {
      const start = (i * segment).toFixed(2);
      const end = ((i + 1) * segment).toFixed(2);
      const color = COLORS[i % COLORS.length];
      return `${color} ${start}deg ${end}deg`;
    });
    return `conic-gradient(from -90deg, ${stops.join(', ')})`;
  }, [items, segment]);

  if (!items.length) {
    return <Typography color="text.secondary">No spin-wheel items available.</Typography>;
  }

  function spin() {
    if (spinning || feedback?.open || index !== null || answered >= totalRounds) return;
    const selected = Math.floor(Math.random() * items.length);
    // Pointer is at top (-90deg). Align selected segment center under the pointer.
    const segmentCenter = selected * segment + segment / 2;
    const extraTurns = 4 + Math.floor(Math.random() * 3);
    const nextRotation = rotation + extraTurns * 360 + (360 - segmentCenter);
    setSpinning(true);
    setRotation(nextRotation);
    window.setTimeout(() => {
      setIndex(selected);
      setSpinning(false);
    }, 3200);
  }

  function answer(choiceIndex) {
    if (index === null || feedback?.open) return;
    const current = items[index];
    const isCorrect = choiceIndex === current.correctIndex;
    const nextScore = isCorrect ? Math.min(100, score + points) : score;
    const nextAnswered = answered + 1;
    const userAnswer = current.choices?.[choiceIndex] ?? '';
    const correctAnswer = current.choices?.[current.correctIndex] ?? '';

    showFeedback({
      isCorrect,
      userAnswer,
      correctAnswer,
      explanation: current.explanation || (isCorrect ? null : `The correct choice is "${correctAnswer}".`),
      xpEarned: isCorrect ? perSpinXp : 0,
      score: nextScore,
      progress: nextAnswered / totalRounds,
      onNext: () => {
        const nextRounds = [...roundsPlayed, { itemIndex: index, choiceIndex }];
        setRoundsPlayed(nextRounds);
        setScore(nextScore);
        setAnswered(nextAnswered);
        setIndex(null);
        if (nextAnswered >= totalRounds) {
          onComplete?.({ score: nextScore, answers: { rounds: nextRounds } });
        }
      },
    });
  }

  const current = index === null ? null : items[index];

  return (
    <Stack spacing={2}>
      <Typography variant="body2">
        Score: {score} · Spins used: {answered}/{totalRounds}
      </Typography>

      <Paper sx={{ p: 3, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ width: 18, height: 24, mx: 'auto', mb: -1.25, position: 'relative', zIndex: 2 }}>
          <Box
            sx={{
              width: 0,
              height: 0,
              borderLeft: '9px solid transparent',
              borderRight: '9px solid transparent',
              borderTop: '18px solid',
              borderTopColor: 'error.main',
              mx: 'auto',
            }}
          />
        </Box>

        <Box
          sx={{
            width: { xs: 240, sm: 280 },
            height: { xs: 240, sm: 280 },
            mx: 'auto',
            borderRadius: '50%',
            background: gradient,
            border: '6px solid',
            borderColor: 'divider',
            boxShadow: 'inset 0 0 0 8px rgba(255,255,255,0.25)',
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? 'transform 3.2s cubic-bezier(0.12, 0.75, 0.12, 1)' : 'none',
            position: 'relative',
          }}
        >
          {items.map((item, i) => {
            const angle = i * segment + segment / 2;
            return (
              <Typography
                key={`${item.label || item.question}-${i}`}
                variant="caption"
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '42%',
                  transform: `rotate(${angle - 90}deg) translate(48%, -50%)`,
                  transformOrigin: 'left center',
                  color: '#fff',
                  fontWeight: 800,
                  textShadow: '0 1px 2px rgba(0,0,0,0.45)',
                  textAlign: 'left',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.label || `Item ${i + 1}`}
              </Typography>
            );
          })}
          <Box
            sx={{
              position: 'absolute',
              inset: '38%',
              borderRadius: '50%',
              bgcolor: 'background.paper',
              border: '3px solid',
              borderColor: 'divider',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            SPIN
          </Box>
        </Box>

        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
          {spinning ? 'Spinning...' : current?.label || 'Spin the wheel'}
        </Typography>
        <Button
          variant="contained"
          onClick={spin}
          disabled={spinning || Boolean(current) || feedback?.open || answered >= totalRounds}
        >
          {spinning ? 'Spinning...' : 'Spin'}
        </Button>
      </Paper>

      {current ? (
        <Stack spacing={1}>
          <Typography fontWeight={700}>{current.question}</Typography>
          {(current.choices || []).map((choice, choiceIndex) => (
            <Button
              key={`${choice}-${choiceIndex}`}
              variant="outlined"
              disabled={feedback?.open}
              onClick={() => answer(choiceIndex)}
            >
              {choice}
            </Button>
          ))}
        </Stack>
      ) : null}

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
        nextLabel={answered + 1 >= totalRounds ? 'See Results' : 'Spin Again'}
      />
    </Stack>
  );
}
