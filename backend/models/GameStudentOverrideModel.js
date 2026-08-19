import { query } from '../config/db.js';

const GameStudentOverrideModel = {
  async findByGameAndStudent(gameId, studentId) {
    const rows = await query(
      `SELECT * FROM game_student_overrides
       WHERE game_id = :gameId AND student_id = :studentId
       LIMIT 1`,
      { gameId, studentId },
    );
    return rows[0] || null;
  },

  async findByGame(gameId) {
    return query(
      `SELECT o.*,
              u.first_name, u.last_name, u.email,
              g.first_name AS granter_first_name, g.last_name AS granter_last_name
       FROM game_student_overrides o
       INNER JOIN users u ON u.id = o.student_id
       INNER JOIN users g ON g.id = o.granted_by
       WHERE o.game_id = :gameId
       ORDER BY o.updated_at DESC`,
      { gameId },
    );
  },

  async upsert({
    gameId,
    studentId,
    extraAttempts = 0,
    reason = null,
    grantedBy,
  }) {
    await query(
      `INSERT INTO game_student_overrides
         (game_id, student_id, extra_attempts, reason, granted_by)
       VALUES
         (:gameId, :studentId, :extraAttempts, :reason, :grantedBy)
       ON DUPLICATE KEY UPDATE
         extra_attempts = VALUES(extra_attempts),
         reason = VALUES(reason),
         granted_by = VALUES(granted_by),
         updated_at = CURRENT_TIMESTAMP`,
      {
        gameId,
        studentId,
        extraAttempts: Math.max(0, Number(extraAttempts) || 0),
        reason: reason || null,
        grantedBy,
      },
    );
    return this.findByGameAndStudent(gameId, studentId);
  },

  async remove(gameId, studentId) {
    await query(
      `DELETE FROM game_student_overrides
       WHERE game_id = :gameId AND student_id = :studentId`,
      { gameId, studentId },
    );
    return true;
  },
};

export default GameStudentOverrideModel;
