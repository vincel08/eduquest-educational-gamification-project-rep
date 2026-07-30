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

export function pickMascotMessage({ xpInLevel, xpToNextLevel, streak } = {}) {
  if (xpToNextLevel && xpInLevel != null && xpToNextLevel - xpInLevel <= 20) {
    return 'One more quiz to level up!';
  }
  if (streak && streak >= 3) {
    return `Amazing ${streak}-day streak!`;
  }
  return pick(MASCOT_MESSAGES);
}

export {
  CORRECT_MESSAGES,
  INCORRECT_MESSAGES,
  MOTIVATIONAL_MESSAGES,
  MASCOT_MESSAGES,
};
