import { query } from "../config/db.js";
import CourseModel from "../models/CourseModel.js";
import AppError from "../utils/AppError.js";

async function assertCourseAccess(courseId, user) {
  const course = await CourseModel.findById(courseId);
  if (!course) throw new AppError("Course not found", 404);

  if (
    user.role === "teacher" &&
    Number(course.teacher_id) !== Number(user.id)
  ) {
    throw new AppError("Access denied", 403);
  }

  return course;
}

function roundScore(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  return Number(Number(value).toFixed(2));
}

function normalizeScoreInput(raw) {
  const score = Number(raw);
  if (!Number.isFinite(score)) {
    throw new AppError("Score must be a number between 0 and 100", 400);
  }
  if (score < 0 || score > 100) {
    throw new AppError("Score must be between 0 and 100", 400);
  }
  return roundScore(score);
}

function normalizeEarnedPoints(raw, totalPoints) {
  const earned = Number(raw);
  if (!Number.isFinite(earned)) {
    throw new AppError("Earned points must be a number", 400);
  }
  if (earned < 0 || earned > totalPoints) {
    throw new AppError(
      `Earned points must be between 0 and ${totalPoints}`,
      400,
    );
  }
  return Math.round(earned);
}

async function getQuizMaxPoints(quizId) {
  const rows = await query(
    `SELECT COALESCE(SUM(points), 0) AS max_points
     FROM quiz_questions
     WHERE quiz_id = :quizId`,
    { quizId },
  );
  return Number(rows[0]?.max_points) || 0;
}

async function assertQuizInCourse(courseId, quizId) {
  const rows = await query(
    `SELECT id, title, passing_score, is_published, xp_reward
     FROM quizzes
     WHERE id = :quizId AND course_id = :courseId
     LIMIT 1`,
    { quizId, courseId },
  );
  if (!rows[0]) throw new AppError("Quiz not found for this subject", 404);
  return rows[0];
}

async function assertGameInCourse(courseId, gameId) {
  const rows = await query(
    `SELECT id, title, is_published, xp_reward, game_type
     FROM educational_games
     WHERE id = :gameId AND course_id = :courseId
     LIMIT 1`,
    { gameId, courseId },
  );
  if (!rows[0]) throw new AppError("Game not found for this subject", 404);
  return rows[0];
}

async function assertStudentEnrolled(courseId, studentId) {
  const enrolled = await CourseModel.isEnrolled(courseId, studentId);
  if (!enrolled) {
    throw new AppError("Student is not enrolled in this subject", 400);
  }
}

const GradebookService = {
  async getCourseGradebook(courseId, user) {
    const course = await assertCourseAccess(courseId, user);

    const [
      students,
      quizzes,
      games,
      quizAttemptRows,
      gameScoreRows,
      quizPointRows,
    ] = await Promise.all([
      CourseModel.getEnrollments(courseId),
      query(
        `SELECT id, title, passing_score, is_published, xp_reward, due_at
         FROM quizzes
         WHERE course_id = :courseId
         ORDER BY created_at ASC, id ASC`,
        { courseId },
      ),
      query(
        `SELECT id, title, is_published, xp_reward, game_type
         FROM educational_games
         WHERE course_id = :courseId
         ORDER BY created_at ASC, id ASC`,
        { courseId },
      ),
      query(
        `SELECT
           qa.id AS attempt_id,
           qa.student_id,
           qa.quiz_id,
           qa.score,
           qa.earned_points,
           qa.total_points,
           qa.is_passed,
           qa.completed_at,
           qa.xp_earned,
           u.first_name,
           u.last_name,
           u.email
         FROM quiz_attempts qa
         INNER JOIN quizzes q ON q.id = qa.quiz_id
         INNER JOIN users u ON u.id = qa.student_id
         WHERE q.course_id = :courseId
           AND qa.completed_at IS NOT NULL
         ORDER BY qa.score DESC, qa.completed_at DESC, qa.id DESC`,
        { courseId },
      ),
      query(
        `SELECT
           gs.id AS score_id,
           gs.student_id,
           gs.game_id,
           gs.score,
           gs.played_at,
           gs.xp_earned,
           u.first_name,
           u.last_name,
           u.email
         FROM game_scores gs
         INNER JOIN educational_games g ON g.id = gs.game_id
         INNER JOIN users u ON u.id = gs.student_id
         WHERE g.course_id = :courseId
         ORDER BY gs.score DESC, gs.played_at DESC, gs.id DESC`,
        { courseId },
      ),
      query(
        `SELECT q.id AS quiz_id, COALESCE(SUM(qq.points), 0) AS max_points
         FROM quizzes q
         LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
         WHERE q.course_id = :courseId
         GROUP BY q.id`,
        { courseId },
      ),
    ]);

    const quizMaxPoints = new Map(
      quizPointRows.map((row) => [
        Number(row.quiz_id),
        Number(row.max_points) || 0,
      ]),
    );
    const bestQuizByStudent = new Map();
    const quizAttemptCounts = new Map();
    for (const row of quizAttemptRows) {
      const key = `${row.student_id}:${row.quiz_id}`;
      quizAttemptCounts.set(key, (quizAttemptCounts.get(key) || 0) + 1);
      if (!bestQuizByStudent.has(key)) {
        bestQuizByStudent.set(key, row);
      }
    }

    const bestGameByStudent = new Map();
    const gamePlayCounts = new Map();
    for (const row of gameScoreRows) {
      const key = `${row.student_id}:${row.game_id}`;
      gamePlayCounts.set(key, (gamePlayCounts.get(key) || 0) + 1);
      if (!bestGameByStudent.has(key)) {
        bestGameByStudent.set(key, row);
      }
    }

    const enrolledById = new Map(
      students.map((student) => [Number(student.student_id), student]),
    );

    const quizItems = quizzes.map((quiz) => {
      const maxPoints = quizMaxPoints.get(Number(quiz.id)) || 0;
      const results = [];
      for (const [key, row] of bestQuizByStudent.entries()) {
        if (Number(row.quiz_id) !== Number(quiz.id)) continue;
        const totalPoints =
          Number(row.total_points) > 0 ? Number(row.total_points) : maxPoints;
        const earnedPoints =
          row.earned_points != null
            ? Number(row.earned_points)
            : totalPoints
              ? Math.round((Number(row.score) / 100) * totalPoints)
              : Number(row.score) || 0;
        results.push({
          studentId: row.student_id,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          score: roundScore(row.score),
          earnedPoints,
          totalPoints,
          passed: Boolean(row.is_passed),
          attemptId: row.attempt_id,
          attemptCount: quizAttemptCounts.get(key) || 1,
          completedAt: row.completed_at,
          xpEarned: row.xp_earned || 0,
        });
      }
      results.sort((a, b) =>
        `${a.lastName}${a.firstName}`.localeCompare(
          `${b.lastName}${b.firstName}`,
        ),
      );
      return {
        type: "quiz",
        id: quiz.id,
        title: quiz.title,
        passingScore: quiz.passing_score,
        dueAt: quiz.due_at || null,
        isPublished: Boolean(quiz.is_published),
        xpReward: quiz.xp_reward,
        maxPoints,
        resultCount: results.length,
        results,
      };
    });

    const gameItems = games.map((game) => {
      const results = [];
      for (const [key, row] of bestGameByStudent.entries()) {
        if (Number(row.game_id) !== Number(game.id)) continue;
        const earnedPoints = Math.round(Number(row.score) || 0);
        results.push({
          studentId: row.student_id,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          score: roundScore(row.score),
          earnedPoints,
          totalPoints: 100,
          scoreId: row.score_id,
          playCount: gamePlayCounts.get(key) || 1,
          playedAt: row.played_at,
          xpEarned: row.xp_earned || 0,
        });
      }
      results.sort((a, b) =>
        `${a.lastName}${a.firstName}`.localeCompare(
          `${b.lastName}${b.firstName}`,
        ),
      );
      return {
        type: "game",
        id: game.id,
        title: game.title,
        gameType: game.game_type,
        isPublished: Boolean(game.is_published),
        xpReward: game.xp_reward,
        maxPoints: 100,
        resultCount: results.length,
        results,
      };
    });

    return {
      course: {
        id: course.id,
        title: course.title,
        subject: course.subject,
        gradeLevel: course.grade_level,
      },
      quizzes: quizItems,
      games: gameItems,
      enrolledStudents: students.map((student) => ({
        studentId: student.student_id,
        username: student.username || null,
        firstName: student.first_name,
        lastName: student.last_name,
        email: student.email || null,
        lessonProgressPercent: roundScore(student.progress_percent) ?? 0,
      })),
      summary: {
        enrolledCount: enrolledById.size,
        quizCount: quizzes.length,
        gameCount: games.length,
      },
    };
  },

  async updateQuizStudentScore(courseId, quizId, studentId, rawPayload, user) {
    await assertCourseAccess(courseId, user);
    const quiz = await assertQuizInCourse(courseId, quizId);
    await assertStudentEnrolled(courseId, studentId);

    const existing = await query(
      `SELECT id, total_points, earned_points, score
       FROM quiz_attempts
       WHERE quiz_id = :quizId
         AND student_id = :studentId
         AND completed_at IS NOT NULL
       ORDER BY score DESC, completed_at DESC, id DESC
       LIMIT 1`,
      { quizId, studentId },
    );

    const quizMax = await getQuizMaxPoints(quizId);
    const totalPoints =
      Number(existing[0]?.total_points) > 0
        ? Number(existing[0].total_points)
        : quizMax || 100;

    let earnedPoints;
    let score;
    if (
      rawPayload != null &&
      typeof rawPayload === "object" &&
      rawPayload.earnedPoints != null
    ) {
      earnedPoints = normalizeEarnedPoints(
        rawPayload.earnedPoints,
        totalPoints,
      );
      score = totalPoints ? roundScore((earnedPoints / totalPoints) * 100) : 0;
    } else {
      const rawScore =
        typeof rawPayload === "object" ? rawPayload.score : rawPayload;
      score = normalizeScoreInput(rawScore);
      earnedPoints = Math.round((score / 100) * totalPoints);
    }

    const isPassed = score >= Number(quiz.passing_score || 0) ? 1 : 0;

    if (existing[0]) {
      await query(
        `UPDATE quiz_attempts
         SET score = :score,
             is_passed = :isPassed,
             total_points = :totalPoints,
             earned_points = :earnedPoints,
             completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)
         WHERE id = :attemptId`,
        {
          score,
          isPassed,
          totalPoints,
          earnedPoints,
          attemptId: existing[0].id,
        },
      );
    } else {
      await query(
        `INSERT INTO quiz_attempts
         (quiz_id, student_id, score, total_points, earned_points, xp_earned, is_passed, completed_at)
         VALUES
         (:quizId, :studentId, :score, :totalPoints, :earnedPoints, 0, :isPassed, CURRENT_TIMESTAMP)`,
        { quizId, studentId, score, totalPoints, earnedPoints, isPassed },
      );
    }

    return this.getCourseGradebook(courseId, user);
  },

  async updateGameStudentScore(courseId, gameId, studentId, rawPayload, user) {
    await assertCourseAccess(courseId, user);
    await assertGameInCourse(courseId, gameId);
    await assertStudentEnrolled(courseId, studentId);

    let score;
    if (
      rawPayload != null &&
      typeof rawPayload === "object" &&
      rawPayload.earnedPoints != null
    ) {
      score = normalizeEarnedPoints(rawPayload.earnedPoints, 100);
    } else {
      const rawScore =
        typeof rawPayload === "object" ? rawPayload.score : rawPayload;
      score = Math.round(normalizeScoreInput(rawScore));
    }

    const existing = await query(
      `SELECT id
       FROM game_scores
       WHERE game_id = :gameId
         AND student_id = :studentId
       ORDER BY score DESC, played_at DESC, id DESC
       LIMIT 1`,
      { gameId, studentId },
    );

    if (existing[0]) {
      await query(
        `UPDATE game_scores
         SET score = :score,
             played_at = CURRENT_TIMESTAMP
         WHERE id = :scoreId`,
        { score, scoreId: existing[0].id },
      );
    } else {
      await query(
        `INSERT INTO game_scores (game_id, student_id, score, xp_earned)
         VALUES (:gameId, :studentId, :score, 0)`,
        { gameId, studentId, score },
      );
    }

    return this.getCourseGradebook(courseId, user);
  },
};

export default GradebookService;
