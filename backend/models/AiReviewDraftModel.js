import { query } from '../config/db.js';

function parseJson(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapDraft(row) {
  if (!row) return null;
  return {
    id: row.id,
    teacherId: row.teacher_id,
    courseId: row.course_id,
    lessonId: row.lesson_id,
    sourceType: row.source_type,
    status: row.status,
    title: row.title,
    sourceText: row.source_text,
    quiz: parseJson(row.quiz_json, null),
    game: parseJson(row.game_json, null),
    learningObjectives: parseJson(row.learning_objectives_json, null),
    lessonSummary: parseJson(row.lesson_summary_json, null),
    generationMeta: parseJson(row.generation_meta, null),
    quizId: row.quiz_id,
    gameId: row.game_id,
    aiGenerated: Boolean(row.ai_generated),
    teacherEdited: Boolean(row.teacher_edited),
    generatedBy: row.generated_by,
    updatedBy: row.updated_by,
    publishedBy: row.published_by,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const AiReviewDraftModel = {
  async create(data) {
    const result = await query(
      `INSERT INTO ai_review_drafts
       (teacher_id, course_id, lesson_id, source_type, status, title, source_text,
        quiz_json, game_json, learning_objectives_json, lesson_summary_json,
        generation_meta, ai_generated, teacher_edited, generated_by)
       VALUES
       (:teacherId, :courseId, :lessonId, :sourceType, :status, :title, :sourceText,
        :quizJson, :gameJson, :learningObjectivesJson, :lessonSummaryJson,
        :generationMeta, :aiGenerated, :teacherEdited, :generatedBy)`,
      {
        teacherId: data.teacherId,
        courseId: data.courseId,
        lessonId: data.lessonId || null,
        sourceType: data.sourceType || 'manual',
        status: data.status || 'draft',
        title: data.title || null,
        sourceText: data.sourceText || null,
        quizJson: data.quiz ? JSON.stringify(data.quiz) : null,
        gameJson: data.game ? JSON.stringify(data.game) : null,
        learningObjectivesJson: data.learningObjectives
          ? JSON.stringify(data.learningObjectives)
          : null,
        lessonSummaryJson: data.lessonSummary
          ? JSON.stringify(data.lessonSummary)
          : null,
        generationMeta: data.generationMeta
          ? JSON.stringify(data.generationMeta)
          : null,
        aiGenerated: data.aiGenerated !== false ? 1 : 0,
        teacherEdited: data.teacherEdited ? 1 : 0,
        generatedBy: data.generatedBy || data.teacherId,
      }
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    const rows = await query(
      `SELECT * FROM ai_review_drafts WHERE id = :id LIMIT 1`,
      { id }
    );
    return mapDraft(rows[0]);
  },

  async listByTeacher(teacherId, { status = 'draft', limit = 20 } = {}) {
    const rows = await query(
      `SELECT * FROM ai_review_drafts
       WHERE teacher_id = :teacherId
         AND (:status IS NULL OR status = :status)
       ORDER BY updated_at DESC
       LIMIT :limit`,
      { teacherId, status: status || null, limit: Number(limit) }
    );
    return rows.map(mapDraft);
  },

  async update(id, fields) {
    const allowed = {
      title: 'title',
      sourceText: 'source_text',
      status: 'status',
      quiz: 'quiz_json',
      game: 'game_json',
      learningObjectives: 'learning_objectives_json',
      lessonSummary: 'lesson_summary_json',
      generationMeta: 'generation_meta',
      teacherEdited: 'teacher_edited',
      quizId: 'quiz_id',
      gameId: 'game_id',
      updatedBy: 'updated_by',
      publishedBy: 'published_by',
      publishedAt: 'published_at',
    };

    const sets = [];
    const params = { id };

    for (const [key, column] of Object.entries(allowed)) {
      if (fields[key] === undefined) continue;
      if (['quiz', 'game', 'learningObjectives', 'lessonSummary', 'generationMeta'].includes(key)) {
        sets.push(`${column} = :${key}`);
        params[key] = fields[key] == null ? null : JSON.stringify(fields[key]);
      } else if (key === 'teacherEdited') {
        sets.push(`${column} = :${key}`);
        params[key] = fields[key] ? 1 : 0;
      } else {
        sets.push(`${column} = :${key}`);
        params[key] = fields[key];
      }
    }

    if (!sets.length) return this.findById(id);

    await query(
      `UPDATE ai_review_drafts SET ${sets.join(', ')} WHERE id = :id`,
      params
    );
    return this.findById(id);
  },
};

export default AiReviewDraftModel;
