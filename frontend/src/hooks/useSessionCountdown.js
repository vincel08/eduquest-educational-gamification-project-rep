import { useEffect, useRef, useState } from 'react';

/**
 * Shared countdown helpers for game/quiz session timers.
 */

export function resolveTimeLimitMinutes(value, fallback = 10) {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  return Math.min(180, Math.max(1, Math.round(raw)));
}

export function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * @param {number|null|undefined} minutes
 * @param {{ enabled?: boolean, onExpire?: () => void, fallbackMinutes?: number }} options
 */
export default function useSessionCountdown(minutes, options = {}) {
  const { enabled = true, onExpire, fallbackMinutes = 10 } = options;
  const totalSeconds = resolveTimeLimitMinutes(minutes, fallbackMinutes) * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    expiredRef.current = false;
    setSecondsLeft(totalSeconds);
  }, [totalSeconds, enabled]);

  useEffect(() => {
    if (!enabled) return undefined;

    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [totalSeconds, enabled]);

  useEffect(() => {
    if (!enabled || secondsLeft > 0 || expiredRef.current) return;
    expiredRef.current = true;
    onExpireRef.current?.();
  }, [secondsLeft, enabled]);

  const isUrgent = secondsLeft <= Math.max(30, Math.round(totalSeconds * 0.1));
  const elapsedSeconds = Math.max(0, totalSeconds - secondsLeft);

  return {
    secondsLeft,
    totalSeconds,
    elapsedSeconds,
    isUrgent,
    formatted: formatClock(secondsLeft),
    limitFormatted: formatClock(totalSeconds),
    progress: totalSeconds ? (secondsLeft / totalSeconds) * 100 : 0,
  };
}
