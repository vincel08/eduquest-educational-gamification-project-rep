const DEFAULT_DAILY_XP_GOAL = 50;
const TODAY_XP_STORAGE_KEY = "eduwow_today_xp_v1";

export function localTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Sum XP for the student's local calendar day from analytics xpTrend rows. */
export function sumTodayXpFromTrend(xpTrend = []) {
  const today = localTodayKey();
  const rows = Array.isArray(xpTrend) ? xpTrend : [];
  const match = rows.find((item) => {
    const day = String(item?.day || "").slice(0, 10);
    return day === today;
  });
  return match ? Math.max(0, Number(match.xp) || 0) : 0;
}

export function readStoredTodayXp() {
  try {
    const raw = sessionStorage.getItem(TODAY_XP_STORAGE_KEY);
    if (!raw) return { date: localTodayKey(), amount: 0 };
    const parsed = JSON.parse(raw);
    const date = localTodayKey();
    if (!parsed || parsed.date !== date) {
      return { date, amount: 0 };
    }
    return {
      date,
      amount: Math.max(0, Number(parsed.amount) || 0),
    };
  } catch {
    return { date: localTodayKey(), amount: 0 };
  }
}

export function writeStoredTodayXp(amount) {
  const next = {
    date: localTodayKey(),
    amount: Math.max(0, Number(amount) || 0),
  };
  try {
    sessionStorage.setItem(TODAY_XP_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
  return next;
}

/**
 * Simple daily XP challenge copy for students.
 */
export function getDailyXpGoalDisplay(todayXp, goal = DEFAULT_DAILY_XP_GOAL) {
  const earned = Math.max(0, Number(todayXp) || 0);
  const target = Math.max(1, Number(goal) || DEFAULT_DAILY_XP_GOAL);
  const complete = earned >= target;
  const progress = Math.min(100, Math.round((earned / target) * 100));
  const remaining = Math.max(0, target - earned);

  return {
    earned,
    target,
    complete,
    progress,
    title: `Today earned: ${earned} XP · Daily Goal: ${target}`,
    subtitle: complete
      ? "Daily challenge complete!"
      : `Keep going — ${remaining} XP left today.`,
  };
}

export { DEFAULT_DAILY_XP_GOAL };
