import { query } from '../config/db.js';

const CourseModel = {
  async create(data) {
    const result = await query(
      `INSERT INTO courses (title, description, subject, grade_level, cover_image, teacher_id, is_published)
       VALUES (:title, :description, :subject, :gradeLevel, :coverImage, :teacherId, :isPublished)`,
      {
        title: data.title,
        description: data.description || null,
        subject: data.subject,
        gradeLevel: data.gradeLevel || null,
        coverImage: data.coverImage || null,
        teacherId: data.teacherId,
        isPublished: data.isPublished ? 1 : 0,
      }
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    const rows = await query(
      `SELECT c.*, u.first_name AS teacher_first_name, u.last_name AS teacher_last_name,
              (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS lesson_count,
              (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.course_id = c.id) AS enrollment_count
       FROM courses c
       INNER JOIN users u ON u.id = c.teacher_id
       WHERE c.id = :id
       LIMIT 1`,
      { id }
    );
    return rows[0] || null;
  },

  async findAll({ teacherId, publishedOnly, search, page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const filters = [];
    const params = { limit: Number(limit), offset: Number(offset) };

    if (teacherId) {
      filters.push('c.teacher_id = :teacherId');
      params.teacherId = teacherId;
    }

    if (publishedOnly) {
      filters.push('c.is_published = 1');
    }

    if (search) {
      filters.push('(c.title LIKE :search OR c.subject LIKE :search OR c.description LIKE :search)');
      params.search = `%${search}%`;
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const rows = await query(
      `SELECT c.*, u.first_name AS teacher_first_name, u.last_name AS teacher_last_name,
              (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS lesson_count
       FROM courses c
       INNER JOIN users u ON u.id = c.teacher_id
       ${where}
       ORDER BY c.created_at DESC
       LIMIT :limit OFFSET :offset`,
      params
    );

    const countRows = await query(
      `SELECT COUNT(*) AS total FROM courses c ${where}`,
      params
    );

    return { courses: rows, total: countRows[0].total };
  },

  async update(id, data) {
    const mapping = {
      title: 'title',
      description: 'description',
      subject: 'subject',
      gradeLevel: 'grade_level',
      coverImage: 'cover_image',
      isPublished: 'is_published',
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

    await query(`UPDATE courses SET ${sets.join(', ')} WHERE id = :id`, params);
    return this.findById(id);
  },

  async delete(id) {
    await query('DELETE FROM courses WHERE id = :id', { id });
    return true;
  },

  async enroll(courseId, studentId) {
    await query(
      `INSERT INTO course_enrollments (course_id, student_id)
       VALUES (:courseId, :studentId)
       ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
      { courseId, studentId }
    );
    return true;
  },

  async getEnrollments(courseId) {
    return query(
      `SELECT ce.*, u.first_name, u.last_name, u.email, sp.xp, sp.level
       FROM course_enrollments ce
       INNER JOIN users u ON u.id = ce.student_id
       LEFT JOIN student_profiles sp ON sp.user_id = ce.student_id
       WHERE ce.course_id = :courseId
       ORDER BY ce.enrolled_at DESC`,
      { courseId }
    );
  },

  async getStudentCourses(studentId) {
    return query(
      `SELECT c.*, ce.progress_percent, ce.enrolled_at,
              u.first_name AS teacher_first_name, u.last_name AS teacher_last_name
       FROM course_enrollments ce
       INNER JOIN courses c ON c.id = ce.course_id
       INNER JOIN users u ON u.id = c.teacher_id
       WHERE ce.student_id = :studentId
       ORDER BY ce.enrolled_at DESC`,
      { studentId }
    );
  },

  async isEnrolled(courseId, studentId) {
    const rows = await query(
      `SELECT id FROM course_enrollments
       WHERE course_id = :courseId AND student_id = :studentId
       LIMIT 1`,
      { courseId, studentId }
    );
    return Boolean(rows[0]);
  },

  async updateProgress(courseId, studentId, progressPercent) {
    await query(
      `UPDATE course_enrollments
       SET progress_percent = :progressPercent
       WHERE course_id = :courseId AND student_id = :studentId`,
      { courseId, studentId, progressPercent }
    );
  },
};

export default CourseModel;
