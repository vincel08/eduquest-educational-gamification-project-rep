import { query } from "../config/db.js";

const GamificationModel = {
  async createBadge(data) {
    const result = await query(
      `INSERT INTO badges
       (name, description, icon, color, criteria_type, criteria_value, xp_bonus, is_active)
       VALUES
       (:name, :description, :icon, :color, :criteriaType, :criteriaValue, :xpBonus, :isActive)`,
      {
        name: data.name,
        description: data.description,
        icon: data.icon || "emoji_events",
        color: data.color || "#FFB300",
        criteriaType: data.criteriaType,
        criteriaValue: data.criteriaValue || 1,
        xpBonus: data.xpBonus || 0,
        isActive: data.isActive === false ? 0 : 1,
      },
    );
    return this.findBadgeById(result.insertId);
  },

  async findBadgeById(id) {
    const rows = await query("SELECT * FROM badges WHERE id = :id LIMIT 1", {
      id,
    });
    return rows[0] || null;
  },

  async findAllBadges({ activeOnly = false } = {}) {
    const filter = activeOnly ? "WHERE is_active = 1" : "";
    return query(
      `SELECT * FROM badges ${filter} ORDER BY criteria_value ASC, name ASC`,
    );
  },

  async updateBadge(id, data) {
    const mapping = {
      name: "name",
      description: "description",
      icon: "icon",
      color: "color",
      criteriaType: "criteria_type",
      criteriaValue: "criteria_value",
      xpBonus: "xp_bonus",
      isActive: "is_active",
    };

    const sets = [];
    const params = { id };

    for (const [key, column] of Object.entries(mapping)) {
      if (data[key] !== undefined) {
        sets.push(`${column} = :${key}`);
        params[key] = key === "isActive" ? (data[key] ? 1 : 0) : data[key];
      }
    }

    if (!sets.length) return this.findBadgeById(id);
    await query(`UPDATE badges SET ${sets.join(", ")} WHERE id = :id`, params);
    return this.findBadgeById(id);
  },

  async awardBadge({ studentId, badgeId, awardedBy = null }) {
    await query(
      `INSERT INTO student_badges (student_id, badge_id, awarded_by)
       VALUES (:studentId, :badgeId, :awardedBy)
       ON DUPLICATE KEY UPDATE awarded_at = CURRENT_TIMESTAMP`,
      { studentId, badgeId, awardedBy },
    );
    return this.getStudentBadge(studentId, badgeId);
  },

  async getStudentBadge(studentId, badgeId) {
    const rows = await query(
      `SELECT sb.*, b.name, b.description, b.icon, b.color
       FROM student_badges sb
       INNER JOIN badges b ON b.id = sb.badge_id
       WHERE sb.student_id = :studentId AND sb.badge_id = :badgeId
       LIMIT 1`,
      { studentId, badgeId },
    );
    return rows[0] || null;
  },

  async getStudentBadges(studentId) {
    return query(
      `SELECT sb.*, b.name, b.description, b.icon, b.color, b.criteria_type, b.criteria_value
       FROM student_badges sb
       INNER JOIN badges b ON b.id = sb.badge_id
       WHERE sb.student_id = :studentId
       ORDER BY sb.awarded_at DESC`,
      { studentId },
    );
  },

  async createMedal(data) {
    const result = await query(
      `INSERT INTO medals
       (name, description, tier, icon, criteria_type, criteria_value, is_active)
       VALUES
       (:name, :description, :tier, :icon, :criteriaType, :criteriaValue, :isActive)`,
      {
        name: data.name,
        description: data.description,
        tier: data.tier || "bronze",
        icon: data.icon || "military_tech",
        criteriaType: data.criteriaType,
        criteriaValue: data.criteriaValue || 1,
        isActive: data.isActive === false ? 0 : 1,
      },
    );
    return this.findMedalById(result.insertId);
  },

  async findMedalById(id) {
    const rows = await query("SELECT * FROM medals WHERE id = :id LIMIT 1", {
      id,
    });
    return rows[0] || null;
  },

  async findAllMedals({ activeOnly = false } = {}) {
    const filter = activeOnly ? "WHERE is_active = 1" : "";
    return query(
      `SELECT * FROM medals ${filter} ORDER BY FIELD(tier, 'bronze', 'silver', 'gold', 'platinum'), name ASC`,
    );
  },

  async awardMedal({ studentId, medalId, awardedBy = null }) {
    const existing = await this.getStudentMedal(studentId, medalId);
    if (existing) {
      return { ...existing, isNew: false };
    }

    try {
      await query(
        `INSERT INTO student_medals (student_id, medal_id, awarded_by)
         VALUES (:studentId, :medalId, :awardedBy)`,
        { studentId, medalId, awardedBy },
      );
    } catch (error) {
      if (error?.code === "ER_DUP_ENTRY" || Number(error?.errno) === 1062) {
        const current = await this.getStudentMedal(studentId, medalId);
        return current ? { ...current, isNew: false } : null;
      }
      throw error;
    }

    const awarded = await this.getStudentMedal(studentId, medalId);
    return awarded ? { ...awarded, isNew: true } : null;
  },

  async getStudentMedal(studentId, medalId) {
    const rows = await query(
      `SELECT sm.*, m.name, m.description, m.tier, m.icon
       FROM student_medals sm
       INNER JOIN medals m ON m.id = sm.medal_id
       WHERE sm.student_id = :studentId AND sm.medal_id = :medalId
       LIMIT 1`,
      { studentId, medalId },
    );
    return rows[0] || null;
  },

  async getStudentMedals(studentId) {
    return query(
      `SELECT sm.*, m.name, m.description, m.tier, m.icon
       FROM student_medals sm
       INNER JOIN medals m ON m.id = sm.medal_id
       WHERE sm.student_id = :studentId
       ORDER BY sm.awarded_at DESC`,
      { studentId },
    );
  },

  async addXpTransaction({
    studentId,
    amount,
    sourceType,
    sourceId = null,
    description,
  }) {
    await query(
      `INSERT INTO xp_transactions (student_id, amount, source_type, source_id, description)
       VALUES (:studentId, :amount, :sourceType, :sourceId, :description)`,
      { studentId, amount, sourceType, sourceId, description },
    );
  },

  async findXpTransaction(studentId, sourceType, sourceId) {
    if (sourceId == null) return null;
    const rows = await query(
      `SELECT * FROM xp_transactions
       WHERE student_id = :studentId
         AND source_type = :sourceType
         AND source_id = :sourceId
       ORDER BY id ASC
       LIMIT 1`,
      { studentId, sourceType, sourceId },
    );
    return rows[0] || null;
  },

  async hasXpTransaction(studentId, sourceType, sourceId) {
    const existing = await this.findXpTransaction(
      studentId,
      sourceType,
      sourceId,
    );
    return Boolean(existing);
  },

  async getXpHistory(studentId, limit = 20) {
    return query(
      `SELECT * FROM xp_transactions
       WHERE student_id = :studentId
       ORDER BY created_at DESC
       LIMIT :limit`,
      { studentId, limit: Number(limit) },
    );
  },

  async countCompletedLessons(studentId) {
    const rows = await query(
      `SELECT COUNT(*) AS total
       FROM lesson_progress
       WHERE student_id = :studentId AND status = 'completed'`,
      { studentId },
    );
    return rows[0].total;
  },
};

export default GamificationModel;
