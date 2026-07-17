const XP_PER_LEVEL = 100;

export function calculateLevel(xp) {
  return Math.max(1, Math.floor(Number(xp) / XP_PER_LEVEL) + 1);
}

export function xpForNextLevel(xp) {
  const level = calculateLevel(xp);
  return level * XP_PER_LEVEL;
}

export function xpProgressInLevel(xp) {
  const currentXp = Number(xp) || 0;
  return currentXp % XP_PER_LEVEL;
}

export { XP_PER_LEVEL };
