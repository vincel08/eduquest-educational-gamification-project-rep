import { query } from '../config/db.js';
import {
  appendStudentRosterFilters,
  hasRosterFilters,
  normalizeRosterFilterValue,
} from '../utils/rosterFilters.js';

const ActivityLogModel = {
  async create({
    actorId = null,
    action,
    entityType = null,
    entityId = null,
    summary,
    metadata = null,
  }) {
    const metadataJson =
      metadata == null ? null : JSON.stringify(metadata);
    const result = await query(
      `INSERT INTO activity_logs (
         actor_id, action, entity_type, entity_id, summary, metadata_json
       ) VALUES (
         :actorId, :action, :entityType, :entityId, :summary, :metadataJson
       )`,
      {
        actorId: actorId == null ? null : Number(actorId),
        action: String(action).slice(0, 64),
        entityType: entityType ? String(entityType).slice(0, 64) : null,
        entityId: entityId == null ? null : Number(entityId),
        summary: String(summary || '').slice(0, 500),
        metadataJson,
      },
    );
    return result.insertId;
  },

  async list({
    action = null,
    search = null,
    limit = 50,
    offset = 0,
    schoolYear = null,
    gradeLevel = null,
    section = null,
  } = {}) {
    const filters = [];
    const params = {
      limit: Math.min(Math.max(Number(limit) || 50, 1), 100),
      offset: Math.max(Number(offset) || 0, 0),
    };
    const roster = { schoolYear, gradeLevel, section };
    const rosterActive = hasRosterFilters(roster);
    const sy = normalizeRosterFilterValue(schoolYear);
    const grade = normalizeRosterFilterValue(gradeLevel);

    if (action && action !== 'all') {
      filters.push('al.action = :action');
      params.action = String(action);
    }

    if (search && String(search).trim()) {
      filters.push(
        `(al.summary LIKE :search
          OR u.first_name LIKE :search
          OR u.last_name LIKE :search
          OR u.email LIKE :search
          OR u.username LIKE :search)`,
      );
      params.search = `%${String(search).trim()}%`;
    }

    let entityJoin = '';
    if (rosterActive) {
      entityJoin = `LEFT JOIN users eu ON al.entity_type = 'user' AND eu.id = al.entity_id`;

      const studentRoster = [];
      appendStudentRosterFilters(studentRoster, params, roster, 'sp_scope');
      const studentRosterSql = studentRoster.join(' AND ');

      const sectionRoster = [];
      if (sy) {
        sectionRoster.push('cs.school_year = :rosterSchoolYear');
      }
      if (grade) {
        sectionRoster.push('cs.grade_level = :rosterGradeLevel');
      }
      // Section name filter applies to class_sections.name when set.
      const sectionName = normalizeRosterFilterValue(section);
      if (sectionName) {
        sectionRoster.push('cs.name = :rosterSection');
      }
      const sectionRosterSql = sectionRoster.length
        ? sectionRoster.join(' AND ')
        : '1=1';

      filters.push(`(
        (
          al.entity_type = 'user'
          AND eu.role = 'student'
          AND EXISTS (
            SELECT 1 FROM student_profiles sp_scope
            WHERE sp_scope.user_id = al.entity_id
              AND ${studentRosterSql}
          )
        )
        OR (
          al.action = 'badge.awarded'
          AND JSON_EXTRACT(al.metadata_json, '$.studentId') IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM student_profiles sp_scope
            WHERE sp_scope.user_id = CAST(
              JSON_UNQUOTE(JSON_EXTRACT(al.metadata_json, '$.studentId')) AS UNSIGNED
            )
              AND ${studentRosterSql}
          )
        )
        OR (
          al.entity_type = 'class_section'
          AND EXISTS (
            SELECT 1 FROM class_sections cs
            WHERE cs.id = al.entity_id
              AND ${sectionRosterSql}
          )
        )
        OR (
          al.entity_type = 'user'
          AND (eu.id IS NULL OR eu.role <> 'student')
        )
        OR (
          (al.entity_type IS NULL OR al.entity_type NOT IN ('user', 'class_section'))
          AND al.action <> 'badge.awarded'
        )
      )`);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const [rows, countRows] = await Promise.all([
      query(
        `SELECT al.id, al.actor_id, al.action, al.entity_type, al.entity_id,
                al.summary, al.metadata_json, al.created_at,
                u.first_name AS actor_first_name,
                u.last_name AS actor_last_name,
                u.role AS actor_role,
                u.email AS actor_email,
                u.username AS actor_username
         FROM activity_logs al
         LEFT JOIN users u ON u.id = al.actor_id
         ${entityJoin}
         ${where}
         ORDER BY al.created_at DESC, al.id DESC
         LIMIT :limit OFFSET :offset`,
        params,
      ),
      query(
        `SELECT COUNT(*) AS total
         FROM activity_logs al
         LEFT JOIN users u ON u.id = al.actor_id
         ${entityJoin}
         ${where}`,
        params,
      ),
    ]);

    return {
      rows,
      total: Number(countRows[0]?.total) || 0,
    };
  },
};

export default ActivityLogModel;
