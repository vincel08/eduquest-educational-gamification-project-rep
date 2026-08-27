import { query } from '../config/db.js';

const GameModel = {
  async create(data) {
    const result = await query(
      `INSERT INTO educational_games
       (course_id, lesson_id, title, description, game_type, difficulty, estimated_time, game_data, xp_reward, is_ai_generated, is_published, created_by)
       VALUES
       (:courseId, :lessonId, :title, :description, :gameType, :difficulty, :estimatedTime, :gameData, :xpReward, :isAiGenerated, :isPublished, :createdBy)`,
      {
        courseId: data.courseId,
        lessonId: data.lessonId || null,
        title: data.title,
        description: data.description || null,
        gameType: data.gameType,
        difficulty: data.difficulty || 'medium',
        estimatedTime: data.estimatedTime || 10,
        gameData: JSON.stringify(data.gameData),
        xpReward: data.xpReward || 30,
        isAiGenerated: data.isAiGenerated ? 1 : 0,
        isPublished: data.isPublished ? 1 : 0,
        createdBy: data.createdBy,
      }
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    const rows = await query(
      `SELECT g.*, c.title AS course_title, c.teacher_id, l.title AS lesson_title
       FROM educational_games g
       INNER JOIN courses c ON c.id = g.course_id
       LEFT JOIN lessons l ON l.id = g.lesson_id
       WHERE g.id = :id
       LIMIT 1`,
      { id }
    );

    if (!rows[0]) return null;

    return {
      ...rows[0],
      game_data: typeof rows[0].game_data === 'string'
        ? JSON.parse(rows[0].game_data)
        : rows[0].game_data,
    };
  },

  async findByCourse(courseId, { publishedOnly = false } = {}) {
    const filter = publishedOnly ? 'AND is_published = 1' : '';
    const rows = await query(
      `SELECT * FROM educational_games
       WHERE course_id = :courseId ${filter}
       ORDER BY created_at DESC`,
      { courseId }
    );

    return rows.map((row) => ({
      ...row,
      game_data: typeof row.game_data === 'string' ? JSON.parse(row.game_data) : row.game_data,
    }));
  },

  /**
   * Teacher game bank across subjects / school years (optional filters).
   */
  async findBankForTeacher({
    teacherId,
    gradeLevel,
    schoolYear,
  } = {}) {
    const filters = [];
    const params = {};

    if (teacherId) {
      filters.push('c.teacher_id = :teacherId');
      params.teacherId = teacherId;
    }
    if (gradeLevel && gradeLevel !== 'all') {
      filters.push('c.grade_level = :gradeLevel');
      params.gradeLevel = gradeLevel;
    }
    if (schoolYear && schoolYear !== 'all') {
      filters.push('c.school_year = :schoolYear');
      params.schoolYear = schoolYear;
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const rows = await query(
      `SELECT g.id, g.course_id, g.lesson_id, g.title, g.description, g.game_type,
              g.difficulty, g.estimated_time, g.xp_reward, g.is_ai_generated,
              g.is_published, g.created_by, g.updated_by, g.created_at, g.updated_at,
              c.title AS course_title,
              c.subject,
              c.grade_level,
              c.school_year
       FROM educational_games g
       INNER JOIN courses c ON c.id = g.course_id
       ${where}
       ORDER BY g.created_at DESC`,
      params,
    );

    return rows;
  },

  async update(id, data) {
    const mapping = {
      title: 'title',
      description: 'description',
      lessonId: 'lesson_id',
      gameType: 'game_type',
      difficulty: 'difficulty',
      estimatedTime: 'estimated_time',
      gameData: 'game_data',
      xpReward: 'xp_reward',
      isPublished: 'is_published',
      updatedBy: 'updated_by',
    };

    const sets = [];
    const params = { id };

    for (const [key, column] of Object.entries(mapping)) {
      if (data[key] !== undefined) {
        sets.push(`${column} = :${key}`);
        if (key === 'gameData') {
          params[key] = JSON.stringify(data[key]);
        } else if (key === 'isPublished') {
          params[key] = data[key] ? 1 : 0;
        } else {
          params[key] = data[key];
        }
      }
    }

    if (!sets.length) return this.findById(id);
    await query(`UPDATE educational_games SET ${sets.join(', ')} WHERE id = :id`, params);
    return this.findById(id);
  },

  async delete(id) {
    await query('DELETE FROM educational_games WHERE id = :id', { id });
    return true;
  },

  async saveScore({
    gameId,
    studentId,
    score,
    xpEarned,
    durationSeconds = null,
    answers = null,
    releasedToGradebook = false,
  }) {
    const result = await query(
      `INSERT INTO game_scores
         (game_id, student_id, score, xp_earned, duration_seconds, answers_json, released_to_gradebook)
       VALUES
         (:gameId, :studentId, :score, :xpEarned, :durationSeconds, :answersJson, :releasedToGradebook)`,
      {
        gameId,
        studentId,
        score,
        xpEarned,
        durationSeconds,
        answersJson: answers != null ? JSON.stringify(answers) : null,
        releasedToGradebook: releasedToGradebook ? 1 : 0,
      },
    );

    const rows = await query(
      `SELECT id, game_id, student_id, score, xp_earned, duration_seconds, played_at,
              released_to_gradebook, created_at, updated_at
       FROM game_scores
       WHERE id = :id
       LIMIT 1`,
      { id: result.insertId },
    );
    return rows[0];
  },

  async releaseStudentScores(gameId, studentId) {
    await query(
      `UPDATE game_scores
       SET released_to_gradebook = 1
       WHERE game_id = :gameId
         AND student_id = :studentId
         AND released_to_gradebook = 0`,
      { gameId, studentId },
    );
    return true;
  },

  async hasReleasedScore(gameId, studentId) {
    const rows = await query(
      `SELECT id FROM game_scores
       WHERE game_id = :gameId
         AND student_id = :studentId
         AND released_to_gradebook = 1
       LIMIT 1`,
      { gameId, studentId },
    );
    return Boolean(rows[0]);
  },

  async findScoreById(scoreId) {
    const rows = await query(
      `SELECT gs.*,
              g.title AS game_title,
              g.game_type,
              g.game_data,
              g.course_id,
              g.xp_reward,
              c.teacher_id,
              u.first_name,
              u.last_name,
              u.email,
              u.username
       FROM game_scores gs
       INNER JOIN educational_games g ON g.id = gs.game_id
       INNER JOIN courses c ON c.id = g.course_id
       INNER JOIN users u ON u.id = gs.student_id
       WHERE gs.id = :scoreId
       LIMIT 1`,
      { scoreId },
    );
    if (!rows[0]) return null;

    const row = rows[0];
    let answers = null;
    if (row.answers_json != null) {
      answers =
        typeof row.answers_json === 'string'
          ? JSON.parse(row.answers_json)
          : row.answers_json;
    }
    return {
      ...row,
      answers_json: answers,
      game_data:
        typeof row.game_data === 'string'
          ? JSON.parse(row.game_data)
          : row.game_data,
    };
  },

  async countStudentPlays(gameId, studentId) {
    const rows = await query(
      `SELECT COUNT(*) AS total
       FROM game_scores
       WHERE game_id = :gameId AND student_id = :studentId`,
      { gameId, studentId },
    );
    return Number(rows[0]?.total || 0);
  },

  async findBestScore(gameId, studentId) {
    const rows = await query(
      `SELECT id, score, xp_earned, played_at
       FROM game_scores
       WHERE game_id = :gameId AND student_id = :studentId
       ORDER BY score DESC, played_at DESC, id DESC
       LIMIT 1`,
      { gameId, studentId },
    );
    return rows[0] || null;
  },

  async getStudentScores(studentId, gameId = null) {
    const params = { studentId };
    let filter = '';

    if (gameId) {
      filter = 'AND gs.game_id = :gameId';
      params.gameId = gameId;
    }

    return query(
      `SELECT gs.*, g.title AS game_title, g.game_type
       FROM game_scores gs
       INNER JOIN educational_games g ON g.id = gs.game_id
       WHERE gs.student_id = :studentId ${filter}
       ORDER BY gs.played_at DESC`,
      params
    );
  },
};

export default GameModel;
