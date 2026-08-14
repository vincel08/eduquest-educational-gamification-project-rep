import { query } from '../config/db.js';
import { calculateLevel } from '../utils/levelCalculator.js';

const StudentProfileModel = {
  async create(userId, { gradeLevel = null, schoolName = null } = {}) {
    await query(
      `INSERT INTO student_profiles (user_id, grade_level, school_name)
       VALUES (:userId, :gradeLevel, :schoolName)`,
      { userId, gradeLevel, schoolName }
    );
    return this.findByUserId(userId);
  },

  async findByUserId(userId) {
    const rows = await query(
      `SELECT sp.*, u.first_name, u.last_name, u.email, u.avatar_url
       FROM student_profiles sp
       INNER JOIN users u ON u.id = sp.user_id
       WHERE sp.user_id = :userId
       LIMIT 1`,
      { userId }
    );
    return rows[0] || null;
  },

  async addXp(userId, amount) {
    const profile = await this.findByUserId(userId);
    if (!profile) {
      return null;
    }

    const newXp = Number(profile.xp) + Number(amount);
    const newLevel = calculateLevel(newXp);

    await query(
      `UPDATE student_profiles
       SET xp = :xp, level = :level
       WHERE user_id = :userId`,
      { xp: newXp, level: newLevel, userId }
    );

    return this.findByUserId(userId);
  },

  async getLeaderboard(limit = 20, period = 'overall') {
    const normalized = ['weekly', 'monthly', 'overall'].includes(period) ? period : 'overall';

    if (normalized === 'overall') {
      return query(
        `SELECT sp.user_id, sp.xp, sp.level, u.first_name, u.last_name, u.avatar_url,
                (SELECT COUNT(*) FROM student_badges sb WHERE sb.student_id = sp.user_id) AS badge_count,
                NULL AS period_xp
         FROM student_profiles sp
         INNER JOIN users u ON u.id = sp.user_id
         WHERE u.is_active = 1
           AND sp.xp > 0
         ORDER BY sp.xp DESC, sp.level DESC, u.first_name ASC
         LIMIT :limit`,
        { limit: Number(limit) }
      );
    }

    const days = normalized === 'weekly' ? 7 : 30;
    return query(
      `SELECT sp.user_id, sp.xp, sp.level, u.first_name, u.last_name, u.avatar_url,
              (SELECT COUNT(*) FROM student_badges sb WHERE sb.student_id = sp.user_id) AS badge_count,
              COALESCE(SUM(xt.amount), 0) AS period_xp
       FROM student_profiles sp
       INNER JOIN users u ON u.id = sp.user_id
       LEFT JOIN xp_transactions xt
         ON xt.student_id = sp.user_id
        AND xt.created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
       WHERE u.is_active = 1
       GROUP BY sp.user_id, sp.xp, sp.level, u.first_name, u.last_name, u.avatar_url
       HAVING COALESCE(SUM(xt.amount), 0) > 0
       ORDER BY period_xp DESC, sp.xp DESC, u.first_name ASC
       LIMIT :limit`,
      { limit: Number(limit) }
    );
  },

  async getStudentRank(userId) {
    // Match overall leaderboard: active users with XP > 0, same sort, dense position (1..N).
    // Students with 0 XP are unranked (null).
    const rows = await query(
      `SELECT ranked.rank_position
       FROM (
         SELECT sp.user_id,
                ROW_NUMBER() OVER (
                  ORDER BY sp.xp DESC, sp.level DESC, u.first_name ASC
                ) AS rank_position
         FROM student_profiles sp
         INNER JOIN users u ON u.id = sp.user_id
         WHERE u.is_active = 1
           AND sp.xp > 0
       ) ranked
       WHERE ranked.user_id = :userId`,
      { userId }
    );
    return rows[0]?.rank_position || null;
  },
};

export default StudentProfileModel;
