import { useMemo, useState } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import AnswerFeedback from './AnswerFeedback';
import useAnswerFeedback from '../../hooks/useAnswerFeedback';
import { SOUND_KEYS } from '../../utils/soundEffects';
import { useRegisterTimeoutSubmit } from '../../contexts/GameSessionContext';
import {
  AnimatePresence,
  MotionBox,
  MotionStack,
} from './GameMotion';

export default function EscapeRoom({ gameData, onComplete, xpReward = 50 }) {
  const stages = useMemo(() => gameData?.stages || [], [gameData]);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState('');
  const [score, setScore] = useState(0);
  const [responses, setResponses] = useState([]);
  const [doorOpen, setDoorOpen] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const { feedback, showFeedback, handleNext } = useAnswerFeedback();
  useRegisterTimeoutSubmit(() => ({
    score,
    answers: { responses },
  }));

  if (!stages.length) {
    return <Typography color="text.secondary">No escape room stages available.</Typography>;
  }

  const current = stages[index];
  const perXp = Math.max(5, Math.round(Number(xpReward) / stages.length));
  const isLocked = !doorOpen && !unlocking;

  function submit() {
    if (feedback?.open || unlocking || doorOpen) return;
    const expected = String(current.answer || '').trim().toLowerCase();
    const given = draft.trim().toLowerCase();
    const isCorrect = Boolean(expected && given === expected);
    const nextScore = isCorrect ? Math.min(100, score + Math.round(100 / stages.length)) : score;

    showFeedback({
      isCorrect,
      soundKey: isCorrect ? SOUND_KEYS.unlock : SOUND_KEYS.wrong,
      userAnswer: draft || '(blank)',
      correctAnswer: current.answer,
      explanation: isCorrect ? null : (current.hint || `The code is related to: ${current.clue}`),
      xpEarned: isCorrect ? perXp : 0,
      score: nextScore,
      progress: (index + 1) / stages.length,
      onNext: () => {
        const nextResponses = [...responses, draft];
        setResponses(nextResponses);

        if (!isCorrect) {
          onComplete?.({ score, answers: { responses: nextResponses } });
          return;
        }

        setUnlocking(true);
        setDoorOpen(true);

        window.setTimeout(() => {
          if (index + 1 >= stages.length) {
            onComplete?.({ score: nextScore, answers: { responses: nextResponses } });
            return;
          }
          setScore(nextScore);
          setDraft('');
          setDoorOpen(false);
          setUnlocking(false);
          setIndex((prev) => prev + 1);
        }, 1100);
      },
    });
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="body2" color="text.secondary">
          Room {index + 1}/{stages.length} · Score {score}
        </Typography>
        <Stack direction="row" spacing={0.75} sx={{ ml: 'auto' }}>
          {stages.map((_, stageIndex) => {
            const cleared = stageIndex < index || (stageIndex === index && doorOpen);
            const currentRoom = stageIndex === index;
            return (
              <Box
                key={`door-marker-${stageIndex}`}
                title={cleared ? 'Unlocked' : currentRoom ? 'Current room' : 'Locked'}
                sx={{
                  width: 28,
                  height: 36,
                  borderRadius: '4px 4px 2px 2px',
                  border: '2px solid',
                  borderColor: cleared ? '#A67C52' : currentRoom ? '#C4A484' : 'divider',
                  bgcolor: cleared ? '#8B5E3C' : currentRoom ? '#5C4033' : 'action.hover',
                  position: 'relative',
                  opacity: cleared || currentRoom ? 1 : 0.45,
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    right: 5,
                    top: '45%',
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    bgcolor: cleared ? '#F5D76E' : '#9CA3AF',
                  },
                }}
              />
            );
          })}
        </Stack>
      </Stack>

      <AnimatePresence mode="wait">
        <MotionBox
          key={`room-${index}`}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.04, filter: 'brightness(1.25)' }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 3,
            minHeight: { xs: 520, sm: 500 },
            pb: { xs: 18, sm: 0 },
            border: '1px solid',
            borderColor: 'divider',
            background: `
              linear-gradient(180deg, rgba(28, 22, 18, 0.55) 0%, transparent 28%),
              linear-gradient(90deg, rgba(40, 28, 20, 0.55) 0%, transparent 18%, transparent 82%, rgba(40, 28, 20, 0.55) 100%),
              linear-gradient(180deg, #3E2F28 0%, #2A211C 42%, #1A1410 100%)
            `,
            boxShadow: 'inset 0 0 80px rgba(0,0,0,0.45)',
          }}
        >
          {/* Ceiling beam */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: '8%',
              right: '8%',
              height: 10,
              bgcolor: '#2C211C',
              borderRadius: '0 0 4px 4px',
              boxShadow: '0 8px 18px rgba(0,0,0,0.35)',
            }}
          />

          {/* Floor */}
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: '28%',
              background: `
                repeating-linear-gradient(
                  90deg,
                  #4A3428 0px,
                  #4A3428 48px,
                  #3B2A21 48px,
                  #3B2A21 96px
                )
              `,
              clipPath: 'polygon(8% 0, 92% 0, 100% 100%, 0 100%)',
              opacity: 0.95,
            }}
          />

          {/* Wall clue plaque */}
          <MotionBox
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            sx={{
              position: 'absolute',
              top: { xs: 28, sm: 40 },
              left: { xs: 12, sm: 24 },
              maxWidth: { xs: '46%', sm: 220 },
              p: 1.5,
              borderRadius: 1,
              bgcolor: 'rgba(245, 230, 200, 0.92)',
              color: '#2C211C',
              boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
              border: '1px solid rgba(139, 94, 60, 0.45)',
              transform: 'rotate(-2deg)',
              zIndex: 2,
            }}
          >
            <Typography variant="caption" fontWeight={800} sx={{ letterSpacing: 0.6, display: 'block', mb: 0.5 }}>
              {current.name || `Room ${index + 1}`}
            </Typography>
            <Typography variant="body2" sx={{ lineHeight: 1.45 }}>
              {current.clue}
            </Typography>
          </MotionBox>

          {/* Door frame + door */}
          <Box
            sx={{
              position: 'absolute',
              left: '50%',
              bottom: '18%',
              transform: 'translateX(-50%)',
              width: { xs: 150, sm: 180 },
              height: { xs: 230, sm: 280 },
              perspective: 900,
              zIndex: 3,
            }}
          >
            {/* Frame */}
            <Box
              sx={{
                position: 'absolute',
                inset: -10,
                border: '10px solid #5C4033',
                borderBottom: 'none',
                borderRadius: '8px 8px 0 0',
                boxShadow: '0 0 0 4px #3B2A21',
              }}
            />

            {/* Light behind door when open */}
            <MotionBox
              animate={{ opacity: doorOpen ? 1 : 0 }}
              transition={{ duration: 0.45 }}
              sx={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 50% 40%, #F8E7B0 0%, #E8C56A 45%, #8B6B2E 100%)',
                boxShadow: '0 0 40px rgba(248, 231, 176, 0.55)',
              }}
            />

            {/* Door leaf */}
            <MotionBox
              animate={{
                rotateY: doorOpen ? -78 : 0,
              }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d' }}
              sx={{
                position: 'absolute',
                inset: 0,
                borderRadius: '4px 4px 0 0',
                background: `
                  linear-gradient(90deg, rgba(0,0,0,0.22) 0%, transparent 12%),
                  repeating-linear-gradient(
                    90deg,
                    #7A4F32 0px,
                    #7A4F32 18px,
                    #8B5E3C 18px,
                    #8B5E3C 36px
                  )
                `,
                border: '2px solid #3B2A21',
                boxShadow: doorOpen
                  ? '-12px 8px 28px rgba(0,0,0,0.45)'
                  : '4px 8px 24px rgba(0,0,0,0.45)',
              }}
            >
              {/* Panels */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: '12% 14%',
                  border: '3px solid rgba(59, 42, 33, 0.55)',
                  borderRadius: 1,
                  display: 'grid',
                  gridTemplateRows: '1fr 1fr',
                  gap: 1.5,
                  p: 1,
                }}
              >
                <Box sx={{ border: '2px solid rgba(59, 42, 33, 0.4)', borderRadius: 0.5 }} />
                <Box sx={{ border: '2px solid rgba(59, 42, 33, 0.4)', borderRadius: 0.5 }} />
              </Box>

              {/* Lock / knob */}
              <MotionBox
                animate={isLocked ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                transition={{ duration: 1.6, repeat: isLocked ? Infinity : 0 }}
                sx={{
                  position: 'absolute',
                  right: 14,
                  top: '48%',
                  transform: 'translateY(-50%)',
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  bgcolor: doorOpen ? '#C9A227' : '#B8860B',
                  border: '2px solid #5C4033',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#2C211C',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                }}
              >
                {doorOpen ? (
                  <LockOpenRoundedIcon sx={{ fontSize: 18 }} />
                ) : (
                  <LockRoundedIcon sx={{ fontSize: 18 }} />
                )}
              </MotionBox>
            </MotionBox>
          </Box>

          {/* Status line */}
          <Typography
            variant="caption"
            fontWeight={800}
            sx={{
              position: 'absolute',
              left: '50%',
              top: { xs: 18, sm: 'auto' },
              bottom: { xs: 'auto', sm: 132 },
              transform: 'translateX(-50%)',
              color: doorOpen ? '#F5D76E' : 'rgba(245,230,200,0.85)',
              letterSpacing: 1,
              textTransform: 'uppercase',
              zIndex: 4,
              textShadow: '0 2px 8px rgba(0,0,0,0.65)',
            }}
          >
            {doorOpen ? 'Door unlocked' : unlocking ? 'Unlocking…' : 'Door locked'}
          </Typography>

          {/* Keypad / code panel */}
          <MotionStack
            spacing={1.25}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            sx={{
              position: 'absolute',
              left: { xs: 10, sm: 'auto' },
              right: { xs: 10, sm: 20 },
              bottom: { xs: 12, sm: 20 },
              width: { xs: 'auto', sm: 260 },
              p: 1.75,
              borderRadius: 2,
              bgcolor: 'rgba(20, 16, 12, 0.88)',
              border: '1px solid rgba(196, 164, 132, 0.35)',
              backdropFilter: 'blur(8px)',
              zIndex: 5,
              boxShadow: '0 12px 28px rgba(0,0,0,0.4)',
            }}
          >
            <Typography variant="caption" sx={{ color: 'rgba(245,230,200,0.8)', fontWeight: 700 }}>
              Enter the code to unlock the door
            </Typography>
            <TextField
              size="small"
              label="Code"
              value={draft}
              disabled={feedback?.open || unlocking || doorOpen}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(245,230,200,0.08)',
                  color: '#F5E6C8',
                  '& fieldset': { borderColor: 'rgba(196, 164, 132, 0.45)' },
                  '&:hover fieldset': { borderColor: 'rgba(196, 164, 132, 0.7)' },
                },
                '& .MuiInputLabel-root': { color: 'rgba(245,230,200,0.65)' },
              }}
            />
            <Button
              variant="contained"
              disabled={feedback?.open || unlocking || doorOpen || !draft.trim()}
              onClick={submit}
              sx={{
                bgcolor: '#8B5E3C',
                color: '#F5E6C8',
                fontWeight: 800,
                '&:hover': { bgcolor: '#A67C52' },
              }}
            >
              Unlock Door
            </Button>
          </MotionStack>
        </MotionBox>
      </AnimatePresence>

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
        nextLabel={
          !feedback?.isCorrect || index + 1 >= stages.length
            ? 'See Results'
            : 'Open the Door'
        }
      />
    </Stack>
  );
}
