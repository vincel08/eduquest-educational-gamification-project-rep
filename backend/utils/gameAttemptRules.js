import AppError from './AppError.js';

export const MAX_GAME_ATTEMPTS = 3;
export const MAX_GAME_EXTRA_ATTEMPTS_GRANT = 3;

export function resolveMaxGameAttempts(extraAttempts = 0) {
  return MAX_GAME_ATTEMPTS + Math.max(0, Number(extraAttempts) || 0);
}

export function buildGameAttemptMeta({
  attemptsUsed = 0,
  extraAttempts = 0,
} = {}) {
  const used = Math.max(0, Number(attemptsUsed) || 0);
  const extra = Math.max(0, Number(extraAttempts) || 0);
  const maxAttempts = resolveMaxGameAttempts(extra);
  const remaining = Math.max(0, maxAttempts - used);
  return {
    maxAttempts,
    attemptsUsed: used,
    attemptsRemaining: remaining,
    extraAttempts: extra,
    outOfAttempts: remaining <= 0,
  };
}

export function assertGameAttemptsAvailable(attemptsUsed, extraAttempts = 0) {
  const meta = buildGameAttemptMeta({ attemptsUsed, extraAttempts });
  if (meta.outOfAttempts) {
    throw new AppError(
      `You have used all ${meta.maxAttempts} attempts for this game.`,
      403,
    );
  }
  return meta;
}
