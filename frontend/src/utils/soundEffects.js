/**
 * Game sound effects + optional ambient beds via Web Audio API.
 * No binary assets required. Respects mute preference in localStorage.
 */

const STORAGE_KEY = 'eduwow_sounds_enabled';
const MUSIC_KEY = 'eduwow_music_enabled';

/** Global loudness multipliers (Web Audio peaks stay under ~0.25 to avoid harsh clipping). */
const SFX_GAIN = 2.4;
const MUSIC_GAIN = 2.8;
/** Soft sine pad layer — warm presence without a buzzing drone. */
const SOFT_PAD_GAIN = 0.007;

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
  missionChoice: 'missionChoice',
  missionVictory: 'missionVictory',
  missionError: 'missionError',
  missionUnlock: 'missionUnlock',
  missionComplete: 'missionComplete',
  millionaireVictory: 'millionaireVictory',
  millionaireFail: 'millionaireFail',
  dragPickup: 'dragPickup',
  dragMatch: 'dragMatch',
  dragMiss: 'dragMiss',
  dragComplete: 'dragComplete',
  energyDown: 'energyDown',
  ladderSafe: 'ladderSafe',
  fail: 'fail',
  jeopardyIntro: 'jeopardyIntro',
  jeopardyClue: 'jeopardyClue',
  jeopardyCorrect: 'jeopardyCorrect',
  jeopardyWrong: 'jeopardyWrong',
  jeopardyComplete: 'jeopardyComplete',
  quizShowIntro: 'quizShowIntro',
  quizShowReveal: 'quizShowReveal',
  quizShowCorrect: 'quizShowCorrect',
  quizShowWrong: 'quizShowWrong',
  quizShowRound: 'quizShowRound',
  quizShowComplete: 'quizShowComplete',
};

/** Ambient track ids driven by Mission Adventure game moments. */
export const MISSION_MUSIC = {
  select: 'mission_select',
  reading: 'mission_reading',
  choice: 'mission_choice',
  final: 'mission_final',
};

/** Progressive Millionaire beds — Suspenseful Game Show. */
export const MILLIONAIRE_MUSIC = {
  calm: 'millionaire_calm',
  early: 'millionaire_early',
  mid: 'millionaire_mid',
  late: 'millionaire_late',
  final: 'millionaire_final',
};

/**
 * Jeopardy — Classic Game Show / Modern Trivia Challenge.
 * Board (category selection) → question bed → rising thinking tension.
 */
export const JEOPARDY_MUSIC = {
  board: 'jeopardy_board',
  question: 'jeopardy_question',
  thinking: 'jeopardy_thinking',
  thinkingHot: 'jeopardy_thinking_hot',
};

/**
 * Quiz Show — Modern Game Show.
 * Upbeat electronic answering bed → subtle tension in the last seconds.
 */
export const QUIZ_SHOW_MUSIC = {
  play: 'quiz_show_play',
  tension: 'quiz_show_tension',
};

/** Unique bed per game so each play session feels distinct. */
/**
 * Per-game music personality (ambient bed ids).
 * Quiz Show → Energetic game show
 * Jeopardy → Smart + competitive
 * Millionaire → Dramatic + suspenseful
 * Mission Adventure → Cinematic adventure
 * Puzzle Challenge → Playful + mysterious
 * Drag & Drop → Light arcade
 * Memory Match → Cute + playful
 * Word Search → Calm + curious
 * Crossword → Relaxed + intellectual
 * Spin Wheel → Exciting + unpredictable
 */
const AMBIENT_BY_TYPE = {
  quiz_show: 'quiz_show_play',
  quiz_rush: 'quiz_rush',
  millionaire: 'millionaire_calm',
  jeopardy: 'jeopardy_board',
  spin_wheel: 'spin_wheel_exciting',
  mission_adventure: 'mission_select',
  escape_room: 'mystery_puzzle_adventure',
  crossword: 'crossword_intellectual',
  word_search: 'word_search_curious',
  word_scramble: 'puzzle_playful_mystery',
  memory_match: 'memory_cute_playful',
  puzzle_challenge: 'puzzle_playful_mystery',
  drag_drop: 'drag_drop_arcade',
  flashcards: 'flashcards',
};

let audioCtx = null;
let ambientNodes = null;
let ambientMood = null;
/** Bumped on every stop so delayed syncs / intervals cannot restart a bed after leave. */
let ambientGeneration = 0;
let ambientFadeTimerId = null;

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
  return readFlag(MUSIC_KEY, true);
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
  const level = Math.min(0.28, volume * SFX_GAIN);
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  if (slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), start + duration);
  }
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(level, start + 0.015);
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
      chord(ctx, [349.23, 440, 523.25, 659.25], { duration: 0.4, volume: 0.055 });
      break;
    case SOUND_KEYS.missionChoice:
      // Suspense sting while a choice resolves
      tone(ctx, { frequency: 392, duration: 0.12, type: 'triangle', volume: 0.05 });
      tone(ctx, { frequency: 466.16, duration: 0.18, type: 'triangle', volume: 0.045, when: 0.1 });
      tone(ctx, { frequency: 349.23, duration: 0.22, type: 'sine', volume: 0.04, when: 0.2 });
      break;
    case SOUND_KEYS.missionVictory:
      // Short playful victory
      chord(ctx, [523.25, 659.25, 783.99], { duration: 0.2, volume: 0.06 });
      tone(ctx, { frequency: 1046.5, duration: 0.16, type: 'sine', volume: 0.045, when: 0.16 });
      break;
    case SOUND_KEYS.missionError:
      // Soft error — not punishing
      tone(ctx, { frequency: 246.94, duration: 0.14, type: 'sine', volume: 0.04, slideTo: 196 });
      tone(ctx, { frequency: 185, duration: 0.16, type: 'triangle', volume: 0.03, when: 0.1 });
      break;
    case SOUND_KEYS.missionUnlock:
      // Triumphant “new path unlocked”
      chord(ctx, [392, 523.25, 659.25], { duration: 0.28, volume: 0.055 });
      chord(ctx, [523.25, 659.25, 783.99, 987.77], { duration: 0.35, volume: 0.05 });
      break;
    case SOUND_KEYS.missionComplete:
      // Celebration fanfare
      chord(ctx, [392, 493.88, 587.33], { duration: 0.25, volume: 0.055 });
      chord(ctx, [523.25, 659.25, 783.99], { duration: 0.3, volume: 0.06 });
      tone(ctx, { frequency: 1046.5, duration: 0.28, type: 'sine', volume: 0.05, when: 0.28 });
      tone(ctx, { frequency: 1318.5, duration: 0.35, type: 'triangle', volume: 0.04, when: 0.42 });
      break;
    case SOUND_KEYS.millionaireVictory:
      // Short TV-quiz victory sting
      chord(ctx, [523.25, 659.25, 783.99], { duration: 0.18, volume: 0.06 });
      tone(ctx, { frequency: 1046.5, duration: 0.2, type: 'square', volume: 0.035, when: 0.14 });
      tone(ctx, { frequency: 1318.5, duration: 0.22, type: 'sine', volume: 0.04, when: 0.26 });
      break;
    case SOUND_KEYS.millionaireFail:
      // Short dramatic fail
      tone(ctx, { frequency: 220, duration: 0.2, type: 'sawtooth', volume: 0.05, slideTo: 110 });
      tone(ctx, { frequency: 164.81, duration: 0.35, type: 'triangle', volume: 0.045, when: 0.12 });
      tone(ctx, { frequency: 98, duration: 0.4, type: 'sine', volume: 0.04, when: 0.28 });
      break;
    case SOUND_KEYS.dragPickup:
      tone(ctx, { frequency: 660, duration: 0.05, type: 'sine', volume: 0.035 });
      tone(ctx, { frequency: 880, duration: 0.06, type: 'triangle', volume: 0.03, when: 0.03 });
      break;
    case SOUND_KEYS.dragMatch:
      // Cheerful ding
      tone(ctx, { frequency: 880, duration: 0.08, type: 'sine', volume: 0.05 });
      tone(ctx, { frequency: 1174.7, duration: 0.14, type: 'sine', volume: 0.045, when: 0.06 });
      break;
    case SOUND_KEYS.dragMiss:
      tone(ctx, { frequency: 233, duration: 0.1, type: 'triangle', volume: 0.035, slideTo: 196 });
      break;
    case SOUND_KEYS.dragComplete:
      chord(ctx, [523.25, 659.25, 783.99], { duration: 0.22, volume: 0.055 });
      tone(ctx, { frequency: 1046.5, duration: 0.2, type: 'sine', volume: 0.04, when: 0.18 });
      tone(ctx, { frequency: 1318.5, duration: 0.22, type: 'triangle', volume: 0.035, when: 0.3 });
      break;
    case SOUND_KEYS.jeopardyIntro:
      // Short upbeat category-board sting (brass/synth)
      chord(ctx, [392, 493.88, 587.33], { duration: 0.16, volume: 0.05, type: 'triangle' });
      chord(ctx, [523.25, 659.25, 783.99], { duration: 0.22, volume: 0.055, type: 'square' });
      tone(ctx, { frequency: 1046.5, duration: 0.14, type: 'sine', volume: 0.04, when: 0.2 });
      break;
    case SOUND_KEYS.jeopardyClue:
      // Quick clue-select transition
      tone(ctx, { frequency: 523.25, duration: 0.06, type: 'square', volume: 0.035, slideTo: 784 });
      tone(ctx, { frequency: 659.25, duration: 0.08, type: 'triangle', volume: 0.03, when: 0.05 });
      break;
    case SOUND_KEYS.jeopardyCorrect:
      // Bright victory chime
      tone(ctx, { frequency: 880, duration: 0.08, type: 'sine', volume: 0.055 });
      tone(ctx, { frequency: 1174.7, duration: 0.12, type: 'sine', volume: 0.05, when: 0.06 });
      chord(ctx, [659.25, 830.61, 1046.5], { duration: 0.28, volume: 0.05, type: 'triangle' });
      break;
    case SOUND_KEYS.jeopardyWrong:
      // Short soft buzzer — not harsh
      tone(ctx, { frequency: 185, duration: 0.16, type: 'sawtooth', volume: 0.035, slideTo: 140 });
      tone(ctx, { frequency: 155, duration: 0.12, type: 'triangle', volume: 0.028, when: 0.1 });
      break;
    case SOUND_KEYS.jeopardyComplete:
      // Short celebratory game-show theme
      chord(ctx, [392, 523.25, 659.25], { duration: 0.2, volume: 0.055, type: 'triangle' });
      chord(ctx, [523.25, 659.25, 783.99], { duration: 0.24, volume: 0.06, type: 'square' });
      tone(ctx, { frequency: 1046.5, duration: 0.18, type: 'sine', volume: 0.045, when: 0.22 });
      tone(ctx, { frequency: 1318.5, duration: 0.28, type: 'triangle', volume: 0.04, when: 0.36 });
      chord(ctx, [659.25, 830.61, 1046.5, 1318.5], { duration: 0.4, volume: 0.045, type: 'sine' });
      break;
    case SOUND_KEYS.quizShowIntro:
      // Energetic modern game-show intro
      chord(ctx, [392, 493.88, 587.33], { duration: 0.14, volume: 0.05, type: 'square' });
      chord(ctx, [523.25, 659.25, 783.99], { duration: 0.2, volume: 0.055, type: 'triangle' });
      tone(ctx, { frequency: 988, duration: 0.1, type: 'square', volume: 0.035, when: 0.16 });
      tone(ctx, { frequency: 1174.7, duration: 0.18, type: 'sine', volume: 0.045, when: 0.24 });
      break;
    case SOUND_KEYS.quizShowReveal:
      // Short question reveal
      tone(ctx, { frequency: 660, duration: 0.05, type: 'square', volume: 0.035, slideTo: 880 });
      tone(ctx, { frequency: 990, duration: 0.1, type: 'triangle', volume: 0.04, when: 0.05 });
      break;
    case SOUND_KEYS.quizShowCorrect:
      // Bright positive chime
      tone(ctx, { frequency: 784, duration: 0.07, type: 'sine', volume: 0.055 });
      tone(ctx, { frequency: 988, duration: 0.1, type: 'sine', volume: 0.05, when: 0.05 });
      tone(ctx, { frequency: 1318.5, duration: 0.18, type: 'triangle', volume: 0.045, when: 0.12 });
      break;
    case SOUND_KEYS.quizShowWrong:
      // Short buzzer
      tone(ctx, { frequency: 196, duration: 0.14, type: 'sawtooth', volume: 0.04, slideTo: 147 });
      tone(ctx, { frequency: 165, duration: 0.1, type: 'square', volume: 0.025, when: 0.08 });
      break;
    case SOUND_KEYS.quizShowRound:
      // Energetic round-complete victory sting
      chord(ctx, [523.25, 659.25, 783.99], { duration: 0.16, volume: 0.055, type: 'square' });
      tone(ctx, { frequency: 1046.5, duration: 0.14, type: 'sine', volume: 0.045, when: 0.12 });
      tone(ctx, { frequency: 1318.5, duration: 0.16, type: 'triangle', volume: 0.04, when: 0.22 });
      break;
    case SOUND_KEYS.quizShowComplete:
      // Short celebration theme
      chord(ctx, [392, 523.25, 659.25], { duration: 0.18, volume: 0.055, type: 'triangle' });
      chord(ctx, [523.25, 659.25, 783.99], { duration: 0.22, volume: 0.06, type: 'square' });
      tone(ctx, { frequency: 1046.5, duration: 0.16, type: 'sine', volume: 0.05, when: 0.2 });
      tone(ctx, { frequency: 1318.5, duration: 0.22, type: 'triangle', volume: 0.04, when: 0.32 });
      chord(ctx, [659.25, 830.61, 1046.5], { duration: 0.35, volume: 0.045, type: 'sine' });
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

function midiToHz(midi) {
  return 440 * (2 ** ((midi - 69) / 12));
}

function scheduleNote(ctx, destination, {
  midi,
  when,
  duration = 0.2,
  type = 'triangle',
  volume = 0.04,
  filterFreq = 1800,
}) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = type;
  osc.frequency.value = midiToHz(midi);
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const start = when;
  const end = when + duration;
  const level = Math.min(0.22, volume * MUSIC_GAIN);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(level, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, Math.max(start + 0.03, end));
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  osc.start(start);
  osc.stop(end + 0.05);
  return osc;
}

/**
 * Soft breathing pad layer — warm sine presence that swells gently
 * instead of a constant buzzing drone.
 */
function attachSoftBreathingPads(ctx, bus, track, stopList, now) {
  const pad = track.pad || [];
  if (!pad.length) return;

  const padBus = ctx.createGain();
  // Intrinsic soft level; LFO adds a gentle swell on top
  padBus.gain.value = SOFT_PAD_GAIN;
  padBus.connect(bus);

  const breath = ctx.createOscillator();
  const breathDepth = ctx.createGain();
  breath.type = 'sine';
  breath.frequency.value = track.style === 'cute' || track.style === 'arcade' ? 0.18 : 0.12;
  breathDepth.gain.value = SOFT_PAD_GAIN * 0.4;
  breath.connect(breathDepth);
  breathDepth.connect(padBus.gain);
  breath.start(now);
  stopList.push(breath);

  pad.slice(0, 3).forEach((midi, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    // Always soft sine — never sawtooth/square for pads
    osc.type = 'sine';
    osc.frequency.value = midiToHz(midi);
    // Tiny detune for width without harshness
    osc.detune.value = i === 1 ? 6 : (i === 2 ? -5 : 0);
    f.type = 'lowpass';
    f.frequency.value = Math.min(1400, (track.filter || 1200) * 0.75);
    g.gain.value = 1 / (i + 1.2);
    osc.connect(f);
    f.connect(g);
    g.connect(padBus);
    osc.start(now);
    stopList.push(osc);
  });
}

/**
 * Soft engaging bloom — short warm chord that rises and fades (replaces drone "ugong").
 */
function scheduleSoftBloom(ctx, destination, midis, when, beatSec) {
  const notes = (midis || []).slice(0, 3);
  if (!notes.length) return;
  notes.forEach((midi, i) => {
    scheduleNote(ctx, destination, {
      midi,
      when: when + i * 0.04,
      duration: beatSec * 1.4,
      type: 'sine',
      volume: 0.012 / (i + 1),
      filterFreq: 1100,
    });
  });
}

/**
 * Lead melody — phrased tune with rests (0/null), held notes, and soft harmony.
 * This is what makes beds feel musical instead of monotonous arps.
 */
function scheduleLeadMelody(ctx, destination, track, step, when, beatSec) {
  const melody = track.melody;
  if (!melody?.length) return false;

  const midi = melody[step % melody.length];
  if (midi == null || midi === 0) return true; // intentional rest

  const next = melody[(step + 1) % melody.length];
  const held = next == null || next === 0 || next === midi;
  const downbeat = step % 4 === 0;
  const softStyle = track.style === 'curious' || track.style === 'mystery';
  const vol = softStyle ? 0.024 : 0.028;

  scheduleNote(ctx, destination, {
    midi,
    when: when + beatSec * 0.03,
    duration: held ? beatSec * 1.2 : beatSec * 0.58,
    type: 'triangle',
    volume: downbeat ? vol : vol * 0.88,
    filterFreq: Math.min(2600, (track.filter || 1400) + 400),
  });

  // Soft harmony on phrase starts
  if (step % 8 === 0) {
    scheduleNote(ctx, destination, {
      midi: midi + 4,
      when: when + beatSec * 0.08,
      duration: beatSec * 0.75,
      type: 'sine',
      volume: vol * 0.4,
      filterFreq: 1700,
    });
  }

  // Light answering echo later in the bar
  if (step % 8 === 4 && !held) {
    scheduleNote(ctx, destination, {
      midi: midi - 5,
      when: when + beatSec * 0.45,
      duration: beatSec * 0.35,
      type: 'sine',
      volume: vol * 0.35,
      filterFreq: 1500,
    });
  }

  return true;
}

/** Track recipes: tempo + looping patterns in MIDI note numbers. */
const AMBIENT_TRACKS = {
  /**
   * Quiz Show — Modern Game Show answering bed.
   * Upbeat electronic beat, bright melody, medium-fast tempo.
   */
  quiz_show_play: {
    style: 'arcade',
    bpm: 116,
    vol: 0.04,
    pad: [60, 64, 67, 72],
    bass: [48, 48, 55, 48, 52, 48],
    arp: [72, 76, 79, 84, 79, 76, 72, 67],
    // Bright game-show hook with rests
    melody: [72, 76, 79, 81, 79, 76, 72, 0, 74, 77, 81, 84, 81, 77, 74, 0],
    sparkle: [96, 91, 88, 84, 91],
    tick: true,
    padType: 'triangle',
    arpType: 'square',
    filter: 1900,
  },
  /** Quiz Show — last-few-seconds tension (still exciting, not scary). */
  quiz_show_tension: {
    style: 'gameShow',
    bpm: 124,
    vol: 0.044,
    pad: [57, 64, 69],
    bass: [45, 45, 52, 45, 48, 45],
    arp: [69, 73, 76, 81, 76, 73, 69, 64],
    melody: [69, 73, 76, 81, 76, 73, 69, 0, 71, 74, 79, 83, 79, 74, 71, 0],
    sparkle: [88, 93, 88],
    tick: true,
    heartbeat: true,
    intensity: 3,
    padType: 'triangle',
    arpType: 'square',
    filter: 1600,
  },
  quiz_rush: {
    bpm: 128,
    vol: 0.042,
    pad: [60, 67, 72],
    bass: [48, 48, 55, 48],
    arp: [72, 76, 79, 84, 79, 76, 72, 67],
    melody: [72, 76, 79, 84, 79, 76, 72, 0, 76, 79, 84, 88, 84, 79, 76, 0],
    tick: true,
    padType: 'sawtooth',
    arpType: 'square',
    filter: 1600,
  },
  /** Millionaire — calm / subtle open. */
  millionaire_calm: {
    style: 'gameShow',
    bpm: 78,
    vol: 0.034,
    pad: [50, 57, 62],
    bass: [38, 38, 45, 38],
    arp: [62, 66, 69, 66],
    melody: [62, 66, 69, 0, 66, 69, 74, 0, 69, 66, 62, 57, 62, 0, 0, 0],
    tick: true,
    intensity: 1,
    padType: 'sine',
    arpType: 'sine',
    filter: 850,
  },
  /** Millionaire — light game-show (early questions). */
  millionaire_early: {
    style: 'gameShow',
    bpm: 96,
    vol: 0.04,
    pad: [55, 62, 67],
    bass: [43, 43, 50, 43],
    arp: [67, 71, 74, 79, 74, 71],
    melody: [67, 71, 74, 79, 74, 71, 67, 0, 69, 72, 76, 81, 76, 72, 69, 0],
    tick: true,
    intensity: 2,
    padType: 'triangle',
    arpType: 'square',
    filter: 1300,
  },
  /** Millionaire — rising tension (mid ladder). */
  millionaire_mid: {
    style: 'gameShow',
    bpm: 104,
    vol: 0.044,
    pad: [52, 59, 64],
    bass: [40, 40, 47, 40, 42, 40],
    arp: [64, 68, 71, 76, 71, 68, 64],
    melody: [64, 68, 71, 76, 71, 68, 64, 0, 66, 69, 74, 78, 74, 69, 66, 0],
    tick: true,
    heartbeat: true,
    intensity: 3,
    padType: 'triangle',
    arpType: 'triangle',
    filter: 1100,
  },
  /** Millionaire — dramatic late questions. */
  millionaire_late: {
    style: 'gameShow',
    bpm: 112,
    vol: 0.048,
    pad: [49, 56, 61, 68],
    bass: [37, 37, 44, 37, 49, 37],
    arp: [61, 65, 68, 73, 68, 65, 61, 56],
    melody: [61, 65, 68, 73, 68, 65, 61, 0, 63, 68, 71, 76, 71, 68, 63, 0],
    tick: true,
    heartbeat: true,
    intensity: 4,
    padType: 'sawtooth',
    arpType: 'triangle',
    filter: 1000,
  },
  /** Millionaire — final question cinematic suspense. */
  millionaire_final: {
    style: 'gameShow',
    bpm: 118,
    vol: 0.052,
    pad: [46, 53, 58, 65],
    bass: [34, 34, 41, 34, 46, 34],
    arp: [58, 61, 65, 70, 65, 61, 58, 53, 70],
    melody: [58, 61, 65, 70, 65, 61, 58, 0, 60, 65, 68, 73, 68, 65, 60, 0],
    tick: true,
    heartbeat: true,
    intensity: 5,
    padType: 'sawtooth',
    arpType: 'sine',
    filter: 900,
  },
  /**
   * Jeopardy board — Classic Game Show category selection.
   * Upbeat but not too fast; brass/synth accents; competitive quiz-show feel.
   */
  jeopardy_board: {
    style: 'gameShow',
    bpm: 108,
    vol: 0.042,
    pad: [55, 62, 67, 74],
    bass: [43, 43, 50, 43, 47, 43],
    arp: [67, 71, 74, 79, 74, 71, 67, 62],
    melody: [67, 71, 74, 79, 74, 71, 67, 0, 69, 72, 76, 81, 76, 72, 69, 0],
    sparkle: [79, 83, 86, 91, 86, 83],
    tick: true,
    intensity: 2,
    padType: 'triangle',
    arpType: 'square',
    filter: 1500,
  },
  /** Jeopardy — subtle bed while a clue/question is active. */
  jeopardy_question: {
    style: 'gameShow',
    bpm: 90,
    vol: 0.032,
    pad: [53, 60, 65],
    bass: [41, 41, 48, 41],
    arp: [65, 69, 72, 69],
    melody: [65, 69, 72, 0, 69, 72, 77, 0, 72, 69, 65, 60, 65, 0, 0, 0],
    tick: true,
    intensity: 1,
    padType: 'sine',
    arpType: 'triangle',
    filter: 1000,
  },
  /** Jeopardy — thinking tension (builds while student answers). */
  jeopardy_thinking: {
    style: 'gameShow',
    bpm: 98,
    vol: 0.038,
    pad: [50, 57, 62],
    bass: [38, 38, 45, 38, 40, 38],
    arp: [62, 66, 69, 74, 69, 66],
    melody: [62, 66, 69, 74, 69, 66, 62, 0, 64, 69, 72, 76, 72, 69, 64, 0],
    tick: true,
    heartbeat: true,
    intensity: 3,
    padType: 'triangle',
    arpType: 'triangle',
    filter: 1100,
  },
  /** Jeopardy — hotter thinking bed after longer deliberation. */
  jeopardy_thinking_hot: {
    style: 'gameShow',
    bpm: 106,
    vol: 0.044,
    pad: [48, 55, 60, 67],
    bass: [36, 36, 43, 36, 48, 36],
    arp: [60, 64, 67, 72, 67, 64, 60, 55],
    melody: [60, 64, 67, 72, 67, 64, 60, 0, 62, 67, 71, 76, 71, 67, 62, 0],
    sparkle: [72, 76, 79],
    tick: true,
    heartbeat: true,
    intensity: 4,
    padType: 'sawtooth',
    arpType: 'triangle',
    filter: 1050,
  },
  /**
   * Spin Wheel — Exciting + unpredictable.
   * Bouncy electronic pulse with bright, syncopated accents.
   */
  spin_wheel_exciting: {
    style: 'arcade',
    bpm: 126,
    vol: 0.042,
    pad: [62, 66, 69, 74],
    bass: [50, 50, 57, 50, 54, 57, 50, 45],
    arp: [74, 78, 81, 86, 81, 78, 74, 69, 81, 86],
    melody: [74, 78, 81, 86, 81, 78, 74, 0, 76, 81, 84, 88, 84, 81, 76, 0],
    sparkle: [98, 93, 90, 86, 102, 93],
    tick: true,
    padType: 'triangle',
    arpType: 'square',
    filter: 2100,
  },
  /**
   * Mystery Puzzle Adventure —
   * soft electronic/perc, subtle ticks, light pads, occasional mysterious tones.
   */
  mystery_puzzle_adventure: {
    style: 'mystery',
    bpm: 90,
    vol: 0.036,
    pad: [51, 58, 63, 68],
    bass: [39, 39, 46, 39, 41, 39, 46, 34],
    arp: [63, 65, 68, 70, 68, 65, 63, 58],
    melody: [63, 68, 70, 0, 68, 65, 63, 0, 70, 75, 70, 68, 63, 0, 0, 0],
    mystery: [75, 70, 82, 68, 77, 63],
    tick: true,
    softPerc: true,
    padType: 'sine',
    arpType: 'triangle',
    filter: 780,
  },
  /**
   * Puzzle Challenge — Playful + mysterious.
   * Soft mystery bed with a slightly brighter, puzzle-toy melody.
   */
  puzzle_playful_mystery: {
    style: 'mystery',
    bpm: 96,
    vol: 0.036,
    pad: [53, 60, 65, 70],
    bass: [41, 41, 48, 41, 43, 41, 48, 36],
    arp: [65, 69, 72, 77, 72, 69, 65, 60],
    melody: [65, 69, 72, 77, 72, 69, 65, 0, 69, 72, 77, 81, 77, 72, 69, 0],
    mystery: [79, 72, 84, 70, 81, 65],
    sparkle: [84, 88, 91, 84],
    tick: true,
    softPerc: true,
    padType: 'triangle',
    arpType: 'triangle',
    filter: 980,
  },
  /**
   * Memory Match — Cute + playful.
   * Soft bounce, bright sparkles, gentle arcade feel.
   */
  memory_cute_playful: {
    style: 'cute',
    bpm: 100,
    vol: 0.034,
    pad: [64, 67, 71, 76],
    bass: [52, 52, 59, 52, 55, 52],
    arp: [76, 79, 83, 88, 83, 79, 76, 71],
    melody: [76, 79, 83, 84, 83, 79, 76, 0, 79, 83, 88, 91, 88, 83, 79, 0],
    sparkle: [96, 100, 103, 96, 91],
    tick: true,
    padType: 'sine',
    arpType: 'triangle',
    filter: 2000,
  },
  /**
   * Word Search — Calm + curious.
   * Soft, searching textures with occasional curious pings.
   */
  word_search_curious: {
    style: 'curious',
    bpm: 78,
    vol: 0.032,
    pad: [55, 62, 67],
    bass: [43, 43, 50, 43],
    arp: [67, 70, 74, 70, 67, 62],
    melody: [67, 70, 74, 0, 72, 70, 67, 0, 74, 77, 74, 70, 67, 0, 0, 0],
    sparkle: [79, 74, 81, 72],
    tick: false,
    padType: 'sine',
    arpType: 'sine',
    filter: 1000,
  },
  /**
   * Crossword — Relaxed + intellectual.
   * Warm, spacious pads; quiet thoughtful melody.
   */
  crossword_intellectual: {
    style: 'curious',
    bpm: 70,
    vol: 0.03,
    pad: [53, 57, 60, 65],
    bass: [41, 41, 48, 41, 45, 41],
    arp: [65, 69, 72, 69, 65, 60, 57],
    melody: [65, 69, 72, 0, 69, 72, 76, 0, 72, 69, 65, 60, 65, 0, 0, 0],
    sparkle: [77, 72, 69],
    tick: false,
    padType: 'sine',
    arpType: 'triangle',
    filter: 850,
  },
  /** Mission Adventure — light exploration (selection / briefing). */
  mission_select: {
    style: 'adventure',
    bpm: 100,
    vol: 0.04,
    pad: [55, 62, 67, 74],
    bass: [43, 43, 50, 43, 45, 43, 50, 38],
    arp: [67, 71, 74, 79, 74, 71, 67, 62],
    melody: [67, 71, 74, 79, 74, 71, 67, 0, 69, 72, 76, 81, 76, 72, 69, 0],
    sparkle: [86, 83, 79, 74],
    tick: true,
    padType: 'triangle',
    arpType: 'triangle',
    filter: 1400,
  },
  /** Mission Adventure — mysterious / curious while reading a checkpoint. */
  mission_reading: {
    style: 'adventure',
    bpm: 92,
    vol: 0.038,
    pad: [53, 60, 65, 70],
    bass: [41, 41, 48, 41, 43, 41, 48, 36],
    arp: [65, 68, 72, 77, 72, 68, 65, 60],
    melody: [65, 68, 72, 0, 72, 77, 72, 68, 65, 0, 70, 74, 70, 65, 0, 0],
    sparkle: [84, 80, 77, 72],
    tick: true,
    padType: 'sine',
    arpType: 'triangle',
    filter: 1100,
  },
  /** Mission Adventure — brief suspense bed while a choice is pending. */
  mission_choice: {
    style: 'adventure',
    bpm: 104,
    vol: 0.04,
    pad: [50, 57, 62],
    bass: [38, 38, 45, 38],
    arp: [62, 65, 69, 74, 69, 65],
    melody: [62, 65, 69, 74, 69, 65, 62, 0, 64, 69, 72, 76, 72, 69, 64, 0],
    sparkle: [81, 77, 74],
    tick: true,
    padType: 'triangle',
    arpType: 'sine',
    filter: 1000,
  },
  /** Mission Adventure — epic playful finale for the last checkpoint. */
  mission_final: {
    style: 'adventure',
    bpm: 112,
    vol: 0.046,
    pad: [57, 64, 69, 76],
    bass: [45, 45, 52, 57, 45, 52, 45, 40],
    arp: [69, 73, 76, 81, 76, 73, 69, 64, 76, 81],
    melody: [69, 73, 76, 81, 76, 73, 69, 0, 71, 76, 79, 84, 79, 76, 71, 0],
    sparkle: [88, 93, 88, 81],
    tick: true,
    padType: 'sawtooth',
    arpType: 'triangle',
    filter: 1600,
  },
  /**
   * Drag & Drop — Playful Arcade + Light Electronic (Kahoot-calm).
   * Medium tempo, fun, not pressuring.
   */
  drag_drop_arcade: {
    style: 'arcade',
    bpm: 104,
    vol: 0.036,
    pad: [60, 64, 67, 72],
    bass: [48, 48, 55, 48, 52, 48],
    arp: [72, 76, 79, 76, 84, 79, 76, 72],
    melody: [72, 76, 79, 84, 79, 76, 72, 0, 74, 77, 81, 84, 81, 77, 74, 0],
    sparkle: [96, 91, 88, 84],
    tick: true,
    padType: 'triangle',
    arpType: 'square',
    filter: 1800,
  },
  flashcards: {
    bpm: 76,
    vol: 0.032,
    pad: [64, 68, 71],
    bass: [52, 52, 59, 52],
    arp: [71, 76, 83, 76, 71, 68],
    melody: [71, 76, 83, 0, 76, 71, 68, 0, 71, 76, 83, 88, 83, 76, 71, 0],
    tick: false,
    padType: 'sine',
    arpType: 'sine',
    filter: 900,
  },
};

function stopAmbientHard() {
  ambientGeneration += 1;
  if (ambientFadeTimerId != null) {
    window.clearTimeout(ambientFadeTimerId);
    ambientFadeTimerId = null;
  }
  if (!ambientNodes) {
    ambientMood = null;
    return;
  }
  try {
    if (ambientNodes.timerId) {
      window.clearInterval(ambientNodes.timerId);
    }
    const ctx = audioCtx;
    const { master, stopList } = ambientNodes;
    if (ctx && master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    }
    ambientFadeTimerId = window.setTimeout(() => {
      ambientFadeTimerId = null;
      (stopList || []).forEach((node) => {
        try {
          node.stop?.();
          node.disconnect?.();
        } catch {
          // already stopped
        }
      });
      try {
        master?.disconnect?.();
      } catch {
        // ignore
      }
    }, 280);
  } catch {
    // ignore
  }
  ambientNodes = null;
  ambientMood = null;
}

export function stopAmbient() {
  stopAmbientHard();
}

/**
 * Engaging looping bed unique to each game type.
 * Requires SFX + Music toggles both on.
 */
export function startAmbient(trackId) {
  if (!trackId || !getSoundsEnabled() || !getMusicEnabled()) {
    stopAmbient();
    return;
  }
  if (ambientMood === trackId && ambientNodes) return;

  stopAmbient();
  const generation = ambientGeneration;
  const ctx = getContext();
  if (!ctx) return;

  const track = AMBIENT_TRACKS[trackId] || AMBIENT_TRACKS.flashcards;

  try {
    const master = ctx.createGain();
    const bus = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = track.filter || 1200;
    bus.gain.value = 1;
    master.gain.value = 0.0001;
    bus.connect(filter);
    filter.connect(master);
    master.connect(ctx.destination);

    const stopList = [];
    const now = ctx.currentTime;

    // Soft breathing sine pads — warm & engaging, not a flat buzzing drone
    attachSoftBreathingPads(ctx, bus, track, stopList, now);

    // Gentle filter movement so beds still feel alive
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = track.style === 'mystery' || track.style === 'curious'
      ? 0.05
      : (track.style === 'adventure' ? 0.09 : (track.style === 'cute' ? 0.11 : 0.07));
    lfoGain.gain.value = track.style === 'mystery' || track.style === 'curious'
      ? 120
      : (track.style === 'adventure' ? 240 : (track.style === 'cute' ? 180 : 200));
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(now);
    stopList.push(lfo);

    master.gain.exponentialRampToValueAtTime(
      Math.min(0.2, track.vol * MUSIC_GAIN),
      now + 0.9,
    );

    const beatSec = 60 / track.bpm;
    let step = 0;
    const arp = track.arp || [];
    const bass = track.bass || [];
    const pad = track.pad || [];
    const mysteryNotes = track.mystery || [];
    const sparkle = track.sparkle || [];
    const isMystery = track.style === 'mystery';
    const isAdventure = track.style === 'adventure';
    const isGameShow = track.style === 'gameShow';
    const isArcade = track.style === 'arcade';
    const isCute = track.style === 'cute';
    const isCurious = track.style === 'curious';
    const intensity = Number(track.intensity) || 1;
    const hasMelody = Boolean(track.melody?.length);

    const timerId = window.setInterval(() => {
      if (generation !== ambientGeneration) {
        window.clearInterval(timerId);
        return;
      }
      if (!getSoundsEnabled() || !getMusicEnabled()) {
        stopAmbient();
        return;
      }
      const t = ctx.currentTime + 0.05;
      const bassNote = bass[step % bass.length];
      const arpNote = arp[step % arp.length];

      // Soft engaging chord bloom every 8 beats
      if (pad.length && step % 8 === 0) {
        scheduleSoftBloom(ctx, bus, pad, t + beatSec * 0.05, beatSec);
      }

      // Lead melody is the musical hook; arp becomes quiet accompaniment
      scheduleLeadMelody(ctx, bus, track, step, t, beatSec);
      const arpVolScale = hasMelody ? 0.35 : 1;

      if (isMystery) {
        // Soft electronic kick / pulse (not a loud drum)
        if (step % 4 === 0) {
          scheduleNote(ctx, bus, {
            midi: 36,
            when: t,
            duration: 0.14,
            type: 'sine',
            volume: 0.018,
            filterFreq: 180,
          });
        }
        // Subtle metronome tick on every beat (triangle — no buzzy square "ugong")
        if (track.tick) {
          scheduleNote(ctx, bus, {
            midi: 88,
            when: t,
            duration: 0.022,
            type: 'triangle',
            volume: 0.005,
            filterFreq: 2400,
          });
        }
        // Light bass breath
        scheduleNote(ctx, bus, {
          midi: bassNote,
          when: t,
          duration: beatSec * 0.7,
          type: 'sine',
          volume: 0.016,
          filterFreq: 320,
        });
        // Soft accompaniment under the lead melody
        if (step % 2 === 0) {
          scheduleNote(ctx, bus, {
            midi: arpNote,
            when: t + beatSec * 0.08,
            duration: beatSec * 0.45,
            type: 'triangle',
            volume: 0.015 * arpVolScale,
            filterFreq: 1100,
          });
        }
        // Occasional mysterious tone (short — avoid long ringing drone)
        if (mysteryNotes.length && step % 8 === 4) {
          const toneMidi = mysteryNotes[(step / 8) % mysteryNotes.length];
          scheduleNote(ctx, bus, {
            midi: toneMidi,
            when: t + beatSec * 0.2,
            duration: beatSec * 0.55,
            type: 'sine',
            volume: 0.014,
            filterFreq: 1400,
          });
        }
        // Playful sparkle accents (Puzzle Challenge)
        if (sparkle.length && step % 8 === 2) {
          scheduleNote(ctx, bus, {
            midi: sparkle[(step / 8) % sparkle.length],
            when: t + beatSec * 0.4,
            duration: beatSec * 0.3,
            type: 'triangle',
            volume: 0.011,
            filterFreq: 2200,
          });
        }
      } else if (isAdventure) {
        // Light orchestral pulse — cinematic but playful
        if (step % 4 === 0) {
          scheduleNote(ctx, bus, {
            midi: bassNote,
            when: t,
            duration: beatSec * 0.7,
            type: 'triangle',
            volume: 0.024,
            filterFreq: 420,
          });
        } else {
          scheduleNote(ctx, bus, {
            midi: bassNote,
            when: t,
            duration: beatSec * 0.45,
            type: 'sine',
            volume: 0.014,
            filterFreq: 360,
          });
        }
        // Soft accompaniment under the lead melody
        if (!hasMelody || step % 2 === 1) {
          scheduleNote(ctx, bus, {
            midi: arpNote,
            when: t + beatSec * 0.05,
            duration: beatSec * 0.4,
            type: track.arpType || 'triangle',
            volume: 0.022 * arpVolScale,
            filterFreq: track.filter || 1400,
          });
        }
        // Soft percussion tick
        if (track.tick) {
          scheduleNote(ctx, bus, {
            midi: step % 4 === 0 ? 76 : 84,
            when: t,
            duration: 0.022,
            type: 'triangle',
            volume: step % 4 === 0 ? 0.01 : 0.005,
            filterFreq: 2600,
          });
        }
        // Exploration sparkle
        if (sparkle.length && step % 4 === 2) {
          scheduleNote(ctx, bus, {
            midi: sparkle[(step / 4) % sparkle.length],
            when: t + beatSec * 0.35,
            duration: beatSec * 0.4,
            type: 'sine',
            volume: 0.014,
            filterFreq: 2400,
          });
        }
        // Occasional rising “reward” motif
        if (step % 16 === 8) {
          scheduleNote(ctx, bus, {
            midi: arpNote + 7,
            when: t + beatSec * 0.15,
            duration: beatSec * 0.7,
            type: 'triangle',
            volume: 0.018,
            filterFreq: 1800,
          });
        }
      } else if (isGameShow) {
        // Suspenseful quiz-show bed — tension scales with intensity
        const bassVol = 0.016 + intensity * 0.004;
        const arpVol = (0.018 + intensity * 0.003) * arpVolScale;
        scheduleNote(ctx, bus, {
          midi: bassNote,
          when: t,
          duration: beatSec * (0.65 + intensity * 0.02),
          type: 'triangle',
          volume: bassVol,
          filterFreq: Math.max(280, 520 - intensity * 40),
        });
        if (!hasMelody || step % 2 === 1) {
          scheduleNote(ctx, bus, {
            midi: arpNote,
            when: t + beatSec * 0.06,
            duration: beatSec * 0.38,
            type: track.arpType === 'square' ? 'triangle' : (track.arpType || 'triangle'),
            volume: arpVol,
            filterFreq: track.filter || 1200,
          });
        }
        // Soft game-show tick (no square buzz)
        if (track.tick) {
          scheduleNote(ctx, bus, {
            midi: intensity >= 3 ? 86 : 81,
            when: t,
            duration: 0.022,
            type: 'triangle',
            volume: 0.005 + intensity * 0.001,
            filterFreq: 2800,
          });
          if (intensity >= 2 && step % 2 === 1) {
            scheduleNote(ctx, bus, {
              midi: 90,
              when: t + beatSec * 0.5,
              duration: 0.02,
              type: 'triangle',
              volume: 0.004,
              filterFreq: 3000,
            });
          }
        }
        // Soft pulse on harder tiers (not a buzzing heartbeat)
        if (track.heartbeat && step % 4 === 0) {
          scheduleNote(ctx, bus, {
            midi: 38,
            when: t,
            duration: 0.08,
            type: 'sine',
            volume: 0.014 + intensity * 0.002,
            filterFreq: 220,
          });
        }
        // Rising suspense motif near the end of each bar
        if (intensity >= 3 && step % 8 === 6) {
          scheduleNote(ctx, bus, {
            midi: arpNote + 5,
            when: t + beatSec * 0.2,
            duration: beatSec * 0.55,
            type: 'sine',
            volume: 0.014 + intensity * 0.002,
            filterFreq: 1500,
          });
        }
        if (intensity >= 5 && step % 4 === 2) {
          scheduleNote(ctx, bus, {
            midi: arpNote + 12,
            when: t + beatSec * 0.35,
            duration: beatSec * 0.3,
            type: 'triangle',
            volume: 0.016,
            filterFreq: 2000,
          });
        }
        // Soft brass / synth accents (triangle — no square buzz)
        if (sparkle.length && step % 4 === 1) {
          scheduleNote(ctx, bus, {
            midi: sparkle[(step / 4) % sparkle.length],
            when: t + beatSec * 0.28,
            duration: beatSec * 0.28,
            type: 'triangle',
            volume: 0.008 + intensity * 0.001,
            filterFreq: 2000,
          });
        }
      } else if (isArcade) {
        // Playful arcade + light electronic — medium tempo, rewarding, not pressuring
        scheduleNote(ctx, bus, {
          midi: bassNote,
          when: t,
          duration: beatSec * 0.55,
          type: 'triangle',
          volume: 0.016,
          filterFreq: 480,
        });
        if (!hasMelody || step % 2 === 1) {
          scheduleNote(ctx, bus, {
            midi: arpNote,
            when: t + beatSec * 0.05,
            duration: beatSec * 0.35,
            type: 'triangle',
            volume: 0.015 * arpVolScale,
            filterFreq: 1800,
          });
        }
        if (track.tick && step % 2 === 0) {
          scheduleNote(ctx, bus, {
            midi: 84,
            when: t,
            duration: 0.02,
            type: 'triangle',
            volume: 0.005,
            filterFreq: 3000,
          });
        }
        if (sparkle.length && step % 4 === 1) {
          scheduleNote(ctx, bus, {
            midi: sparkle[(step / 4) % sparkle.length],
            when: t + beatSec * 0.4,
            duration: beatSec * 0.25,
            type: 'sine',
            volume: 0.011,
            filterFreq: 2600,
          });
        }
        // Soft off-beat electronic blip
        if (step % 4 === 3) {
          scheduleNote(ctx, bus, {
            midi: arpNote + 5,
            when: t + beatSec * 0.5,
            duration: beatSec * 0.18,
            type: 'sine',
            volume: 0.01,
            filterFreq: 2000,
          });
        }
      } else if (isCute) {
        // Cute + playful — soft bounce and bright sparkles
        scheduleNote(ctx, bus, {
          midi: bassNote,
          when: t,
          duration: beatSec * 0.55,
          type: 'triangle',
          volume: step % 4 === 0 ? 0.02 : 0.012,
          filterFreq: 520,
        });
        if (!hasMelody || step % 2 === 1) {
          scheduleNote(ctx, bus, {
            midi: arpNote,
            when: t + beatSec * 0.08,
            duration: beatSec * 0.38,
            type: 'sine',
            volume: 0.018 * arpVolScale,
            filterFreq: 2200,
          });
        }
        if (track.tick && step % 2 === 0) {
          scheduleNote(ctx, bus, {
            midi: 91,
            when: t,
            duration: 0.022,
            type: 'triangle',
            volume: 0.006,
            filterFreq: 3800,
          });
        }
        if (sparkle.length && step % 2 === 1) {
          scheduleNote(ctx, bus, {
            midi: sparkle[(step / 2) % sparkle.length],
            when: t + beatSec * 0.45,
            duration: beatSec * 0.28,
            type: 'sine',
            volume: 0.014,
            filterFreq: 3200,
          });
        }
      } else if (isCurious) {
        // Calm + curious / relaxed intellectual — spacious and soft
        if (step % 4 === 0) {
          scheduleNote(ctx, bus, {
            midi: bassNote,
            when: t,
            duration: beatSec * 1.6,
            type: 'sine',
            volume: 0.016,
            filterFreq: 280,
          });
        }
        if (step % 2 === 0 && (!hasMelody || step % 4 === 2)) {
          scheduleNote(ctx, bus, {
            midi: arpNote,
            when: t + beatSec * 0.12,
            duration: beatSec * 0.9,
            type: track.arpType || 'sine',
            volume: 0.014 * arpVolScale,
            filterFreq: track.filter || 1000,
          });
        }
        // Occasional curious ping
        if (sparkle.length && step % 8 === 5) {
          scheduleNote(ctx, bus, {
            midi: sparkle[(step / 8) % sparkle.length],
            when: t + beatSec * 0.3,
            duration: beatSec * 1.1,
            type: 'sine',
            volume: 0.016,
            filterFreq: 1800,
          });
        }
      } else {
        scheduleNote(ctx, bus, {
          midi: bassNote,
          when: t,
          duration: beatSec * 0.85,
          type: 'triangle',
          volume: 0.03,
          filterFreq: 500,
        });

        if (!hasMelody || step % 2 === 1) {
          scheduleNote(ctx, bus, {
            midi: arpNote,
            when: t,
            duration: beatSec * 0.45,
            type: track.arpType || 'triangle',
            volume: 0.028 * arpVolScale,
            filterFreq: track.filter || 1600,
          });
        }

        if (!hasMelody && arp.length > 1 && step % 2 === 1) {
          scheduleNote(ctx, bus, {
            midi: arpNote + 7,
            when: t + beatSec * 0.5,
            duration: beatSec * 0.25,
            type: 'sine',
            volume: 0.016,
            filterFreq: 2200,
          });
        }

        if (track.tick && step % 2 === 0) {
          scheduleNote(ctx, bus, {
            midi: 84,
            when: t,
            duration: 0.022,
            type: 'triangle',
            volume: 0.006,
            filterFreq: 2600,
          });
        }
      }

      step += 1;
    }, beatSec * 1000);

    // Ignore if something stopped ambient while we were wiring nodes.
    if (generation !== ambientGeneration) {
      window.clearInterval(timerId);
      try {
        master.disconnect();
      } catch {
        // ignore
      }
      return;
    }

    ambientNodes = { master, bus, filter, stopList, timerId, generation };
    ambientMood = trackId;
  } catch {
    ambientNodes = null;
    ambientMood = null;
  }
}

export function syncAmbientForGame(gameType) {
  const trackId = ambientMoodForGameType(gameType);
  if (!trackId) {
    stopAmbient();
    return;
  }
  startAmbient(trackId);
}

/**
 * Mission Adventure progressive music beds.
 * @param {'select'|'reading'|'choice'|'final'} phase
 */
export function syncMissionAdventureMusic(phase) {
  const trackId = MISSION_MUSIC[phase] || MISSION_MUSIC.select;
  startAmbient(trackId);
}

/**
 * Millionaire Suspenseful Game Show beds by ladder progress.
 * Scales across any question count (calm → early → mid → late → final).
 */
export function syncMillionaireMusic(questionIndex, totalQuestions) {
  const total = Math.max(1, Number(totalQuestions) || 1);
  const index = Math.max(0, Math.min(total - 1, Number(questionIndex) || 0));
  let phase = 'early';
  if (index >= total - 1) phase = 'final';
  else if (index === 0) phase = 'calm';
  else {
    const ratio = index / Math.max(total - 1, 1);
    if (ratio < 0.4) phase = 'early';
    else if (ratio < 0.7) phase = 'mid';
    else phase = 'late';
  }
  startAmbient(MILLIONAIRE_MUSIC[phase] || MILLIONAIRE_MUSIC.early);
}

/**
 * Jeopardy Classic Game Show beds by play moment.
 * @param {'board'|'question'|'thinking'|'thinkingHot'} phase
 */
export function syncJeopardyMusic(phase) {
  const trackId = JEOPARDY_MUSIC[phase] || JEOPARDY_MUSIC.board;
  startAmbient(trackId);
}

/**
 * Quiz Show Modern Game Show beds by play moment.
 * @param {'play'|'tension'} phase
 */
export function syncQuizShowMusic(phase) {
  const trackId = QUIZ_SHOW_MUSIC[phase] || QUIZ_SHOW_MUSIC.play;
  startAmbient(trackId);
}
