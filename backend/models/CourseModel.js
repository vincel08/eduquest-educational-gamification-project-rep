import { query } from "../config/db.js";
import {
  appendStudentRosterFilters,
  hasRosterFilters,
} from "../utils/rosterFilters.js";

const CourseModel = {
  async create(data) {
    const result = await query(
      `INSERT INTO courses (
         title, description, subject, grade_level, school_year, ends_at,
         cover_image, teacher_id, is_published
       )
       VALUES (
         :title, :description, :subject, :gradeLevel, :schoolYear, :endsAt,
         :coverImage, :teacherId, :isPublished
       )`,
      {
        title: data.title,
        description: data.description || null,
        subject: data.subject,
        gradeLevel: data.gradeLevel || null,
        schoolYear: data.schoolYear || null,
        endsAt: data.endsAt || null,
        coverImage: data.coverImage || null,
        teacherId: data.teacherId,
        isPublished: data.isPublished ? 1 : 0,
      },
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
      { id },
    );
    return rows[0] || null;
  },

  async findAll({
    teacherId,
    publishedOnly,
    search,
    gradeLevel,
    schoolYear,
    page = 1,
    limit = 20,
  } = {}) {
    const offset = (page - 1) * limit;
    const filters = [];
    const params = { limit: Number(limit), offset: Number(offset) };

    if (teacherId) {
      filters.push("c.teacher_id = :teacherId");
      params.teacherId = teacherId;
    }

    if (publishedOnly) {
      filters.push("c.is_published = 1");
    }

    if (gradeLevel) {
      filters.push("c.grade_level = :gradeLevel");
      params.gradeLevel = gradeLevel;
    }

    if (schoolYear && schoolYear !== "all") {
      filters.push("c.school_year = :schoolYear");
      params.schoolYear = schoolYear;
    }

    if (search) {
      filters.push(
        "(c.title LIKE :search OR c.subject LIKE :search OR c.description LIKE :search)",
      );
      params.search = `%${search}%`;
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const rows = await query(
      `SELECT c.*, u.first_name AS teacher_first_name, u.last_name AS teacher_last_name,
              (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS lesson_count
       FROM courses c
       INNER JOIN users u ON u.id = c.teacher_id
       ${where}
       ORDER BY c.created_at DESC
       LIMIT :limit OFFSET :offset`,
      params,
    );

    const countRows = await query(
      `SELECT COUNT(*) AS total FROM courses c ${where}`,
      params,
    );

    return { courses: rows, total: countRows[0].total };
  },

  async update(id, data) {
    const mapping = {
      title: "title",
      description: "description",
      subject: "subject",
      gradeLevel: "grade_level",
      schoolYear: "school_year",
      endsAt: "ends_at",
      coverImage: "cover_image",
      teacherId: "teacher_id",
      isPublished: "is_published",
      updatedBy: "updated_by",
    };

    const sets = [];
    const params = { id };

    for (const [key, column] of Object.entries(mapping)) {
      if (data[key] !== undefined) {
        sets.push(`${column} = :${key}`);
        params[key] =
          key === "isPublished" ? (data[key] ? 1 : 0) : data[key];
      }
    }

    if (!sets.length) {
      return this.findById(id);
    }

    await query(`UPDATE courses SET ${sets.join(", ")} WHERE id = :id`, params);
    return this.findById(id);
  },

  async delete(id) {
    await query("DELETE FROM courses WHERE id = :id", { id });
    return true;
  },

  async enroll(courseId, studentId) {
    await query(
      `INSERT INTO course_enrollments (course_id, student_id, school_year)
       SELECT :courseId, :studentId, c.school_year
       FROM courses c
       WHERE c.id = :courseId
       ON DUPLICATE KEY UPDATE
         school_year = COALESCE(course_enrollments.school_year, VALUES(school_year)),
         updated_at = CURRENT_TIMESTAMP`,
      { courseId, studentId },
    );
    return true;
  },

  async findEnrollment(courseId, studentId) {
    const rows = await query(
      `SELECT *
       FROM course_enrollments
       WHERE course_id = :courseId AND student_id = :studentId
       LIMIT 1`,
      { courseId, studentId },
    );
    return rows[0] || null;
  },

  async unenroll(courseId, studentId) {
    const result = await query(
      `DELETE FROM course_enrollments
       WHERE course_id = :courseId AND student_id = :studentId`,
      { courseId, studentId },
    );
    return Number(result?.affectedRows) > 0;
  },

  /**
   * Drop current-year enrollments that no longer match the student's grade.
   * Enrollments from another school year stay so those records remain available.
   */
  async unenrollWherePlacementMismatch(
    studentId,
    { gradeLevel, schoolYear } = {},
  ) {
    if (!gradeLevel) return [];

    const params = { studentId, gradeLevel };
    const filters = [
      "ce.student_id = :studentId",
      "(c.grade_level IS NOT NULL AND TRIM(c.grade_level) <> '' AND c.grade_level <> :gradeLevel)",
    ];
    if (schoolYear) {
      params.schoolYear = schoolYear;
      filters.push(`(
        COALESCE(NULLIF(TRIM(ce.school_year), ''), NULLIF(TRIM(c.school_year), '')) IS NULL
        OR COALESCE(NULLIF(TRIM(ce.school_year), ''), c.school_year) = :schoolYear
      )`);
    }

    const whereSql = filters.join(" AND ");
    const rows = await query(
      `SELECT c.id, c.title, c.subject, c.grade_level, c.school_year
       FROM course_enrollments ce
       INNER JOIN courses c ON c.id = ce.course_id
       WHERE ${whereSql}`,
      params,
    );
    if (!rows.length) return [];

    await query(
      `DELETE ce
       FROM course_enrollments ce
       INNER JOIN courses c ON c.id = ce.course_id
       WHERE ${whereSql}`,
      params,
    );
    return rows;
  },

  async getEnrollments(courseId, rosterFilters = {}) {
    const filters = ["ce.course_id = :courseId"];
    const params = { courseId };
    if (hasRosterFilters(rosterFilters)) {
      appendStudentRosterFilters(filters, params, rosterFilters, "sp");
    }

    return query(
      `SELECT ce.*, u.username, u.first_name, u.last_name, u.email,
              sp.xp, sp.level, sp.grade_level, sp.section, sp.school_year
       FROM course_enrollments ce
       INNER JOIN users u ON u.id = ce.student_id
       LEFT JOIN student_profiles sp ON sp.user_id = ce.student_id
       WHERE ${filters.join(" AND ")}
       ORDER BY ce.enrolled_at DESC`,
      params,
    );
  },

  async listTeacherSections(teacherId, { schoolYear, gradeLevel } = {}) {
    const filters = [
      "c.teacher_id = :teacherId",
      "sp.section IS NOT NULL",
      "TRIM(sp.section) <> ''",
      "u.is_active = 1",
    ];
    const params = { teacherId };
    appendStudentRosterFilters(
      filters,
      params,
      { schoolYear, gradeLevel },
      "sp",
    );

    const rows = await query(
      `SELECT DISTINCT sp.section AS section
       FROM course_enrollments ce
       INNER JOIN courses c ON c.id = ce.course_id
       INNER JOIN student_profiles sp ON sp.user_id = ce.student_id
       INNER JOIN users u ON u.id = ce.student_id
       WHERE ${filters.join(" AND ")}
       ORDER BY sp.section ASC`,
      params,
    );
    return rows.map((row) => row.section).filter(Boolean);
  },

  async getStudentCourses(
    studentId,
    { gradeLevel = null, schoolYear = null } = {},
  ) {
    const params = { studentId };
    const filters = ["ce.student_id = :studentId"];
    if (gradeLevel) {
      filters.push("c.grade_level = :gradeLevel");
      params.gradeLevel = gradeLevel;
    }
    if (schoolYear) {
      filters.push("c.school_year = :schoolYear");
      params.schoolYear = schoolYear;
    }
    return query(
      `SELECT c.*, ce.progress_percent, ce.enrolled_at,
              u.first_name AS teacher_first_name, u.last_name AS teacher_last_name
       FROM course_enrollments ce
       INNER JOIN courses c ON c.id = ce.course_id
       INNER JOIN users u ON u.id = c.teacher_id
       WHERE ${filters.join(" AND ")}
       ORDER BY ce.enrolled_at DESC`,
      params,
    );
  },

  async isEnrolled(courseId, studentId) {
    const rows = await query(
      `SELECT id FROM course_enrollments
       WHERE course_id = :courseId AND student_id = :studentId
       LIMIT 1`,
      { courseId, studentId },
    );
    return Boolean(rows[0]);
  },

  async isStudentInTeacherRoster(studentId, teacherId) {
    const rows = await query(
      `SELECT 1 AS ok
       FROM course_enrollments ce
       INNER JOIN courses c ON c.id = ce.course_id
       WHERE ce.student_id = :studentId
         AND c.teacher_id = :teacherId
       LIMIT 1`,
      { studentId, teacherId },
    );
    return Boolean(rows[0]);
  },

  async updateProgress(courseId, studentId, progressPercent) {
    await query(
      `UPDATE course_enrollments
       SET progress_percent = :progressPercent
       WHERE course_id = :courseId AND student_id = :studentId`,
      { courseId, studentId, progressPercent },
    );
  },

  async listMissingJoinCodes() {
    return query(
      `SELECT id FROM courses
       WHERE join_code IS NULL OR TRIM(join_code) = ''
       ORDER BY id ASC`,
    );
  },

  async setJoinCode(courseId, joinCode) {
    await query(
      `UPDATE courses
       SET join_code = :joinCode
       WHERE id = :courseId
         AND (join_code IS NULL OR TRIM(join_code) = '')`,
      { courseId, joinCode },
    );
  },

  async findByJoinCode(joinCode) {
    const rows = await query(
      `SELECT c.*, u.first_name AS teacher_first_name, u.last_name AS teacher_last_name
       FROM courses c
       INNER JOIN users u ON u.id = c.teacher_id
       WHERE c.join_code = :joinCode
       LIMIT 1`,
      { joinCode },
    );
    return rows[0] || null;
  },

  async findJoinRequest(courseId, studentId) {
    const rows = await query(
      `SELECT * FROM course_join_requests
       WHERE course_id = :courseId AND student_id = :studentId
       LIMIT 1`,
      { courseId, studentId },
    );
    return rows[0] || null;
  },

  async findJoinRequestById(requestId) {
    const rows = await query(
      `SELECT r.*, u.first_name, u.last_name, u.username, u.email,
              sp.grade_level, sp.section, sp.school_year
       FROM course_join_requests r
       INNER JOIN users u ON u.id = r.student_id
       LEFT JOIN student_profiles sp ON sp.user_id = r.student_id
       WHERE r.id = :requestId
       LIMIT 1`,
      { requestId },
    );
    return rows[0] || null;
  },

  async upsertJoinRequest(courseId, studentId) {
    await query(
      `INSERT INTO course_join_requests (course_id, student_id, status, reviewed_by, reviewed_at)
       VALUES (:courseId, :studentId, 'pending', NULL, NULL)
       ON DUPLICATE KEY UPDATE
         status = 'pending',
         reviewed_by = NULL,
         reviewed_at = NULL`,
      { courseId, studentId },
    );
    return this.findJoinRequest(courseId, studentId);
  },

  async listJoinRequests(courseId, status = null) {
    const filters = ["r.course_id = :courseId"];
    const params = { courseId };
    if (status) {
      filters.push("r.status = :status");
      params.status = status;
    }
    return query(
      `SELECT r.*, u.first_name, u.last_name, u.username, u.email,
              sp.grade_level, sp.section, sp.school_year
       FROM course_join_requests r
       INNER JOIN users u ON u.id = r.student_id
       LEFT JOIN student_profiles sp ON sp.user_id = r.student_id
       WHERE ${filters.join(" AND ")}
       ORDER BY r.created_at ASC`,
      params,
    );
  },

  async listStudentJoinRequests(studentId) {
    return query(
      `SELECT r.id, r.course_id, r.status, r.created_at, r.reviewed_at,
              c.subject, c.title, c.grade_level, c.school_year
       FROM course_join_requests r
       INNER JOIN courses c ON c.id = r.course_id
       WHERE r.student_id = :studentId
       ORDER BY r.created_at DESC`,
      { studentId },
    );
  },

  async reviewJoinRequest(requestId, { status, reviewedBy }) {
    await query(
      `UPDATE course_join_requests
       SET status = :status,
           reviewed_by = :reviewedBy,
           reviewed_at = NOW()
       WHERE id = :requestId`,
      { requestId, status, reviewedBy },
    );
    return this.findJoinRequestById(requestId);
  },
};

export default CourseModel;
