/**
 * Game sound effects + optional ambient beds via Web Audio API.
 * No binary assets required. Respects mute preference in localStorage.
 */

const STORAGE_KEY = 'eduquest_sounds_enabled';
const MUSIC_KEY = 'eduquest_music_enabled';

export const SOUND_KEYS = {
  click: 'click',
  correct: 'correct',
  wrong: 'wrong',
  xpGain: 'xpGain',
  badgeUnlocked: 'badgeUnlocked',
  levelUp: 'levelUp',
  quizComplete: 'quizComplete',
  gameComplete: 'gameComplete',
  timerTick: 'timerTick',
  timerUrgent: 'timerUrgent',
  timeout: 'timeout',
  flip: 'flip',
  match: 'match',
  spin: 'spin',
  unlock: 'unlock',
  wordFound: 'wordFound',
  missionStart: 'missionStart',
  energyDown: 'energyDown',
  ladderSafe: 'ladderSafe',
  fail: 'fail',
};

const AMBIENT_BY_TYPE = {
  quiz_show: 'quiz',
  quiz_rush: 'quiz',
  millionaire: 'quiz',
  jeopardy: 'quiz',
  spin_wheel: 'quiz',
  mission_adventure: 'adventure',
  escape_room: 'adventure',
  crossword: 'puzzle',
  word_search: 'puzzle',
  word_scramble: 'puzzle',
  memory_match: 'puzzle',
  puzzle_challenge: 'puzzle',
  drag_drop: 'puzzle',
  flashcards: 'calm',
};

let audioCtx = null;
let ambientNodes = null;
let ambientMood = null;

function readFlag(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return defaultValue;
    return raw === 'true';
  } catch {
    return defaultValue;
  }
}

function writeFlag(key, enabled) {
  try {
    localStorage.setItem(key, enabled ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export function getSoundsEnabled() {
  return readFlag(STORAGE_KEY, true);
}

export function setSoundsEnabled(enabled) {
  writeFlag(STORAGE_KEY, enabled);
  if (!enabled) stopAmbient();
}

export function getMusicEnabled() {
  return readFlag(MUSIC_KEY, false);
}

export function setMusicEnabled(enabled) {
  writeFlag(MUSIC_KEY, enabled);
  if (!enabled) stopAmbient();
}

function getContext() {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/** Call from a user gesture so browsers allow audio. */
export function unlockAudio() {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

function tone(ctx, {
  frequency = 440,
  duration = 0.12,
  type = 'sine',
  volume = 0.08,
  when = 0,
  slideTo = null,
}) {
  const start = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  if (slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), start + duration);
  }
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function chord(ctx, freqs, { duration = 0.28, volume = 0.05, type = 'triangle' } = {}) {
  freqs.forEach((frequency, i) => {
    tone(ctx, {
      frequency,
      duration,
      type,
      volume: volume * (1 - i * 0.12),
      when: i * 0.03,
    });
  });
}

function playToneSequence(key) {
  const ctx = getContext();
  if (!ctx) return;

  switch (key) {
    case SOUND_KEYS.click:
      tone(ctx, { frequency: 720, duration: 0.05, type: 'square', volume: 0.03 });
      break;
    case SOUND_KEYS.correct:
    case SOUND_KEYS.match:
    case SOUND_KEYS.wordFound:
    case SOUND_KEYS.ladderSafe:
      chord(ctx, [523.25, 659.25, 783.99], { duration: 0.22, volume: 0.055 });
      break;
    case SOUND_KEYS.wrong:
    case SOUND_KEYS.energyDown:
      tone(ctx, {
        frequency: 220,
        duration: 0.22,
        type: 'sawtooth',
        volume: 0.045,
        slideTo: 110,
      });
      break;
    case SOUND_KEYS.fail:
      tone(ctx, { frequency: 180, duration: 0.18, type: 'triangle', volume: 0.05 });
      tone(ctx, { frequency: 140, duration: 0.28, type: 'triangle', volume: 0.045, when: 0.14 });
      break;
    case SOUND_KEYS.xpGain:
      tone(ctx, { frequency: 660, duration: 0.08, type: 'sine', volume: 0.05 });
      tone(ctx, { frequency: 880, duration: 0.12, type: 'sine', volume: 0.05, when: 0.07 });
      break;
    case SOUND_KEYS.badgeUnlocked:
    case SOUND_KEYS.levelUp:
      chord(ctx, [392, 523.25, 659.25, 784], { duration: 0.35, volume: 0.05 });
      break;
    case SOUND_KEYS.quizComplete:
    case SOUND_KEYS.gameComplete:
      chord(ctx, [523.25, 659.25, 783.99, 1046.5], { duration: 0.4, volume: 0.055 });
      break;
    case SOUND_KEYS.timerTick:
      tone(ctx, { frequency: 880, duration: 0.04, type: 'square', volume: 0.025 });
      break;
    case SOUND_KEYS.timerUrgent:
      tone(ctx, { frequency: 990, duration: 0.06, type: 'square', volume: 0.04 });
      break;
    case SOUND_KEYS.timeout:
      tone(ctx, { frequency: 300, duration: 0.15, type: 'triangle', volume: 0.05, slideTo: 160 });
      break;
    case SOUND_KEYS.flip:
      tone(ctx, { frequency: 480, duration: 0.06, type: 'triangle', volume: 0.035, slideTo: 620 });
      break;
    case SOUND_KEYS.spin:
      tone(ctx, { frequency: 300, duration: 0.5, type: 'sawtooth', volume: 0.03, slideTo: 900 });
      tone(ctx, { frequency: 900, duration: 0.45, type: 'triangle', volume: 0.025, when: 0.4, slideTo: 400 });
      break;
    case SOUND_KEYS.unlock:
      chord(ctx, [440, 554.37, 659.25], { duration: 0.32, volume: 0.05, type: 'sine' });
      break;
    case SOUND_KEYS.missionStart:
      chord(ctx, [349.23, 440, 523.25], { duration: 0.35, volume: 0.05 });
      break;
    default:
      tone(ctx, { frequency: 500, duration: 0.08, type: 'sine', volume: 0.03 });
  }
}

export function playSound(key) {
  if (!getSoundsEnabled() || !key) return;
  try {
    playToneSequence(key);
  } catch {
    // Audio failures must never break gameplay.
  }
}

export function ambientMoodForGameType(gameType) {
  return AMBIENT_BY_TYPE[String(gameType || '')] || null;
}

export function stopAmbient() {
  if (!ambientNodes) {
    ambientMood = null;
    return;
  }
  try {
    const { gain, oscA, oscB, lfo } = ambientNodes;
    const ctx = audioCtx;
    if (ctx && gain) {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    }
    window.setTimeout(() => {
      try {
        oscA?.stop();
        oscB?.stop();
        lfo?.stop();
      } catch {
        // already stopped
      }
    }, 400);
  } catch {
    // ignore
  }
  ambientNodes = null;
  ambientMood = null;
}

/**
 * Soft looping pad. Only plays when SFX and Music toggles are both on.
 */
export function startAmbient(mood) {
  if (!mood || !getSoundsEnabled() || !getMusicEnabled()) {
    stopAmbient();
    return;
  }
  if (ambientMood === mood && ambientNodes) return;

  stopAmbient();
  const ctx = getContext();
  if (!ctx) return;

  const profiles = {
    quiz: { a: 110, b: 164.81, vol: 0.018 },
    adventure: { a: 98, b: 146.83, vol: 0.02 },
    puzzle: { a: 130.81, b: 196, vol: 0.016 },
    calm: { a: 123.47, b: 185, vol: 0.014 },
  };
  const profile = profiles[mood] || profiles.calm;

  try {
    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscA.type = 'sine';
    oscB.type = 'sine';
    oscA.frequency.value = profile.a;
    oscB.frequency.value = profile.b;
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 0.006;
    gain.gain.value = 0.0001;

    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(profile.vol, now + 1.2);

    oscA.start();
    oscB.start();
    lfo.start();

    ambientNodes = { oscA, oscB, lfo, gain };
    ambientMood = mood;
  } catch {
    ambientNodes = null;
    ambientMood = null;
  }
}

export function syncAmbientForGame(gameType) {
  const mood = ambientMoodForGameType(gameType);
  if (!mood) {
    stopAmbient();
    return;
  }
  startAmbient(mood);
}
