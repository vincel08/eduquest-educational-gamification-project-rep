import { query } from "../config/db.js";
import {
  appendStudentRosterFilters,
  normalizeRosterFilterValue,
} from "../utils/rosterFilters.js";
import { normalizeSection } from "../utils/classSections.js";

const ClassSectionModel = {
  async create({ schoolYear, gradeLevel, name, adviserId = null }) {
    const result = await query(
      `INSERT INTO class_sections (school_year, grade_level, name, adviser_id)
       VALUES (:schoolYear, :gradeLevel, :name, :adviserId)`,
      {
        schoolYear,
        gradeLevel,
        name,
        adviserId,
      },
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    const rows = await query(
      `SELECT cs.*,
              u.first_name AS adviser_first_name,
              u.last_name AS adviser_last_name,
              u.email AS adviser_email
       FROM class_sections cs
       LEFT JOIN users u ON u.id = cs.adviser_id
       WHERE cs.id = :id
       LIMIT 1`,
      { id },
    );
    return rows[0] || null;
  },

  async findAll({ schoolYear, gradeLevel, page = 1, limit = 100 } = {}) {
    const offset = (page - 1) * limit;
    const filters = [];
    const params = { limit: Number(limit), offset: Number(offset) };

    const sy = normalizeRosterFilterValue(schoolYear);
    const grade = normalizeRosterFilterValue(gradeLevel);
    if (sy) {
      filters.push("cs.school_year = :schoolYear");
      params.schoolYear = sy;
    }
    if (grade) {
      filters.push("cs.grade_level = :gradeLevel");
      params.gradeLevel = grade;
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const rows = await query(
      `SELECT cs.*,
              u.first_name AS adviser_first_name,
              u.last_name AS adviser_last_name,
              u.email AS adviser_email
       FROM class_sections cs
       LEFT JOIN users u ON u.id = cs.adviser_id
       ${where}
       ORDER BY cs.school_year DESC, cs.grade_level ASC, cs.name ASC
       LIMIT :limit OFFSET :offset`,
      params,
    );

    const countRows = await query(
      `SELECT COUNT(*) AS total FROM class_sections cs ${where}`,
      params,
    );

    return { sections: rows, total: countRows[0].total };
  },

  async findByIdentity(schoolYear, gradeLevel, name) {
    const normalizedName = normalizeSection(name);
    if (!normalizedName) return null;
    const rows = await query(
      `SELECT * FROM class_sections
       WHERE school_year = :schoolYear
         AND grade_level = :gradeLevel
         AND LOWER(name) = LOWER(:name)
       LIMIT 1`,
      { schoolYear, gradeLevel, name: normalizedName },
    );
    return rows[0] || null;
  },

  async listNames({ schoolYear, gradeLevel } = {}) {
    const filters = [];
    const params = {};
    const sy = normalizeRosterFilterValue(schoolYear);
    const grade = normalizeRosterFilterValue(gradeLevel);
    if (sy) {
      filters.push("school_year = :schoolYear");
      params.schoolYear = sy;
    }
    if (grade) {
      filters.push("grade_level = :gradeLevel");
      params.gradeLevel = grade;
    }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const rows = await query(
      `SELECT DISTINCT name
       FROM class_sections
       ${where}
       ORDER BY name ASC`,
      params,
    );
    return rows.map((row) => row.name).filter(Boolean);
  },

  async update(id, { schoolYear, gradeLevel, name, adviserId }) {
    const sets = [];
    const params = { id };

    if (schoolYear !== undefined) {
      sets.push("school_year = :schoolYear");
      params.schoolYear = schoolYear;
    }
    if (gradeLevel !== undefined) {
      sets.push("grade_level = :gradeLevel");
      params.gradeLevel = gradeLevel;
    }
    if (name !== undefined) {
      sets.push("name = :name");
      params.name = name;
    }
    if (adviserId !== undefined) {
      sets.push("adviser_id = :adviserId");
      params.adviserId = adviserId;
    }

    if (!sets.length) {
      return this.findById(id);
    }

    await query(
      `UPDATE class_sections SET ${sets.join(", ")} WHERE id = :id`,
      params,
    );
    return this.findById(id);
  },

  async delete(id) {
    await query("DELETE FROM class_sections WHERE id = :id", { id });
    return true;
  },

  async countStudentsUsing(schoolYear, gradeLevel, name) {
    const filters = [
      "sp.section = :name",
      "u.role = 'student'",
      "u.is_active = 1",
    ];
    const params = { name: normalizeSection(name) };
    appendStudentRosterFilters(
      filters,
      params,
      { schoolYear, gradeLevel },
      "sp",
    );
    const rows = await query(
      `SELECT COUNT(*) AS total
       FROM student_profiles sp
       INNER JOIN users u ON u.id = sp.user_id
       WHERE ${filters.join(" AND ")}`,
      params,
    );
    return Number(rows[0]?.total || 0);
  },
};

export default ClassSectionModel;
