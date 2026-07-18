import confetti from 'canvas-confetti';

export function celebrate() {
  confetti({
    particleCount: 120,
    spread: 70,
    origin: { y: 0.7 },
    colors: ['#2563EB', '#7C3AED', '#FACC15', '#FFFFFF'],
  });
}

export function celebrateAchievement() {
  const end = Date.now() + 1200;
  const colors = ['#FACC15', '#2563EB', '#7C3AED', '#FFFFFF'];

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
