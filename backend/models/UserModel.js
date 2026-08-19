import { query } from '../config/db.js';
import { normalizeUsername } from '../utils/username.js';
import {
  appendStudentRosterFilters,
  normalizeRosterFilterValue,
} from '../utils/rosterFilters.js';

const USER_SELECT = `id, username, email, password_hash, recovery_code_hash, google_id, first_name, last_name, role, avatar_url, is_active, created_at, updated_at`;

const UserModel = {
  async create({
    username = null,
    email = null,
    passwordHash,
    firstName,
    lastName,
    role,
    googleId = null,
    avatarUrl = null,
    recoveryCodeHash = null,
  }) {
    const result = await query(
      `INSERT INTO users (
         username, email, password_hash, recovery_code_hash, google_id, first_name, last_name, role, avatar_url
       ) VALUES (
         :username, :email, :passwordHash, :recoveryCodeHash, :googleId, :firstName, :lastName, :role, :avatarUrl
       )`,
      {
        username: username ? normalizeUsername(username) : null,
        email: email ? String(email).toLowerCase() : null,
        passwordHash,
        recoveryCodeHash,
        googleId,
        firstName,
        lastName,
        role,
        avatarUrl,
      }
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    const rows = await query(
      `SELECT ${USER_SELECT}
       FROM users WHERE id = :id LIMIT 1`,
      { id }
    );
    return rows[0] || null;
  },

  async findByEmail(email) {
    if (!email) return null;
    const rows = await query(
      `SELECT ${USER_SELECT}
       FROM users WHERE email = :email LIMIT 1`,
      { email: String(email).toLowerCase() }
    );
    return rows[0] || null;
  },

  async findByUsername(username) {
    const normalized = normalizeUsername(username);
    if (!normalized) return null;
    const rows = await query(
      `SELECT ${USER_SELECT}
       FROM users WHERE username = :username LIMIT 1`,
      { username: normalized }
    );
    return rows[0] || null;
  },

  /**
   * Resolve login by email (contains @) or username.
   */
  async findByLoginIdentifier(identifier) {
    const value = String(identifier || '').trim();
    if (!value) return null;
    if (value.includes('@')) {
      return this.findByEmail(value);
    }
    return this.findByUsername(value);
  },

  async findAll({
    role,
    search,
    page = 1,
    limit = 20,
    schoolYear,
    gradeLevel,
    section,
  }) {
    const offset = (page - 1) * limit;
    const filters = [];
    const params = { limit: Number(limit), offset: Number(offset) };
    const roster = {
      schoolYear: normalizeRosterFilterValue(schoolYear),
      gradeLevel: normalizeRosterFilterValue(gradeLevel),
      section: normalizeRosterFilterValue(section),
    };
    const rosterActive = Boolean(
      roster.schoolYear || roster.gradeLevel || roster.section,
    );
    const sectionScopedTeachers = Boolean(roster.section);
    // Roster filters apply to students. Teachers/admins stay visible unless
    // the caller explicitly asks for role=student. When a section is selected,
    // teachers are limited to that section's adviser(s).
    const rosterStudentsOnly = rosterActive && role === "student";
    const rosterWithStaff = rosterActive && !role;
    const teachersOnlyScoped =
      sectionScopedTeachers && role === "teacher";

    if (role && !teachersOnlyScoped) {
      filters.push("u.role = :role");
      params.role = role;
    }

    if (search) {
      filters.push(
        "(u.first_name LIKE :search OR u.last_name LIKE :search OR u.email LIKE :search OR u.username LIKE :search)",
      );
      params.search = `%${search}%`;
    }

    const adviserExistsSql = (() => {
      if (!sectionScopedTeachers) return null;
      const adviserFilters = [
        "cs.adviser_id = u.id",
        "cs.name = :adviserSectionName",
      ];
      params.adviserSectionName = roster.section;
      if (roster.schoolYear) {
        adviserFilters.push("cs.school_year = :adviserSchoolYear");
        params.adviserSchoolYear = roster.schoolYear;
      }
      if (roster.gradeLevel) {
        adviserFilters.push("cs.grade_level = :adviserGradeLevel");
        params.adviserGradeLevel = roster.gradeLevel;
      }
      return `EXISTS (
        SELECT 1 FROM class_sections cs
        WHERE ${adviserFilters.join(" AND ")}
      )`;
    })();

    if (rosterStudentsOnly) {
      appendStudentRosterFilters(
        filters,
        params,
        { schoolYear, gradeLevel, section },
        "sp",
      );
    } else if (teachersOnlyScoped && adviserExistsSql) {
      filters.push("u.role = 'teacher'");
      filters.push(adviserExistsSql);
    } else if (rosterWithStaff) {
      const studentClauses = [];
      appendStudentRosterFilters(
        studentClauses,
        params,
        { schoolYear, gradeLevel, section },
        "sp",
      );
      const studentMatch = studentClauses.length
        ? `(u.role = 'student' AND ${studentClauses.join(" AND ")})`
        : "u.role = 'student'";

      if (sectionScopedTeachers && adviserExistsSql) {
        filters.push(
          `(u.role = 'administrator' OR ${studentMatch} OR (u.role = 'teacher' AND ${adviserExistsSql}))`,
        );
      } else {
        filters.push(`(u.role <> 'student' OR (${studentClauses.join(" AND ")}))`);
      }
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    // Always join profiles so admin user lists can show grade / section / SY.
    const joinSql = "LEFT JOIN student_profiles sp ON sp.user_id = u.id";

    const rows = await query(
      `SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.role, u.avatar_url, u.is_active, u.created_at, u.updated_at,
              sp.grade_level, sp.section, sp.school_year
       FROM users u
       ${joinSql}
       ${where}
       ORDER BY
         CASE u.role
           WHEN 'administrator' THEN 1
           WHEN 'teacher' THEN 2
           WHEN 'student' THEN 3
           ELSE 4
         END,
         u.last_name ASC,
         u.first_name ASC
       LIMIT :limit OFFSET :offset`,
      params,
    );

    const countRows = await query(
      `SELECT COUNT(*) AS total
       FROM users u
       ${joinSql}
       ${where}`,
      params,
    );

    return { users: rows, total: countRows[0].total };
  },

  async update(id, fields) {
    const allowed = [
      'username',
      'email',
      'first_name',
      'last_name',
      'avatar_url',
      'is_active',
      'role',
      'password_hash',
      'recovery_code_hash',
      'google_id',
    ];
    const sets = [];
    const params = { id };

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = :${key}`);
        params[key] = fields[key];
      }
    }

    if (!sets.length) {
      return this.findById(id);
    }

    await query(`UPDATE users SET ${sets.join(', ')} WHERE id = :id`, params);
    return this.findById(id);
  },

  async delete(id) {
    await query('DELETE FROM users WHERE id = :id', { id });
    return true;
  },

  async countByRole() {
    return query(
      `SELECT role, COUNT(*) AS count
       FROM users
       GROUP BY role`
    );
  },
};

export default UserModel;
