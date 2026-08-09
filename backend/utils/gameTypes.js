export const GAME_TYPES = [
  'flashcards',
  'memory_match',
  'crossword',
  'word_search',
  'quiz_show',
  'jeopardy',
  'drag_drop',
  'spin_wheel',
  'millionaire',
  'escape_room',
  'mission_adventure',
  'puzzle_challenge',
];

export const LEGACY_GAME_TYPES = [
  'quiz_rush',
  'word_scramble',
];

/** Deprecated: kept in DB ENUM only. Not creatable / not AI-generated / not playable. */
export const DEPRECATED_GAME_TYPES = [
  'true_false_blitz',
];

export const ALL_GAME_TYPES = [...GAME_TYPES, ...LEGACY_GAME_TYPES];
export const KNOWN_GAME_TYPES = [...ALL_GAME_TYPES, ...DEPRECATED_GAME_TYPES];

const DISPLAY_TO_SLUG = {
  flashcards: 'flashcards',
  'flash cards': 'flashcards',
  'memory match': 'memory_match',
  memory_match: 'memory_match',
  crossword: 'crossword',
  'word search': 'word_search',
  word_search: 'word_search',
  'quiz show': 'quiz_show',
  quiz_show: 'quiz_show',
  quiz_rush: 'quiz_show',
  jeopardy: 'jeopardy',
  'drag and drop': 'drag_drop',
  'drag and drop matching': 'drag_drop',
  drag_drop: 'drag_drop',
  'spin the wheel': 'spin_wheel',
  'spin the wheel quiz': 'spin_wheel',
  'spin wheel': 'spin_wheel',
  spin_wheel: 'spin_wheel',
  millionaire: 'millionaire',
  'who wants to be a millionaire': 'millionaire',
  escape_room: 'escape_room',
  'escape room': 'escape_room',
  mission_adventure: 'mission_adventure',
  'mission adventure': 'mission_adventure',
  puzzle_challenge: 'puzzle_challenge',
  'puzzle challenge': 'puzzle_challenge',
  word_scramble: 'word_search',
};

export function normalizeGameType(value) {
  if (!value) return null;
  const underscored = String(value).trim().toLowerCase().replace(/\s+/g, '_');
  if (DEPRECATED_GAME_TYPES.includes(underscored)) {
    return null;
  }
  const key = String(value).trim().toLowerCase().replace(/[_-]+/g, ' ');
  const slug = DISPLAY_TO_SLUG[key] || DISPLAY_TO_SLUG[key.replace(/\s+/g, '_')] || null;
  if (slug && GAME_TYPES.includes(slug)) return slug;
  if (ALL_GAME_TYPES.includes(underscored)) {
    return DISPLAY_TO_SLUG[underscored] || underscored;
  }
  return null;
}

export function isValidGameType(value) {
  return ALL_GAME_TYPES.includes(value) || Boolean(normalizeGameType(value));
}

export function isDeprecatedGameType(value) {
  const underscored = String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
  return DEPRECATED_GAME_TYPES.includes(underscored);
}
