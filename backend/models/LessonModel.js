import { query } from '../config/db.js';

const LessonModel = {
  async create(data) {
    const result = await query(
      `INSERT INTO lessons
       (course_id, title, content, summary, learning_objectives, order_index, xp_reward, estimated_minutes, is_published, created_by, updated_by)
       VALUES
       (:courseId, :title, :content, :summary, :learningObjectives, :orderIndex, :xpReward, :estimatedMinutes, :isPublished, :createdBy, :updatedBy)`,
      {
        courseId: data.courseId,
        title: data.title,
        content: data.content || null,
        summary: data.summary || null,
        learningObjectives: data.learningObjectives || null,
        orderIndex: data.orderIndex || 1,
        xpReward: data.xpReward || 25,
        estimatedMinutes: data.estimatedMinutes || null,
        isPublished: data.isPublished === false ? 0 : 1,
        createdBy: data.createdBy || null,
        updatedBy: data.updatedBy || data.createdBy || null,
      }
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    const rows = await query(
      `SELECT l.*, c.title AS course_title, c.teacher_id
       FROM lessons l
       INNER JOIN courses c ON c.id = l.course_id
       WHERE l.id = :id
       LIMIT 1`,
      { id }
    );
    return rows[0] || null;
  },

  async findByCourse(courseId) {
    return query(
      `SELECT * FROM lessons
       WHERE course_id = :courseId
       ORDER BY order_index ASC, id ASC`,
      { courseId }
    );
  },

  async update(id, data) {
    const mapping = {
      title: 'title',
      content: 'content',
      summary: 'summary',
      learningObjectives: 'learning_objectives',
      orderIndex: 'order_index',
      xpReward: 'xp_reward',
      estimatedMinutes: 'estimated_minutes',
      isPublished: 'is_published',
      updatedBy: 'updated_by',
    };

    const sets = [];
    const params = { id };

    for (const [key, column] of Object.entries(mapping)) {
      if (data[key] !== undefined) {
        sets.push(`${column} = :${key}`);
        params[key] = key === 'isPublished' ? (data[key] ? 1 : 0) : data[key];
      }
    }

    if (!sets.length) {
      return this.findById(id);
    }

    await query(`UPDATE lessons SET ${sets.join(', ')} WHERE id = :id`, params);
    return this.findById(id);
  },

  async delete(id) {
    await query('DELETE FROM lessons WHERE id = :id', { id });
    return true;
  },

  async getProgress(lessonId, studentId) {
    const rows = await query(
      `SELECT * FROM lesson_progress
       WHERE lesson_id = :lessonId AND student_id = :studentId
       LIMIT 1`,
      { lessonId, studentId }
    );
    return rows[0] || null;
  },

  async upsertProgress({ lessonId, studentId, status, xpEarned = 0, completedAt = null }) {
    await query(
      `INSERT INTO lesson_progress (lesson_id, student_id, status, xp_earned, completed_at)
       VALUES (:lessonId, :studentId, :status, :xpEarned, :completedAt)
       ON DUPLICATE KEY UPDATE
         status = VALUES(status),
         xp_earned = VALUES(xp_earned),
         completed_at = VALUES(completed_at)`,
      { lessonId, studentId, status, xpEarned, completedAt }
    );
    return this.getProgress(lessonId, studentId);
  },

  async getStudentProgressForCourse(courseId, studentId) {
    return query(
      `SELECT l.id, l.title, l.order_index, l.xp_reward,
              l.created_at, l.updated_at, l.is_published,
              COALESCE(lp.status, 'not_started') AS status,
              lp.xp_earned, lp.completed_at
       FROM lessons l
       LEFT JOIN lesson_progress lp
         ON lp.lesson_id = l.id AND lp.student_id = :studentId
       WHERE l.course_id = :courseId
       ORDER BY l.order_index ASC`,
      { courseId, studentId }
    );
  },

  async countCompleted(courseId, studentId) {
    const rows = await query(
      `SELECT
         (SELECT COUNT(*) FROM lessons WHERE course_id = :courseId AND is_published = 1) AS total,
         (SELECT COUNT(*) FROM lesson_progress lp
          INNER JOIN lessons l ON l.id = lp.lesson_id
          WHERE l.course_id = :courseId AND lp.student_id = :studentId AND lp.status = 'completed') AS completed`,
      { courseId, studentId }
    );
    return rows[0];
  },

  async addMaterial(data) {
    const result = await query(
      `INSERT INTO lesson_materials
       (lesson_id, file_name, original_name, file_type, file_size, file_path, uploaded_by)
       VALUES
       (:lessonId, :fileName, :originalName, :fileType, :fileSize, :filePath, :uploadedBy)`,
      data
    );
    return this.findMaterialById(result.insertId);
  },

  async findMaterialById(id) {
    const rows = await query('SELECT * FROM lesson_materials WHERE id = :id LIMIT 1', { id });
    return rows[0] || null;
  },

  async getMaterials(lessonId) {
    return query(
      `SELECT * FROM lesson_materials WHERE lesson_id = :lessonId ORDER BY created_at DESC`,
      { lessonId }
    );
  },

  async deleteMaterial(id) {
    await query('DELETE FROM lesson_materials WHERE id = :id', { id });
    return true;
  },
};

export default LessonModel;
