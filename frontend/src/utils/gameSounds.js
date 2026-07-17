const STORAGE_KEY = 'eduquest_sounds_muted';

const SOUND_SOURCES = {
  correct: ['/sounds/success.mp3', '/sounds/success.wav'],
  incorrect: ['/sounds/error.mp3', '/sounds/error.wav'],
};

let audioContext = null;
const audioCache = {};

export function isSoundsMuted() {
  return localStorage.getItem(STORAGE_KEY) === '1';
}

export function setSoundsMuted(muted) {
  localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
  window.dispatchEvent(new CustomEvent('eduquest-sounds-muted', { detail: { muted: Boolean(muted) } }));
}

export function toggleSoundsMuted() {
  const next = !isSoundsMuted();
  setSoundsMuted(next);
  return next;
}

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioContext) {
    audioContext = new AudioCtx();
  }
  return audioContext;
}

function playSynthesized(kind) {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.0001, now);

  if (kind === 'correct') {
    const frequencies = [523.25, 659.25, 783.99];
    frequencies.forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, now);
      osc.connect(gain);
      osc.start(now + index * 0.05);
      osc.stop(now + 0.28 + index * 0.05);
    });
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    return;
  }

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(110, now + 0.28);
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 0.32);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
}

async function playFromFiles(kind) {
  const sources = SOUND_SOURCES[kind] || [];
  for (const src of sources) {
    try {
      if (!audioCache[src]) {
        const audio = new Audio(src);
        audio.preload = 'auto';
        audioCache[src] = audio;
      }
      const audio = audioCache[src].cloneNode();
      audio.volume = 0.55;
      await audio.play();
      return true;
    } catch {
      // Try next source or fall back to synthesis.
    }
  }
  return false;
}

export async function playGameSound(kind) {
  if (isSoundsMuted()) return;
  const normalized = kind === 'correct' || kind === 'success' ? 'correct' : 'incorrect';
  const played = await playFromFiles(normalized);
  if (!played) {
    playSynthesized(normalized);
  }
}

export function playCorrectSound() {
  return playGameSound('correct');
}

export function playIncorrectSound() {
  return playGameSound('incorrect');
}
