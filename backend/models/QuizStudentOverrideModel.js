import { query } from '../config/db.js';

const QuizStudentOverrideModel = {
  async findByQuizAndStudent(quizId, studentId) {
    const rows = await query(
      `SELECT * FROM quiz_student_overrides
       WHERE quiz_id = :quizId AND student_id = :studentId
       LIMIT 1`,
      { quizId, studentId }
    );
    return rows[0] || null;
  },

  async findByQuiz(quizId) {
    return query(
      `SELECT o.*,
              u.first_name, u.last_name, u.email,
              g.first_name AS granter_first_name, g.last_name AS granter_last_name
       FROM quiz_student_overrides o
       INNER JOIN users u ON u.id = o.student_id
       INNER JOIN users g ON g.id = o.granted_by
       WHERE o.quiz_id = :quizId
       ORDER BY o.updated_at DESC`,
      { quizId }
    );
  },

  async upsert({
    quizId,
    studentId,
    extendedDueAt = null,
    extraAttempts = 0,
    reason = null,
    grantedBy,
  }) {
    await query(
      `INSERT INTO quiz_student_overrides
         (quiz_id, student_id, extended_due_at, extra_attempts, reason, granted_by)
       VALUES
         (:quizId, :studentId, :extendedDueAt, :extraAttempts, :reason, :grantedBy)
       ON DUPLICATE KEY UPDATE
         extended_due_at = VALUES(extended_due_at),
         extra_attempts = VALUES(extra_attempts),
         reason = VALUES(reason),
         granted_by = VALUES(granted_by),
         updated_at = CURRENT_TIMESTAMP`,
      {
        quizId,
        studentId,
        extendedDueAt,
        extraAttempts: Math.max(0, Number(extraAttempts) || 0),
        reason: reason || null,
        grantedBy,
      }
    );
    return this.findByQuizAndStudent(quizId, studentId);
  },

  async remove(quizId, studentId) {
    await query(
      `DELETE FROM quiz_student_overrides
       WHERE quiz_id = :quizId AND student_id = :studentId`,
      { quizId, studentId }
    );
    return true;
  },
};

export default QuizStudentOverrideModel;
