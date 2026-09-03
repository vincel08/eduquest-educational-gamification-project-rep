import env from '../config/env.js';
import { normalizeGameType } from './gameTypes.js';

/**
 * Practical playable ceilings per game type (UI + AI generation).
 * Global env.aiLimits.maxGameItems remains the hard platform cap.
 */
export const GAME_ITEM_MAX_BY_TYPE = {
  auto: 20,
  flashcards: 30,
  memory_match: 12, // 12 pairs → 24 cards
  drag_drop: 15,
  crossword: 20,
  word_search: 12, // grid size 8–12
  word_scramble: 12,
  quiz_show: 30,
  quiz_rush: 30,
  jeopardy: 25, // total clues
  spin_wheel: 12, // readable wheel segments
  millionaire: 15,
  escape_room: 10, // stages
  mission_adventure: 15,
  puzzle_challenge: 20,
};

export function getMaxItemsForGameType(gameType) {
  const type = normalizeGameType(gameType) || gameType || 'auto';
  const typeMax = GAME_ITEM_MAX_BY_TYPE[type] ?? GAME_ITEM_MAX_BY_TYPE.auto;
  const platformMax = Number(env.aiLimits.maxGameItems) || 50;
  return Math.min(typeMax, platformMax);
}

export function getMinItemsForGameType(gameType) {
  const type = normalizeGameType(gameType) || gameType || 'auto';
  // Memory match needs two pairs to play.
  if (type === 'memory_match') return Math.max(2, env.aiLimits.minGameItems || 1);
  return Math.max(1, env.aiLimits.minGameItems || 1);
}
