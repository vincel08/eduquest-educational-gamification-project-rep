import { query } from '../config/db.js';

function mapRow(row) {
  return {
    ...row,
    generated_json: typeof row.generated_json === 'string'
      ? JSON.parse(row.generated_json)
      : row.generated_json,
  };
}

const AiContentGenerationModel = {
  async create(data) {
    const result = await query(
      `INSERT INTO ai_content_generations
       (teacher_id, course_id, lesson_id, original_file_name, uploaded_file_path, extracted_text, generated_type, generated_json, quiz_id, game_id)
       VALUES
       (:teacherId, :courseId, :lessonId, :originalFileName, :uploadedFilePath, :extractedText, :generatedType, :generatedJson, :quizId, :gameId)`,
      {
        teacherId: data.teacherId,
        courseId: data.courseId,
        lessonId: data.lessonId || null,
        originalFileName: data.originalFileName || null,
        uploadedFilePath: data.uploadedFilePath || null,
        extractedText: data.extractedText || null,
        generatedType: data.generatedType,
        generatedJson: JSON.stringify(data.generatedJson),
        quizId: data.quizId || null,
        gameId: data.gameId || null,
      }
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    const rows = await query(
      `SELECT * FROM ai_content_generations WHERE id = :id LIMIT 1`,
      { id }
    );
    if (!rows[0]) return null;
    return mapRow(rows[0]);
  },

  async updateLinks(id, { quizId = null, gameId = null, generatedJson = null } = {}) {
    const sets = [];
    const params = { id };

    if (quizId !== null) {
      sets.push('quiz_id = :quizId');
      params.quizId = quizId;
    }
    if (gameId !== null) {
      sets.push('game_id = :gameId');
      params.gameId = gameId;
    }
    if (generatedJson !== null) {
      sets.push('generated_json = :generatedJson');
      params.generatedJson = JSON.stringify(generatedJson);
    }

    if (!sets.length) {
      return this.findById(id);
    }

    await query(
      `UPDATE ai_content_generations SET ${sets.join(', ')} WHERE id = :id`,
      params
    );
    return this.findById(id);
  },

  async listByTeacher(teacherId, { limit = 20 } = {}) {
    return query(
      `SELECT id, teacher_id, course_id, lesson_id, original_file_name, generated_type, quiz_id, game_id, created_at
       FROM ai_content_generations
       WHERE teacher_id = :teacherId
       ORDER BY created_at DESC
       LIMIT ${Number(limit) || 20}`,
      { teacherId }
    );
  },
};

export default AiContentGenerationModel;
