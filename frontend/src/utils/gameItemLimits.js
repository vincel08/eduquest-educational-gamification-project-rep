/**
 * Practical playable ceilings per game type (keep aligned with backend/utils/gameItemLimits.js).
 */
export const GAME_ITEM_MAX_BY_TYPE = {
  auto: 20,
  flashcards: 30,
  memory_match: 12,
  drag_drop: 15,
  crossword: 20,
  word_search: 12,
  quiz_show: 30,
  jeopardy: 25,
  spin_wheel: 12,
  millionaire: 15,
  escape_room: 10,
  mission_adventure: 15,
  puzzle_challenge: 20,
};

export const GAME_ITEM_PLATFORM_MAX = 50;

export function getMaxItemsForGameType(gameType) {
  const type = String(gameType || "auto");
  const typeMax = GAME_ITEM_MAX_BY_TYPE[type] ?? GAME_ITEM_MAX_BY_TYPE.auto;
  return Math.min(typeMax, GAME_ITEM_PLATFORM_MAX);
}

export function getMinItemsForGameType(gameType) {
  return String(gameType || "") === "memory_match" ? 2 : 1;
}

export function clampGameItemCountInput(value, gameType) {
  const min = getMinItemsForGameType(gameType);
  const max = getMaxItemsForGameType(gameType);
  if (value === "" || value === null || value === undefined) return value;
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}
