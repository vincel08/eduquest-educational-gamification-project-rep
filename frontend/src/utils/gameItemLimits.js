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
  word_scramble: 12,
  quiz_show: 30,
  quiz_rush: 30,
  jeopardy: 25,
  spin_wheel: 12,
  millionaire: 15,
  escape_room: 10,
  mission_adventure: 15,
  puzzle_challenge: 20,
};

export const GAME_ITEM_PLATFORM_MAX = 50;

const GAME_TYPE_ALIASES = {
  quiz_rush: "quiz_show",
  word_scramble: "word_search",
};

function normalizeTypeKey(gameType) {
  const raw = String(gameType || "auto")
    .trim()
    .toLowerCase();
  return GAME_TYPE_ALIASES[raw] || raw || "auto";
}

export function getMaxItemsForGameType(gameType) {
  const type = normalizeTypeKey(gameType);
  const typeMax = GAME_ITEM_MAX_BY_TYPE[type] ?? GAME_ITEM_MAX_BY_TYPE.auto;
  return Math.min(typeMax, GAME_ITEM_PLATFORM_MAX);
}

export function getMinItemsForGameType(gameType) {
  return normalizeTypeKey(gameType) === "memory_match" ? 2 : 1;
}

function firstNonEmptyLength(...lists) {
  for (const list of lists) {
    if (Array.isArray(list) && list.length) return list.length;
  }
  return 0;
}

/**
 * Count playable items currently in a game draft.
 * Order matches backend normalizeGame / getGameItemCollection preferences.
 */
export function countGameItems(game) {
  if (!game) return 0;
  const type = normalizeTypeKey(game.gameType || game.game_type);
  const data = game.gameData || game.game_data || {};

  if (type === "escape_room") {
    return Array.isArray(data.stages) ? data.stages.length : 0;
  }
  if (type === "mission_adventure") {
    return Array.isArray(data.missions) ? data.missions.length : 0;
  }
  if (type === "jeopardy") {
    return (Array.isArray(data.categories) ? data.categories : []).reduce(
      (sum, category) =>
        sum + (Array.isArray(category?.clues) ? category.clues.length : 0),
      0,
    );
  }
  if (type === "word_search") {
    return firstNonEmptyLength(data.words, data.items);
  }
  if (["quiz_show", "spin_wheel", "millionaire"].includes(type)) {
    return firstNonEmptyLength(data.rounds, data.items);
  }
  if (["flashcards", "memory_match", "drag_drop"].includes(type)) {
    return firstNonEmptyLength(data.pairs, data.items);
  }
  if (["crossword", "puzzle_challenge"].includes(type)) {
    return firstNonEmptyLength(data.clues, data.items);
  }
  return firstNonEmptyLength(
    data.items,
    data.pairs,
    data.clues,
    data.rounds,
    data.words,
  );
}

export function clampGameItemCountInput(value, gameType) {
  const min = getMinItemsForGameType(gameType);
  const max = getMaxItemsForGameType(gameType);
  if (value === "" || value === null || value === undefined) return value;
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}
