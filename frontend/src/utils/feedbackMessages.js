const CORRECT_MESSAGES = [
  'Excellent!',
  'Amazing!',
  'Well Done!',
  'Keep it up!',
  'Fantastic!',
  "You're doing great!",
];

const INCORRECT_MESSAGES = [
  "Don't give up!",
  'Try the next one!',
  'Learning comes from mistakes.',
  'Keep practicing!',
];

const MOTIVATIONAL_MESSAGES = [
  'Excellent work!',
  "You're improving every day!",
  'Knowledge is your superpower!',
  'Keep going!',
  "You're doing great!",
  'One step closer to mastery!',
  'Proud of your progress!',
  'Learning looks good on you!',
];

const MASCOT_MESSAGES = [
  'Great job!',
  'Keep learning!',
  "You're almost there!",
  'One more quiz to level up!',
  'Stay curious!',
  'Your streak is awesome!',
  'Ready for the next quest?',
];

function pick(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

export function pickFeedbackMessage(isCorrect, customMessage) {
  if (customMessage) return customMessage;
  return pick(isCorrect ? CORRECT_MESSAGES : INCORRECT_MESSAGES);
}

export function pickMotivationalMessage() {
  return pick(MOTIVATIONAL_MESSAGES);
}

/**
 * Pick a mascot tip. Contextual tips are candidates, not hard locks,
 * so messages keep rotating every few seconds.
 */
export function pickMascotMessage({
  xpInLevel,
  xpToNextLevel,
  streak,
  previousMessage = null,
} = {}) {
  const candidates = [...MASCOT_MESSAGES];
  const inLevel = Number(xpInLevel);
  const perLevel = Number(xpToNextLevel) > 0 && Number(xpToNextLevel) <= 100
    ? Number(xpToNextLevel)
    : 100;

  if (Number.isFinite(inLevel)) {
    const remaining = perLevel - inLevel;
    if (remaining > 0 && remaining <= 20) {
      candidates.push('One more quiz to level up!', "You're almost there!");
    }
  }

  if (streak && streak >= 3) {
    candidates.push(`Amazing ${streak}-day streak!`, 'Your streak is awesome!');
  }

  const unique = [...new Set(candidates)];
  const pool = previousMessage
    ? unique.filter((item) => item !== previousMessage)
    : unique;

  return pick(pool.length ? pool : unique);
}

export {
  CORRECT_MESSAGES,
  INCORRECT_MESSAGES,
  MOTIVATIONAL_MESSAGES,
  MASCOT_MESSAGES,
};
