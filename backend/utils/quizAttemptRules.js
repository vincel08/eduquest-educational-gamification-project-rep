import AppError from './AppError.js';
import { getSchoolYearEndExclusiveForDate } from './schoolYears.js';

export const MAX_QUIZ_ATTEMPTS = 3;
export const QUIZ_REWARD_SCORE_MIN = 70;
export const MAX_EXTRA_ATTEMPTS_GRANT = 3;

export function isPastDue(dueAt, now = new Date()) {
  if (!dueAt) return false;
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return false;
  return now.getTime() > due.getTime();
}

export function isQuizPastDue(quiz, now = new Date()) {
  return isPastDue(quiz?.due_at ?? quiz?.dueAt, now);
}

/**
 * Effective due for a student:
 * - Class due is capped by the school-year end of the quiz (May 1 exclusive = April 30 end).
 * - Quizzes without due_at still close when that school year ends.
 * - Personal extended_due_at may reopen past class due and school-year end.
 */
export function resolveEffectiveDueAt(
  classDueAt,
  extendedDueAt,
  quiz = null,
  now = new Date(),
) {
  const syRef =
    quiz?.due_at ||
    quiz?.dueAt ||
    quiz?.created_at ||
    quiz?.createdAt ||
    now;
  const syEnd = new Date(getSchoolYearEndExclusiveForDate(syRef).replace(' ', 'T'));

  const classDue = classDueAt ? new Date(classDueAt) : null;
  const classValid = classDue && !Number.isNaN(classDue.getTime()) ? classDue : null;
  const cappedClass =
    classValid && classValid.getTime() <= syEnd.getTime() ? classValid : syEnd;

  const extended = extendedDueAt ? new Date(extendedDueAt) : null;
  const extendedValid =
    extended && !Number.isNaN(extended.getTime()) ? extended : null;

  if (extendedValid && extendedValid.getTime() > cappedClass.getTime()) {
    return extendedValid.toISOString();
  }
  return cappedClass.toISOString();
}

export function resolveMaxAttempts(extraAttempts = 0) {
  return MAX_QUIZ_ATTEMPTS + Math.max(0, Number(extraAttempts) || 0);
}

export function buildAttemptMeta({
  attemptsUsed = 0,
  dueAt = null,
  maxAttempts = MAX_QUIZ_ATTEMPTS,
  classDueAt = null,
  extraAttempts = 0,
  hasOverride = false,
  now = new Date(),
} = {}) {
  const max = Math.max(MAX_QUIZ_ATTEMPTS, Number(maxAttempts) || MAX_QUIZ_ATTEMPTS);
  const used = Math.max(0, Number(attemptsUsed) || 0);
  const remaining = Math.max(0, max - used);
  const closed = isPastDue(dueAt, now);
  return {
    maxAttempts: max,
    attemptsUsed: used,
    attemptsRemaining: remaining,
    dueAt: dueAt || null,
    classDueAt: classDueAt || null,
    extraAttempts: Math.max(0, Number(extraAttempts) || 0),
    hasOverride: Boolean(hasOverride),
    isClosed: closed,
    outOfAttempts: remaining <= 0,
  };
}

export function assertQuizOpenForAttempt(attemptsUsed, {
  effectiveDueAt = null,
  maxAttempts = MAX_QUIZ_ATTEMPTS,
} = {}) {
  if (isPastDue(effectiveDueAt)) {
    throw new AppError(
      'This quiz is closed (past due date or school year ended).',
      403,
    );
  }
  const max = Math.max(MAX_QUIZ_ATTEMPTS, Number(maxAttempts) || MAX_QUIZ_ATTEMPTS);
  if (Number(attemptsUsed) >= max) {
    throw new AppError(`You have used all ${max} attempts for this quiz.`, 403);
  }
}

export function buildFailPointers(questions, scoredWrongIds) {
  const wrongSet = new Set((scoredWrongIds || []).map((id) => Number(id)));
  return (questions || [])
    .filter((question) => wrongSet.has(Number(question.id)))
    .map((question) => ({
      questionId: Number(question.id),
      questionText: question.question_text,
      pointer: question.explanation
        || 'Review this topic in your lesson materials, then try again.',
    }));
}
