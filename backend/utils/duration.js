/**
 * Parse compact duration strings used by JWT config (e.g. 10m, 1h, 7d).
 */
export function parseDurationMs(value, fallbackMs) {
  const raw = String(value ?? '').trim();
  const match = raw.match(/^(\d+)\s*(ms|s|m|h|d)$/i);
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount < 0) return fallbackMs;
  const unit = match[2].toLowerCase();
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * multipliers[unit];
}
