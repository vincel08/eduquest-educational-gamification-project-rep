import confetti from 'canvas-confetti';

const COLORS = ['#3B82F6', '#8B5CF6', '#FACC15', '#22C55E', '#FFFFFF'];

export function celebrate() {
  confetti({
    particleCount: 120,
    spread: 70,
    origin: { y: 0.7 },
    colors: COLORS,
  });
}

export function celebrateAchievement() {
  const end = Date.now() + 1200;
  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: COLORS,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: COLORS,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  }());
}

/** Level-up confetti burst lasting ~2.5 seconds */
export function celebrateLevelUp(durationMs = 2500) {
  const end = Date.now() + durationMs;
  (function frame() {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.65 },
      colors: COLORS,
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.65 },
      colors: COLORS,
    });
    confetti({
      particleCount: 4,
      spread: 100,
      origin: { y: 0.4 },
      colors: COLORS,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  }());
}
