import { useCallback, useEffect, useState } from 'react';
import { celebrate } from '../utils/confetti';
import { pickFeedbackMessage } from '../utils/feedbackMessages';
import { playSound, SOUND_KEYS } from '../utils/soundEffects';

const DEFAULT_AUTO_MS = 2500;

export default function useAnswerFeedback({ autoAdvanceMs = DEFAULT_AUTO_MS } = {}) {
  const [feedback, setFeedback] = useState(null);

  const clearFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  const showFeedback = useCallback((payload) => {
    const isCorrect = Boolean(payload.isCorrect);
    const next = {
      open: true,
      isCorrect,
      correctAnswer: payload.correctAnswer ?? null,
      userAnswer: payload.userAnswer ?? null,
      explanation: payload.explanation ?? null,
      xpEarned: isCorrect ? (Number(payload.xpEarned) || 0) : 0,
      score: Number(payload.score) || 0,
      progress: Math.max(0, Math.min(1, Number(payload.progress) || 0)),
      message: pickFeedbackMessage(isCorrect, payload.message),
      onNext: payload.onNext || null,
      autoAdvanceMs: payload.autoAdvanceMs ?? autoAdvanceMs,
    };

    setFeedback(next);

    if (payload.silent) {
      // Caller plays a custom cue instead.
    } else if (isCorrect) {
      playSound(payload.soundKey || SOUND_KEYS.correct);
      celebrate();
    } else {
      playSound(payload.soundKey || SOUND_KEYS.wrong);
    }
  }, [autoAdvanceMs]);

  useEffect(() => {
    if (!feedback?.open || !feedback.onNext) return undefined;
    const delay = feedback.autoAdvanceMs ?? DEFAULT_AUTO_MS;
    if (!delay || delay <= 0) return undefined;

    const timer = setTimeout(() => {
      const next = feedback.onNext;
      setFeedback(null);
      next?.();
    }, delay);

    return () => clearTimeout(timer);
  }, [feedback]);

  const handleNext = useCallback(() => {
    const next = feedback?.onNext;
    setFeedback(null);
    next?.();
  }, [feedback]);

  return {
    feedback,
    showFeedback,
    clearFeedback,
    handleNext,
  };
}
