/**
 * Display labels for educational game type slugs.
 * Keep aligned with TeacherAiGamePage templates and backend/utils/gameTypes.js.
 */

export const GAME_TYPE_LABELS = {
  auto: "Auto Select",
  flashcards: "Flashcards",
  memory_match: "Memory Match",
  crossword: "Crossword",
  word_search: "Word Search",
  word_scramble: "Word Search",
  quiz_show: "Quiz Show",
  quiz_rush: "Quiz Show",
  jeopardy: "Jeopardy",
  drag_drop: "Drag and Drop",
  spin_wheel: "Spin Wheel",
  millionaire: "Millionaire",
  escape_room: "Escape Room",
  mission_adventure: "Mission Adventure",
  puzzle_challenge: "Puzzle Challenge",
  true_false_blitz: "True/False Blitz",
};

export function formatGameTypeLabel(gameType) {
  const key = String(gameType || "")
    .trim()
    .toLowerCase();
  if (!key) return "—";
  if (GAME_TYPE_LABELS[key]) return GAME_TYPE_LABELS[key];
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
