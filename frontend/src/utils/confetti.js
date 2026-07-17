import confetti from 'canvas-confetti';

export function celebrate() {
  confetti({
    particleCount: 120,
    spread: 70,
    origin: { y: 0.7 },
    colors: ['#0F766E', '#F59E0B', '#22C55E', '#0EA5E9'],
  });
}

export function celebrateAchievement() {
  const end = Date.now() + 1200;
  const colors = ['#F59E0B', '#0F766E', '#AB47BC'];

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  }());
}
