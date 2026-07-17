import { query } from '../config/db.js';

function toDateString(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

const StreakService = {
  async recordActivity(studentId) {
    const rows = await query(
      `SELECT current_streak, longest_streak, last_activity_date
       FROM student_profiles
       WHERE user_id = :studentId
       LIMIT 1`,
      { studentId }
    );
    const profile = rows[0];
    if (!profile) return null;

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const last = toDateString(profile.last_activity_date);

    let currentStreak = Number(profile.current_streak) || 0;
    let longestStreak = Number(profile.longest_streak) || 0;

    if (last === todayStr) {
      return {
        currentStreak,
        longestStreak,
        lastActivityDate: last,
        updated: false,
      };
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    if (last === yesterdayStr) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }

    longestStreak = Math.max(longestStreak, currentStreak);

    await query(
      `UPDATE student_profiles
       SET current_streak = :currentStreak,
           longest_streak = :longestStreak,
           last_activity_date = :today
       WHERE user_id = :studentId`,
      { currentStreak, longestStreak, today: todayStr, studentId }
    );

    return {
      currentStreak,
      longestStreak,
      lastActivityDate: todayStr,
      updated: true,
    };
  },
};

export default StreakService;
