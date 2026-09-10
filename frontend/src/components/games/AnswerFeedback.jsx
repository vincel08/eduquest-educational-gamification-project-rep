import { useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import { AnimatePresence, motion } from 'framer-motion';

const MotionBox = motion.create(Box);

function FeedbackBody({
  isCorrect,
  correctAnswer,
  userAnswer,
  explanation,
  xpEarned,
  score,
  progress,
  message,
  onNext,
  nextLabel,
  compact = false,
}) {
  const themeColor = isCorrect ? '#16A34A' : '#DC2626';
  const glassBg = isCorrect
    ? 'rgba(22, 163, 74, 0.16)'
    : 'rgba(220, 38, 38, 0.14)';

  return (
    <MotionBox
      key={isCorrect ? 'correct' : 'incorrect'}
      initial={{ opacity: 0, scale: compact ? 0.96 : 0.82, y: 18 }}
      animate={
        isCorrect
          ? { opacity: 1, scale: compact ? 1 : [0.82, 1.08, 1], y: 0 }
          : {
              opacity: 1,
              scale: 1,
              x: compact ? 0 : [0, -10, 10, -8, 8, -4, 4, 0],
              y: 0,
            }
      }
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: isCorrect ? 0.45 : 0.55, ease: 'easeOut' }}
      sx={{
        p: compact ? { xs: 2, sm: 2.25 } : { xs: 2.5, sm: 3 },
        borderRadius: 4,
        border: `1px solid ${themeColor}55`,
        background: isCorrect
          ? 'linear-gradient(145deg, rgba(34,197,94,0.18), rgba(250,204,21,0.16), rgba(255,255,255,0.78))'
          : `linear-gradient(145deg, ${glassBg}, rgba(255,255,255,0.72))`,
        backdropFilter: 'blur(16px)',
        boxShadow: isCorrect
          ? '0 20px 50px rgba(124,58,237,0.22)'
          : `0 20px 50px ${themeColor}33`,
        textAlign: 'center',
      }}
    >
      <Box sx={{ display: 'grid', placeItems: 'center', mb: compact ? 0.5 : 1 }}>
        {isCorrect ? (
          <CheckCircleRoundedIcon
            sx={{ fontSize: compact ? 40 : 64, color: themeColor }}
          />
        ) : (
          <CancelRoundedIcon
            sx={{ fontSize: compact ? 40 : 64, color: themeColor }}
          />
        )}
      </Box>

      <Typography
        variant={compact ? 'h6' : 'h5'}
        fontWeight={900}
        sx={{ color: themeColor }}
      >
        {isCorrect ? 'Correct!' : 'Incorrect'}
      </Typography>

      {!compact ? (
        <Typography variant="h6" sx={{ mt: 0.5 }}>
          {isCorrect ? 'Great job!' : 'Not quite'}
        </Typography>
      ) : null}

      {message ? (
        <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">
          {message}
        </Typography>
      ) : null}

      <Stack spacing={1} sx={{ mt: compact ? 1.5 : 2.5, textAlign: 'left' }}>
        {userAnswer != null && String(userAnswer).length > 0 ? (
          <Typography variant="body2">
            Your answer: <strong>{String(userAnswer)}</strong>
          </Typography>
        ) : null}

        {!isCorrect &&
        correctAnswer != null &&
        String(correctAnswer).length > 0 &&
        !compact ? (
          <Typography variant="body2">
            Correct answer: <strong>{String(correctAnswer)}</strong>
          </Typography>
        ) : null}

        {!isCorrect && explanation && !compact ? (
          <Typography variant="body2" color="text.secondary">
            {explanation}
          </Typography>
        ) : null}

        {xpEarned > 0 ? (
          <Typography variant="body2" fontWeight={700} sx={{ color: themeColor }}>
            +{xpEarned} XP earned
          </Typography>
        ) : null}

        <Typography variant="body2">
          Current Score: <strong>{score}</strong>
        </Typography>

        <Box>
          <Typography variant="caption" color="text.secondary">
            Progress {Math.round((progress || 0) * 100)}%
          </Typography>
          <LinearProgress
            variant="determinate"
            value={Math.max(0, Math.min(100, (progress || 0) * 100))}
            sx={{
              mt: 0.5,
              height: 10,
              borderRadius: 999,
              bgcolor: 'rgba(15,23,42,0.08)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 999,
                background: isCorrect
                  ? 'linear-gradient(90deg, #2563EB, #7C3AED, #FACC15)'
                  : themeColor,
              },
            }}
          />
        </Box>
      </Stack>

      <Button
        fullWidth
        variant="contained"
        onClick={() => onNext?.()}
        sx={{
          mt: compact ? 2 : 3,
          py: 1.2,
          borderRadius: 999,
          bgcolor: isCorrect ? 'primary.main' : themeColor,
          backgroundImage: isCorrect
            ? 'linear-gradient(90deg, #2563EB, #7C3AED)'
            : 'none',
          '&:hover': { filter: 'brightness(0.94)' },
        }}
      >
        {nextLabel}
      </Button>
    </MotionBox>
  );
}

export default function AnswerFeedback({
  open = false,
  isCorrect = false,
  correctAnswer = null,
  userAnswer = null,
  explanation = null,
  xpEarned = 0,
  score = 0,
  progress = 0,
  message = '',
  onNext,
  nextLabel = 'Next Question',
  variant = 'modal',
}) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onNext?.();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onNext]);

  const bodyProps = {
    isCorrect,
    correctAnswer,
    userAnswer,
    explanation,
    xpEarned,
    score,
    progress,
    message,
    onNext,
    nextLabel,
  };

  if (variant === 'inline') {
    return (
      <AnimatePresence>
        {open ? (
          <FeedbackBody key="inline-feedback" {...bodyProps} compact />
        ) : null}
      </AnimatePresence>
    );
  }

  return (
    <Dialog
      open={Boolean(open)}
      onClose={() => onNext?.()}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          overflow: 'visible',
          borderRadius: 4,
          background: 'transparent',
          boxShadow: 'none',
        },
      }}
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: 'blur(6px)',
            backgroundColor: 'rgba(15, 23, 42, 0.35)',
          },
        },
      }}
    >
      <AnimatePresence>
        {open ? (
          <FeedbackBody key="modal-feedback" {...bodyProps} />
        ) : null}
      </AnimatePresence>
    </Dialog>
  );
}
