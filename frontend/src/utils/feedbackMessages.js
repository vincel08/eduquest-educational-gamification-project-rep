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

export function pickFeedbackMessage(isCorrect, customMessage) {
  if (customMessage) return customMessage;
  const pool = isCorrect ? CORRECT_MESSAGES : INCORRECT_MESSAGES;
  return pool[Math.floor(Math.random() * pool.length)];
}

export { CORRECT_MESSAGES, INCORRECT_MESSAGES };
