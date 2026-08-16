import { query, getConnection } from '../config/db.js';

const QuizModel = {
  async create(data) {
    const result = await query(
      `INSERT INTO quizzes
       (course_id, lesson_id, title, description, time_limit_minutes, passing_score, xp_reward, is_ai_generated, is_published, created_by)
       VALUES
       (:courseId, :lessonId, :title, :description, :timeLimitMinutes, :passingScore, :xpReward, :isAiGenerated, :isPublished, :createdBy)`,
      {
        courseId: data.courseId,
        lessonId: data.lessonId || null,
        title: data.title,
        description: data.description || null,
        timeLimitMinutes: data.timeLimitMinutes || null,
        passingScore: data.passingScore || 60,
        xpReward: data.xpReward || 50,
        isAiGenerated: data.isAiGenerated ? 1 : 0,
        isPublished: data.isPublished ? 1 : 0,
        createdBy: data.createdBy,
      }
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    const rows = await query(
      `SELECT q.*, c.title AS course_title, c.teacher_id
       FROM quizzes q
       INNER JOIN courses c ON c.id = q.course_id
       WHERE q.id = :id
       LIMIT 1`,
      { id }
    );
    return rows[0] || null;
  },

  async findByCourse(courseId, { publishedOnly = false } = {}) {
    const publishedFilter = publishedOnly ? 'AND q.is_published = 1' : '';
    return query(
      `SELECT q.*,
              (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS question_count
       FROM quizzes q
       WHERE q.course_id = :courseId ${publishedFilter}
       ORDER BY q.created_at DESC`,
      { courseId }
    );
  },

  async update(id, data) {
    const mapping = {
      title: 'title',
      description: 'description',
      lessonId: 'lesson_id',
      timeLimitMinutes: 'time_limit_minutes',
      passingScore: 'passing_score',
      xpReward: 'xp_reward',
      isPublished: 'is_published',
      updatedBy: 'updated_by',
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

    await query(`UPDATE quizzes SET ${sets.join(', ')} WHERE id = :id`, params);
    return this.findById(id);
  },

  async delete(id) {
    await query('DELETE FROM quizzes WHERE id = :id', { id });
    return true;
  },

  async addQuestion(quizId, question) {
    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      const [questionResult] = await connection.execute(
        `INSERT INTO quiz_questions
         (quiz_id, question_text, question_type, points, explanation, image_url, order_index)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          quizId,
          question.questionText ?? question.question_text ?? '',
          question.questionType || question.question_type || 'multiple_choice',
          question.points || 1,
          question.explanation ?? null,
          question.imageUrl ?? question.image_url ?? null,
          question.orderIndex || question.order_index || 1,
        ]
      );

      const questionId = questionResult.insertId;
      const options = Array.isArray(question.options) ? question.options : [];

      for (let i = 0; i < options.length; i += 1) {
        const option = options[i];
        await connection.execute(
          `INSERT INTO quiz_options
           (question_id, option_text, is_correct, match_key, side, order_index)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            questionId,
            option.optionText ?? option.option_text ?? option.text ?? '',
            option.isCorrect || option.is_correct ? 1 : 0,
            option.matchKey ?? option.match_key ?? null,
            option.side || 'none',
            i + 1,
          ]
        );
      }

      await connection.commit();
      return this.getQuestionWithOptions(questionId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async updateQuestionImage(questionId, imageUrl) {
    await query(
      'UPDATE quiz_questions SET image_url = :imageUrl WHERE id = :questionId',
      { questionId, imageUrl }
    );
    return this.getQuestionWithOptions(questionId);
  },

  async updateQuestion(questionId, question) {
    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      const imageUrl = question.imageUrl ?? question.image_url;
      if (imageUrl !== undefined) {
        await connection.execute(
          `UPDATE quiz_questions
           SET question_text = ?, question_type = ?, points = ?, explanation = ?,
               image_url = ?, order_index = ?
           WHERE id = ?`,
          [
            question.questionText ?? question.question_text ?? '',
            question.questionType || question.question_type || 'multiple_choice',
            question.points || 1,
            question.explanation ?? null,
            imageUrl,
            question.orderIndex || question.order_index || 1,
            questionId,
          ]
        );
      } else {
        await connection.execute(
          `UPDATE quiz_questions
           SET question_text = ?, question_type = ?, points = ?, explanation = ?, order_index = ?
           WHERE id = ?`,
          [
            question.questionText ?? question.question_text ?? '',
            question.questionType || question.question_type || 'multiple_choice',
            question.points || 1,
            question.explanation ?? null,
            question.orderIndex || question.order_index || 1,
            questionId,
          ]
        );
      }

      await connection.execute('DELETE FROM quiz_options WHERE question_id = ?', [questionId]);

      const options = Array.isArray(question.options) ? question.options : [];
      for (let i = 0; i < options.length; i += 1) {
        const option = options[i];
        await connection.execute(
          `INSERT INTO quiz_options
           (question_id, option_text, is_correct, match_key, side, order_index)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            questionId,
            option.optionText ?? option.option_text ?? option.text ?? '',
            option.isCorrect || option.is_correct ? 1 : 0,
            option.matchKey ?? option.match_key ?? null,
            option.side || 'none',
            i + 1,
          ]
        );
      }

      await connection.commit();
      return this.getQuestionWithOptions(questionId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async deleteQuestion(questionId) {
    await query('DELETE FROM quiz_questions WHERE id = :questionId', { questionId });
    return true;
  },

  async deleteQuestionsByQuizId(quizId) {
    await query('DELETE FROM quiz_questions WHERE quiz_id = :quizId', { quizId });
    return true;
  },

  async reorderQuestions(quizId, orderedIds) {
    const connection = await getConnection();
    try {
      await connection.beginTransaction();
      for (let i = 0; i < orderedIds.length; i += 1) {
        await connection.execute(
          'UPDATE quiz_questions SET order_index = ? WHERE id = ? AND quiz_id = ?',
          [i + 1, orderedIds[i], quizId]
        );
      }
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async getQuestionWithOptions(questionId) {
    const questions = await query(
      'SELECT * FROM quiz_questions WHERE id = :questionId LIMIT 1',
      { questionId }
    );
    const question = questions[0];
    if (!question) return null;

    const options = await query(
      `SELECT id, question_id, option_text, is_correct, match_key, side, order_index
       FROM quiz_options
       WHERE question_id = :questionId
       ORDER BY order_index ASC`,
      { questionId }
    );

    return { ...question, options };
  },

  async getQuestions(quizId, { includeCorrect = false } = {}) {
    const questions = await query(
      `SELECT * FROM quiz_questions
       WHERE quiz_id = :quizId
       ORDER BY order_index ASC, id ASC`,
      { quizId }
    );

    const result = [];

    for (const question of questions) {
      let options = await query(
        `SELECT id, question_id, option_text, match_key, side, order_index
         ${includeCorrect ? ', is_correct' : ''}
         FROM quiz_options
         WHERE question_id = :questionId
         ORDER BY order_index ASC`,
        { questionId: question.id }
      );

      // Do not leak accepted answers for identification to students.
      if (!includeCorrect && question.question_type === 'identification') {
        options = [];
      }

      // Shuffle right-side matching options for students so pairs are not obvious.
      if (!includeCorrect && question.question_type === 'matching') {
        const left = options.filter((option) => option.side === 'left').map((option) => {
          const { match_key: _matchKey, ...rest } = option;
          return rest;
        });
        const right = options.filter((option) => option.side === 'right').map((option) => {
          const { match_key: _matchKey, ...rest } = option;
          return rest;
        });
        for (let i = right.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [right[i], right[j]] = [right[j], right[i]];
        }
        options = [...left, ...right];
      }

      result.push({ ...question, options });
    }

    return result;
  },

  async createAttempt({ quizId, studentId }) {
    const result = await query(
      `INSERT INTO quiz_attempts (quiz_id, student_id)
       VALUES (:quizId, :studentId)`,
      { quizId, studentId }
    );
    return this.findAttemptById(result.insertId);
  },

  async findAttemptById(id) {
    const rows = await query('SELECT * FROM quiz_attempts WHERE id = :id LIMIT 1', { id });
    return rows[0] || null;
  },

  async getAnswersForAttempt(attemptId) {
    const rows = await query(
      `SELECT
         qa.id,
         qa.attempt_id,
         qa.question_id,
         qa.selected_option_id,
         qa.text_answer,
         qa.answer_payload,
         qa.is_correct,
         qa.points_earned
       FROM quiz_answers qa
       WHERE qa.attempt_id = :attemptId
       ORDER BY qa.id ASC`,
      { attemptId }
    );

    return rows.map((row) => {
      let answerPayload = row.answer_payload;
      if (typeof answerPayload === 'string') {
        try {
          answerPayload = JSON.parse(answerPayload);
        } catch {
          answerPayload = null;
        }
      }
      return {
        ...row,
        answer_payload: answerPayload,
      };
    });
  },

  async findAttemptWithStudent(attemptId) {
    const rows = await query(
      `SELECT
         qa.*,
         u.first_name,
         u.last_name,
         u.email,
         u.username
       FROM quiz_attempts qa
       INNER JOIN users u ON u.id = qa.student_id
       WHERE qa.id = :attemptId
       LIMIT 1`,
      { attemptId }
    );
    return rows[0] || null;
  },


  async completeAttempt(attemptId, data) {
    await query(
      `UPDATE quiz_attempts
       SET score = :score,
           total_points = :totalPoints,
           earned_points = :earnedPoints,
           xp_earned = :xpEarned,
           is_passed = :isPassed,
           completed_at = CURRENT_TIMESTAMP
       WHERE id = :attemptId`,
      { attemptId, ...data }
    );
    return this.findAttemptById(attemptId);
  },

  async saveAnswer(data) {
    const payload = data.answerPayload
      ? JSON.stringify(data.answerPayload)
      : null;

    await query(
      `INSERT INTO quiz_answers
       (attempt_id, question_id, selected_option_id, text_answer, answer_payload, is_correct, points_earned)
       VALUES
       (:attemptId, :questionId, :selectedOptionId, :textAnswer, :answerPayload, :isCorrect, :pointsEarned)`,
      {
        attemptId: data.attemptId,
        questionId: data.questionId,
        selectedOptionId: data.selectedOptionId || null,
        textAnswer: data.textAnswer || null,
        answerPayload: payload,
        isCorrect: data.isCorrect,
        pointsEarned: data.pointsEarned,
      }
    );
  },

  async getStudentAttempts(studentId, quizId = null) {
    const params = { studentId };
    let filter = '';

    if (quizId) {
      filter = 'AND qa.quiz_id = :quizId';
      params.quizId = quizId;
    }

    return query(
      `SELECT qa.*, q.title AS quiz_title
       FROM quiz_attempts qa
       INNER JOIN quizzes q ON q.id = qa.quiz_id
       WHERE qa.student_id = :studentId ${filter}
       ORDER BY qa.started_at DESC`,
      params
    );
  },

  async getOptionById(optionId) {
    const rows = await query('SELECT * FROM quiz_options WHERE id = :optionId LIMIT 1', { optionId });
    return rows[0] || null;
  },

  async countPassedQuizzes(studentId) {
    const rows = await query(
      `SELECT COUNT(DISTINCT quiz_id) AS total
       FROM quiz_attempts
       WHERE student_id = :studentId AND is_passed = 1`,
      { studentId }
    );
    return rows[0].total;
  },

  async hasPassedQuiz(studentId, quizId) {
    const rows = await query(
      `SELECT id FROM quiz_attempts
       WHERE student_id = :studentId
         AND quiz_id = :quizId
         AND is_passed = 1
       LIMIT 1`,
      { studentId, quizId }
    );
    return Boolean(rows[0]);
  },
};

export default QuizModel;
