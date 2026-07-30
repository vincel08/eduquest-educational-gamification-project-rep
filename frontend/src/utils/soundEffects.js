/**
 * Optional sound-effects facade.
 * Sounds are OFF by default and never autoplay.
 * Swap play() implementations later with real Audio assets.
 */

const STORAGE_KEY = 'eduquest_sounds_enabled';

const SOUND_KEYS = {
  click: 'click',
  xpGain: 'xpGain',
  badgeUnlocked: 'badgeUnlocked',
  levelUp: 'levelUp',
  quizComplete: 'quizComplete',
  gameComplete: 'gameComplete',
};

function isEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSoundsEnabled(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // ignore storage errors
  }
}

export function getSoundsEnabled() {
  return isEnabled();
}

export function playSound(key) {
  if (!isEnabled()) return;
  // Placeholder: wire real audio files here when assets are available.
  // Example:
  // const audio = new Audio(`/sounds/${key}.mp3`);
  // audio.volume = 0.35;
  // audio.play().catch(() => {});
  void key;
}

export { SOUND_KEYS };
