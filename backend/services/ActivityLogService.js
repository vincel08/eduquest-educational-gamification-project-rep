import ActivityLogModel from '../models/ActivityLogModel.js';
import { query } from '../config/db.js';
import {
  appendStudentRosterFilters,
  hasRosterFilters,
} from '../utils/rosterFilters.js';

function actorName(row) {
  if (!row) return null;
  const name = `${row.actor_first_name || ''} ${row.actor_last_name || ''}`.trim();
  if (name) return name;
  return row.actor_username || row.actor_email || null;
}

function serializeAuditRow(row) {
  let metadata = null;
  if (row.metadata_json != null) {
    if (typeof row.metadata_json === 'object') {
      metadata = row.metadata_json;
    } else {
      try {
        metadata = JSON.parse(row.metadata_json);
      } catch {
        metadata = null;
      }
    }
  }

  return {
    id: `audit-${row.id}`,
    source: 'audit',
    action: row.action,
    summary: row.summary,
    entityType: row.entity_type,
    entityId: row.entity_id,
    actorId: row.actor_id,
    actorName: actorName(row),
    actorRole: row.actor_role || null,
    metadata,
    createdAt: row.created_at,
  };
}

function serializePlatformRow(row) {
  return {
    id: `platform-${row.source_key}`,
    source: 'platform',
    action: row.action,
    summary: row.summary,
    entityType: row.entity_type,
    entityId: row.entity_id,
    actorId: row.actor_id,
    actorName: row.actor_name || null,
    actorRole: row.actor_role || null,
    metadata: row.metadata || null,
    createdAt: row.created_at,
  };
}

const ActivityLogService = {
  /**
   * Fire-and-forget audit write. Never throws to callers.
   */
  async log({
    actorId = null,
    action,
    entityType = null,
    entityId = null,
    summary,
    metadata = null,
  }) {
    try {
      if (!action || !summary) return null;
      return await ActivityLogModel.create({
        actorId,
        action,
        entityType,
        entityId,
        summary,
        metadata,
      });
    } catch (error) {
      console.error('[activity_logs] failed to write', error?.message || error);
      return null;
    }
  },

  async listAdminActivity({
    action = 'all',
    search = '',
    page = 1,
    limit = 40,
    includePlatform = true,
    schoolYear = null,
    gradeLevel = null,
    section = null,
  } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 40, 1), 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const offset = (safePage - 1) * safeLimit;
    const roster = { schoolYear, gradeLevel, section };

    const { rows: auditRows, total: auditTotal } = await ActivityLogModel.list({
      action,
      search,
      limit: safeLimit,
      offset,
      ...roster,
    });

    const items = auditRows.map(serializeAuditRow);

    if (includePlatform && (action === 'all' || String(action).startsWith('platform.'))) {
      const platform = await this.listPlatformEvents({
        limit: safeLimit,
        search,
        action,
        ...roster,
      });
      const merged = [...items, ...platform]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, safeLimit);

      return {
        items: merged,
        total: auditTotal + platform.length,
        page: safePage,
        limit: safeLimit,
        actions: this.listActionFilters(),
      };
    }

    return {
      items,
      total: auditTotal,
      page: safePage,
      limit: safeLimit,
      actions: this.listActionFilters(),
    };
  },

  listActionFilters() {
    return [
      { value: 'all', label: 'All activity' },
      { value: 'user.created', label: 'User created' },
      { value: 'user.updated', label: 'User updated' },
      { value: 'user.deleted', label: 'User deleted' },
      { value: 'user.password_reset', label: 'Password reset' },
      { value: 'section.created', label: 'Section created' },
      { value: 'section.updated', label: 'Section updated' },
      { value: 'section.deleted', label: 'Section deleted' },
      { value: 'badge.created', label: 'Badge created' },
      { value: 'badge.updated', label: 'Badge updated' },
      { value: 'badge.awarded', label: 'Badge awarded' },
      { value: 'course.created', label: 'Subject created' },
      { value: 'course.updated', label: 'Subject updated' },
      { value: 'course.deleted', label: 'Subject deleted' },
      { value: 'platform.xp', label: 'XP earned' },
      { value: 'platform.quiz', label: 'Quiz completed' },
      { value: 'platform.game', label: 'Game scored' },
    ];
  },

  async listPlatformEvents({
    limit = 40,
    search = '',
    action = 'all',
    schoolYear = null,
    gradeLevel = null,
    section = null,
  } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 40, 1), 80);
    const like = search && String(search).trim() ? `%${String(search).trim()}%` : null;
    const events = [];
    const roster = { schoolYear, gradeLevel, section };
    const rosterActive = hasRosterFilters(roster);

    const wantXp = action === 'all' || action === 'platform.xp';
    const wantQuiz = action === 'all' || action === 'platform.quiz';
    const wantGame = action === 'all' || action === 'platform.game';

    if (wantXp) {
      const xpFilters = ['1=1'];
      const xpParams = { limit: safeLimit };
      if (like) {
        xpFilters.push(
          `(xt.description LIKE :search OR u.first_name LIKE :search OR u.last_name LIKE :search OR u.username LIKE :search)`,
        );
        xpParams.search = like;
      }
      let xpJoin = 'INNER JOIN users u ON u.id = xt.student_id';
      if (rosterActive) {
        xpJoin += ' INNER JOIN student_profiles sp ON sp.user_id = xt.student_id';
        appendStudentRosterFilters(xpFilters, xpParams, roster, 'sp');
      }
      const xpRows = await query(
        `SELECT xt.id, xt.student_id, xt.amount, xt.source_type, xt.description, xt.created_at,
                u.first_name, u.last_name, u.username, u.role
         FROM xp_transactions xt
         ${xpJoin}
         WHERE ${xpFilters.join(' AND ')}
         ORDER BY xt.created_at DESC
         LIMIT :limit`,
        xpParams,
      );
      for (const row of xpRows) {
        const name = `${row.first_name || ''} ${row.last_name || ''}`.trim()
          || row.username
          || `Student #${row.student_id}`;
        events.push(
          serializePlatformRow({
            source_key: `xp-${row.id}`,
            action: 'platform.xp',
            summary: `${name} earned +${row.amount} XP${row.description ? ` (${row.description})` : ''}`,
            entity_type: 'xp_transaction',
            entity_id: row.id,
            actor_id: row.student_id,
            actor_name: name,
            actor_role: row.role,
            metadata: { amount: row.amount, sourceType: row.source_type },
            created_at: row.created_at,
          }),
        );
      }
    }

    if (wantQuiz) {
      const quizFilters = ['qa.completed_at IS NOT NULL'];
      const quizParams = { limit: safeLimit };
      if (like) {
        quizFilters.push(
          `(q.title LIKE :search OR u.first_name LIKE :search OR u.last_name LIKE :search OR u.username LIKE :search)`,
        );
        quizParams.search = like;
      }
      let quizJoin = `INNER JOIN quizzes q ON q.id = qa.quiz_id
         INNER JOIN users u ON u.id = qa.student_id`;
      if (rosterActive) {
        quizJoin += ' INNER JOIN student_profiles sp ON sp.user_id = qa.student_id';
        appendStudentRosterFilters(quizFilters, quizParams, roster, 'sp');
      }
      const quizRows = await query(
        `SELECT qa.id, qa.student_id, qa.score, qa.is_passed, qa.completed_at,
                q.title AS quiz_title,
                u.first_name, u.last_name, u.username, u.role
         FROM quiz_attempts qa
         ${quizJoin}
         WHERE ${quizFilters.join(' AND ')}
         ORDER BY qa.completed_at DESC
         LIMIT :limit`,
        quizParams,
      );
      for (const row of quizRows) {
        const name = `${row.first_name || ''} ${row.last_name || ''}`.trim()
          || row.username
          || `Student #${row.student_id}`;
        const score = Number(row.score || 0).toFixed(0);
        events.push(
          serializePlatformRow({
            source_key: `quiz-${row.id}`,
            action: 'platform.quiz',
            summary: `${name} completed "${row.quiz_title}" · ${score}%${row.is_passed ? ' (passed)' : ''}`,
            entity_type: 'quiz_attempt',
            entity_id: row.id,
            actor_id: row.student_id,
            actor_name: name,
            actor_role: row.role,
            metadata: { score: Number(row.score), passed: Boolean(row.is_passed) },
            created_at: row.completed_at,
          }),
        );
      }
    }

    if (wantGame) {
      const gameFilters = ['1=1'];
      const gameParams = { limit: safeLimit };
      if (like) {
        gameFilters.push(
          `(g.title LIKE :search OR u.first_name LIKE :search OR u.last_name LIKE :search OR u.username LIKE :search)`,
        );
        gameParams.search = like;
      }
      let gameJoin = `INNER JOIN educational_games g ON g.id = gs.game_id
         INNER JOIN users u ON u.id = gs.student_id`;
      if (rosterActive) {
        gameJoin += ' INNER JOIN student_profiles sp ON sp.user_id = gs.student_id';
        appendStudentRosterFilters(gameFilters, gameParams, roster, 'sp');
      }
      const gameRows = await query(
        `SELECT gs.id, gs.student_id, gs.score, gs.created_at,
                g.title AS game_title,
                u.first_name, u.last_name, u.username, u.role
         FROM game_scores gs
         ${gameJoin}
         WHERE ${gameFilters.join(' AND ')}
         ORDER BY gs.created_at DESC
         LIMIT :limit`,
        gameParams,
      );
      for (const row of gameRows) {
        const name = `${row.first_name || ''} ${row.last_name || ''}`.trim()
          || row.username
          || `Student #${row.student_id}`;
        const score = Number(row.score || 0).toFixed(0);
        events.push(
          serializePlatformRow({
            source_key: `game-${row.id}`,
            action: 'platform.game',
            summary: `${name} scored ${score}% on "${row.game_title}"`,
            entity_type: 'game_score',
            entity_id: row.id,
            actor_id: row.student_id,
            actor_name: name,
            actor_role: row.role,
            metadata: { score: Number(row.score) },
            created_at: row.created_at,
          }),
        );
      }
    }

    return events
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, safeLimit);
  },
};

export default ActivityLogService;
