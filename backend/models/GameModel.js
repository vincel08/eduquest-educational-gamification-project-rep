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

  async saveScore({ gameId, studentId, score, xpEarned, durationSeconds = null }) {
    const result = await query(
      `INSERT INTO game_scores (game_id, student_id, score, xp_earned, duration_seconds)
       VALUES (:gameId, :studentId, :score, :xpEarned, :durationSeconds)`,
      { gameId, studentId, score, xpEarned, durationSeconds }
    );

    const rows = await query('SELECT * FROM game_scores WHERE id = :id LIMIT 1', {
      id: result.insertId,
    });
    return rows[0];
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
