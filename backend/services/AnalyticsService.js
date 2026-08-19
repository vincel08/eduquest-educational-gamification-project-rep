import { query } from "../config/db.js";
import CourseModel from "../models/CourseModel.js";
import QuizModel from "../models/QuizModel.js";
import QuizStudentOverrideModel from "../models/QuizStudentOverrideModel.js";
import NotificationModel from "../models/NotificationModel.js";
import AppError from "../utils/AppError.js";
import { getContentUnlockState } from "../utils/contentUnlock.js";
import {
  buildAttemptMeta,
  MAX_EXTRA_ATTEMPTS_GRANT,
  MAX_QUIZ_ATTEMPTS,
  resolveEffectiveDueAt,
  resolveMaxAttempts,
} from "../utils/quizAttemptRules.js";
import {
  appendStudentRosterFilters,
  hasRosterFilters,
  normalizeRosterFilterValue,
} from "../utils/rosterFilters.js";

async function studentQuizAccessMeta(quiz, studentId, attemptsUsed = null) {
  const override = await QuizStudentOverrideModel.findByQuizAndStudent(
    quiz.id,
    studentId,
  );
  const used =
    attemptsUsed != null
      ? Number(attemptsUsed)
      : await QuizModel.countCompletedAttempts(quiz.id, studentId);
  const extraAttempts = Number(override?.extra_attempts || 0);
  const extendedDue = override?.extended_due_at || null;
  const effectiveDueAt =
    resolveEffectiveDueAt.length >= 3
      ? resolveEffectiveDueAt(quiz.due_at, extendedDue, quiz)
      : resolveEffectiveDueAt(quiz.due_at, extendedDue);
  const maxAttempts = resolveMaxAttempts(extraAttempts);
  return buildAttemptMeta({
    attemptsUsed: used,
    dueAt: effectiveDueAt,
    maxAttempts,
    classDueAt: quiz.due_at,
    extraAttempts,
    hasOverride: Boolean(override),
  });
}

const GRADE_MATCH_SQL = `
  AND c.grade_level = sp.grade_level
  AND sp.grade_level IS NOT NULL
  AND TRIM(sp.grade_level) <> ''
`;

const AnalyticsService = {
  async getAdminOverview(filters = {}) {
    const rosterActive = hasRosterFilters(filters);
    const gradeLevel = normalizeRosterFilterValue(filters.gradeLevel);

    const studentFilters = ["u.role = 'student'"];
    const studentParams = {};
    if (rosterActive) {
      appendStudentRosterFilters(studentFilters, studentParams, filters, "sp");
    }
    const studentWhere = `WHERE ${studentFilters.join(" AND ")}`;
    const studentJoin = "INNER JOIN student_profiles sp ON sp.user_id = u.id";

    const courseFilters = [];
    const courseParams = {};
    if (gradeLevel) {
      courseFilters.push("grade_level = :courseGradeLevel");
      courseParams.courseGradeLevel = gradeLevel;
    }
    const courseWhere = courseFilters.length
      ? `WHERE ${courseFilters.join(" AND ")}`
      : "";

    const [users, courses, quizzes, attempts, avgXp] = await Promise.all([
      rosterActive
        ? query(
            `SELECT u.role, COUNT(*) AS count
             FROM users u
             ${studentJoin}
             ${studentWhere}
             GROUP BY u.role`,
            studentParams,
          )
        : query(`SELECT role, COUNT(*) AS count FROM users GROUP BY role`),
      query(
        `SELECT COUNT(*) AS total FROM courses ${courseWhere}`,
        courseParams,
      ),
      query(
        `SELECT COUNT(*) AS total
         FROM quizzes q
         INNER JOIN courses c ON c.id = q.course_id
         ${gradeLevel ? "WHERE c.grade_level = :courseGradeLevel" : ""}`,
        courseParams,
      ),
      query(
        `SELECT COUNT(*) AS total, AVG(qa.score) AS average_score
         FROM quiz_attempts qa
         INNER JOIN users u ON u.id = qa.student_id
         ${rosterActive ? `${studentJoin} ${studentWhere} AND qa.completed_at IS NOT NULL` : "WHERE qa.completed_at IS NOT NULL"}`,
        studentParams,
      ),
      query(
        `SELECT AVG(sp.xp) AS average_xp, AVG(sp.level) AS average_level
         FROM student_profiles sp
         INNER JOIN users u ON u.id = sp.user_id
         ${studentWhere}`,
        studentParams,
      ),
    ]);

    const engagementFilters = [
      "xt.created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)",
    ];
    const engagementParams = {};
    if (rosterActive) {
      appendStudentRosterFilters(
        engagementFilters,
        engagementParams,
        filters,
        "sp",
      );
    }

    const engagement = await query(
      `SELECT DATE(xt.created_at) AS day, COUNT(*) AS activity_count
       FROM xp_transactions xt
       ${
         rosterActive
           ? `INNER JOIN student_profiles sp ON sp.user_id = xt.student_id`
           : ""
       }
       WHERE ${engagementFilters.join(" AND ")}
       GROUP BY DATE(xt.created_at)
       ORDER BY day ASC`,
      engagementParams,
    );

    const topStudentFilters = ["u.is_active = 1"];
    const topStudentParams = {};
    if (rosterActive) {
      appendStudentRosterFilters(
        topStudentFilters,
        topStudentParams,
        filters,
        "sp",
      );
    }

    const [topStudents, recentQuizzes, recentGames, gamesCount] =
      await Promise.all([
        query(
          `SELECT u.first_name, u.last_name, sp.xp, sp.level
           FROM student_profiles sp
           INNER JOIN users u ON u.id = sp.user_id
           WHERE ${topStudentFilters.join(" AND ")}
           ORDER BY sp.xp DESC
           LIMIT 5`,
          topStudentParams,
        ),
        query(
          `SELECT q.id, q.title, q.is_published, q.is_ai_generated, q.created_at, q.updated_at,
                c.title AS course_title
           FROM quizzes q
           INNER JOIN courses c ON c.id = q.course_id
           ${gradeLevel ? "WHERE c.grade_level = :courseGradeLevel" : ""}
           ORDER BY q.updated_at DESC
           LIMIT 8`,
          courseParams,
        ),
        query(
          `SELECT g.id, g.title, g.game_type, g.is_published, g.is_ai_generated, g.created_at, g.updated_at,
                c.title AS course_title
           FROM educational_games g
           INNER JOIN courses c ON c.id = g.course_id
           ${gradeLevel ? "WHERE c.grade_level = :courseGradeLevel" : ""}
           ORDER BY g.updated_at DESC
           LIMIT 8`,
          courseParams,
        ),
        query(
          `SELECT COUNT(*) AS total
           FROM educational_games g
           INNER JOIN courses c ON c.id = g.course_id
           ${gradeLevel ? "WHERE c.grade_level = :courseGradeLevel" : ""}`,
          courseParams,
        ),
      ]);

    return {
      usersByRole: users,
      totalCourses: courses[0].total,
      totalQuizzes: quizzes[0].total,
      totalGames: gamesCount[0].total,
      quizAttempts: attempts[0].total,
      averageQuizScore: Number(
        Number(attempts[0].average_score || 0).toFixed(2),
      ),
      averageXp: Number(Number(avgXp[0].average_xp || 0).toFixed(2)),
      averageLevel: Number(Number(avgXp[0].average_level || 0).toFixed(2)),
      engagement,
      topStudents,
      recentQuizzes,
      recentGames,
    };
  },

  async getTeacherOverview(teacherId, rosterFilters = {}) {
    const courseFilters = {
      teacherId,
      limit: 100,
      page: 1,
    };
    if (rosterFilters.gradeLevel && rosterFilters.gradeLevel !== "all") {
      courseFilters.gradeLevel = rosterFilters.gradeLevel;
    }

    const courses = await CourseModel.findAll(courseFilters);
    const courseIds = courses.courses.map((course) => course.id);

    if (!courseIds.length) {
      return {
        totalCourses: 0,
        totalStudents: 0,
        averageProgress: 0,
        quizStats: [],
        courses: [],
        activeStudents: [],
        difficultQuestions: [],
        completionRate: 0,
      };
    }

    const placeholders = courseIds.map((_, index) => `:id${index}`).join(", ");
    const params = {};
    courseIds.forEach((id, index) => {
      params[`id${index}`] = id;
    });

    const studentFilters = [`ce.course_id IN (${placeholders})`];
    const studentParams = { ...params };
    if (hasRosterFilters(rosterFilters)) {
      appendStudentRosterFilters(
        studentFilters,
        studentParams,
        rosterFilters,
        "sp",
      );
    }

    const activeFilters = [
      `ce.course_id IN (${placeholders})`,
      "xt.created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)",
    ];
    const activeParams = { ...params };
    if (hasRosterFilters(rosterFilters)) {
      appendStudentRosterFilters(
        activeFilters,
        activeParams,
        rosterFilters,
        "sp",
      );
    }

    const attemptJoin = hasRosterFilters(rosterFilters)
      ? `LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.completed_at IS NOT NULL
         LEFT JOIN student_profiles sp ON sp.user_id = qa.student_id`
      : `LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.completed_at IS NOT NULL`;
    const attemptRoster = [];
    const attemptParams = { ...params };
    if (hasRosterFilters(rosterFilters)) {
      appendStudentRosterFilters(
        attemptRoster,
        attemptParams,
        rosterFilters,
        "sp",
      );
    }
    const attemptWhereExtra = attemptRoster.length
      ? ` AND (${attemptRoster.map((clause) => `(qa.student_id IS NULL OR ${clause})`).join(" AND ")})`
      : "";

    const difficultFilters = [`q.course_id IN (${placeholders})`];
    const difficultParams = { ...params };
    if (hasRosterFilters(rosterFilters)) {
      appendStudentRosterFilters(
        difficultFilters,
        difficultParams,
        rosterFilters,
        "sp",
      );
    }

    const [studentStats, quizStats, activeStudents, difficultQuestions] =
      await Promise.all([
        query(
          `SELECT COUNT(DISTINCT ce.student_id) AS total_students,
                AVG(ce.progress_percent) AS average_progress
           FROM course_enrollments ce
           ${
             hasRosterFilters(rosterFilters)
               ? "INNER JOIN student_profiles sp ON sp.user_id = ce.student_id"
               : ""
           }
           WHERE ${studentFilters.join(" AND ")}`,
          studentParams,
        ),
        query(
          `SELECT q.id, q.title, q.created_at, q.updated_at,
                COUNT(qa.id) AS attempts, AVG(qa.score) AS average_score,
                SUM(CASE WHEN qa.is_passed = 1 THEN 1 ELSE 0 END) AS passed_count
           FROM quizzes q
           ${attemptJoin}
           WHERE q.course_id IN (${placeholders})${attemptWhereExtra}
           GROUP BY q.id, q.title, q.created_at, q.updated_at
           ORDER BY q.updated_at DESC`,
          attemptParams,
        ),
        query(
          `SELECT u.id, u.first_name, u.last_name, COUNT(xt.id) AS activity_count, MAX(xt.created_at) AS last_active
           FROM xp_transactions xt
           INNER JOIN users u ON u.id = xt.student_id
           INNER JOIN course_enrollments ce ON ce.student_id = u.id
           ${
             hasRosterFilters(rosterFilters)
               ? "INNER JOIN student_profiles sp ON sp.user_id = u.id"
               : ""
           }
           WHERE ${activeFilters.join(" AND ")}
           GROUP BY u.id, u.first_name, u.last_name
           ORDER BY activity_count DESC
           LIMIT 8`,
          activeParams,
        ),
        query(
          `SELECT qq.id, qq.question_text, q.title AS quiz_title,
                COUNT(ans.id) AS answer_count,
                SUM(CASE WHEN ans.is_correct = 0 THEN 1 ELSE 0 END) AS incorrect_count,
                ROUND(100 * SUM(CASE WHEN ans.is_correct = 0 THEN 1 ELSE 0 END) / NULLIF(COUNT(ans.id), 0), 1) AS miss_rate
           FROM quiz_answers ans
           INNER JOIN quiz_questions qq ON qq.id = ans.question_id
           INNER JOIN quizzes q ON q.id = qq.quiz_id
           INNER JOIN quiz_attempts qa ON qa.id = ans.attempt_id
           ${
             hasRosterFilters(rosterFilters)
               ? "INNER JOIN student_profiles sp ON sp.user_id = qa.student_id"
               : ""
           }
           WHERE ${difficultFilters.join(" AND ")}
           GROUP BY qq.id, qq.question_text, q.title
           HAVING answer_count >= 1
           ORDER BY miss_rate DESC, incorrect_count DESC
           LIMIT 8`,
          difficultParams,
        ),
      ]);

    return {
      totalCourses: courses.total,
      totalStudents: studentStats[0].total_students,
      averageProgress: Number(
        Number(studentStats[0].average_progress || 0).toFixed(2),
      ),
      quizStats,
      courses: courses.courses,
      activeStudents,
      difficultQuestions,
      completionRate: Number(
        Number(studentStats[0].average_progress || 0).toFixed(2),
      ),
    };
  },

  async getStudentOverview(studentId) {
    const [
      profileRows,
      courseRows,
      quizRows,
      badgeRows,
      recentXp,
      upcomingQuizzes,
      completedRows,
    ] = await Promise.all([
      query(
        `SELECT * FROM student_profiles WHERE user_id = :studentId LIMIT 1`,
        { studentId },
      ),
      query(
        `SELECT COUNT(*) AS total, AVG(progress_percent) AS average_progress
         FROM course_enrollments WHERE student_id = :studentId`,
        { studentId },
      ),
      query(
        `SELECT COUNT(*) AS attempts,
                AVG(score) AS average_score,
                SUM(CASE WHEN is_passed = 1 THEN 1 ELSE 0 END) AS passed
         FROM quiz_attempts
         WHERE student_id = :studentId AND completed_at IS NOT NULL`,
        { studentId },
      ),
      query(
        `SELECT
           (SELECT COUNT(*) FROM student_badges WHERE student_id = :studentId) AS badges,
           (SELECT COUNT(*) FROM student_medals WHERE student_id = :studentId) AS medals`,
        { studentId },
      ),
      query(
        `SELECT DATE(created_at) AS day, SUM(amount) AS xp
         FROM xp_transactions
         WHERE student_id = :studentId
           AND created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
         GROUP BY DATE(created_at)
         ORDER BY day ASC`,
        { studentId },
      ),
      query(
        `SELECT q.id, q.title, q.passing_score, q.course_id, q.lesson_id, q.due_at,
                c.title AS course_title,
                (
                  SELECT COUNT(*) FROM quiz_attempts qa
                  WHERE qa.quiz_id = q.id
                    AND qa.student_id = :studentId
                    AND qa.completed_at IS NOT NULL
                ) AS attempts_used
         FROM quizzes q
         INNER JOIN courses c ON c.id = q.course_id
         INNER JOIN course_enrollments ce ON ce.course_id = c.id AND ce.student_id = :studentId
         INNER JOIN student_profiles sp ON sp.user_id = :studentId
         WHERE q.is_published = 1
           ${GRADE_MATCH_SQL}
           AND (
             q.due_at IS NULL
             OR q.due_at > NOW()
             OR EXISTS (
               SELECT 1 FROM quiz_student_overrides o
               WHERE o.quiz_id = q.id
                 AND o.student_id = :studentId
                 AND o.extended_due_at IS NOT NULL
                 AND o.extended_due_at > NOW()
             )
           )
           AND NOT EXISTS (
             SELECT 1 FROM quiz_attempts passed
             WHERE passed.student_id = :studentId
               AND passed.quiz_id = q.id
               AND passed.is_passed = 1
               AND passed.completed_at IS NOT NULL
           )
         ORDER BY q.due_at IS NULL, q.due_at ASC, q.created_at DESC
         LIMIT 20`,
        { studentId },
      ),
      query(
        `SELECT COUNT(*) AS total FROM course_enrollments
         WHERE student_id = :studentId AND progress_percent >= 100`,
        { studentId },
      ),
    ]);

    if (!profileRows[0]) {
      throw new AppError("Student profile not found", 404);
    }

    const unlockedUpcoming = [];
    for (const quiz of upcomingQuizzes) {
      const state = await getContentUnlockState({
        courseId: quiz.course_id,
        lessonId: quiz.lesson_id,
        studentId,
      });
      if (state.locked) continue;
      const meta = await studentQuizAccessMeta(
        quiz,
        studentId,
        quiz.attempts_used,
      );
      if (meta.isClosed || meta.outOfAttempts) continue;
      unlockedUpcoming.push({ ...quiz, ...meta });
      if (unlockedUpcoming.length >= 5) break;
    }

    const learningProgress = await this.getStudentLearningProgress(studentId);
    const quickStartTarget = await this.resolveQuickStart(studentId);
    this.sendQuizDueReminders(studentId).catch(() => {});

    return {
      profile: profileRows[0],
      enrolledCourses: courseRows[0].total,
      averageProgress: Number(
        Number(courseRows[0].average_progress || 0).toFixed(2),
      ),
      quizAttempts: quizRows[0].attempts,
      averageQuizScore: Number(
        Number(quizRows[0].average_score || 0).toFixed(2),
      ),
      quizzesPassed: quizRows[0].passed,
      badges: badgeRows[0].badges,
      medals: badgeRows[0].medals,
      xpTrend: recentXp,
      upcomingQuizzes: unlockedUpcoming,
      completedCourses: completedRows[0]?.total || 0,
      quickStart: quickStartTarget,
      learningProgress,
    };
  },

  /**
   * Lesson-based learning progress for grade-matched enrolled subjects.
   */
  async getStudentLearningProgress(studentId) {
    const rows = await query(
      `SELECT
         c.id AS course_id,
         c.title,
         c.subject,
         c.grade_level,
         ce.progress_percent,
         COUNT(l.id) AS total_lessons,
         SUM(CASE WHEN COALESCE(lp.status, 'not_started') = 'completed' THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN lp.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
         SUM(
           CASE
             WHEN l.id IS NOT NULL
              AND (lp.status IS NULL OR lp.status = 'not_started')
             THEN 1 ELSE 0
           END
         ) AS not_started
       FROM course_enrollments ce
       INNER JOIN courses c ON c.id = ce.course_id AND c.is_published = 1
       INNER JOIN student_profiles sp ON sp.user_id = :studentId
       LEFT JOIN lessons l ON l.course_id = c.id AND l.is_published = 1
       LEFT JOIN lesson_progress lp
         ON lp.lesson_id = l.id AND lp.student_id = :studentId
       WHERE ce.student_id = :studentId
         ${GRADE_MATCH_SQL}
       GROUP BY
         c.id, c.title, c.subject, c.grade_level, ce.progress_percent, ce.enrolled_at
       ORDER BY ce.enrolled_at DESC`,
      { studentId },
    );

    const subjects = rows.map((row) => {
      const totalLessons = Number(row.total_lessons || 0);
      const completed = Number(row.completed || 0);
      const inProgress = Number(row.in_progress || 0);
      const notStarted = Number(row.not_started || 0);
      const percent = totalLessons
        ? Number(((completed / totalLessons) * 100).toFixed(0))
        : Number(Number(row.progress_percent || 0).toFixed(0));
      return {
        courseId: Number(row.course_id),
        title: row.title,
        subject: row.subject || row.title,
        gradeLevel: row.grade_level,
        totalLessons,
        completed,
        inProgress,
        notStarted,
        percent,
      };
    });

    const totals = subjects.reduce(
      (acc, item) => {
        acc.totalLessons += item.totalLessons;
        acc.completed += item.completed;
        acc.inProgress += item.inProgress;
        acc.notStarted += item.notStarted;
        return acc;
      },
      { totalLessons: 0, completed: 0, inProgress: 0, notStarted: 0 },
    );

    const overallPercent = totals.totalLessons
      ? Number(((totals.completed / totals.totalLessons) * 100).toFixed(0))
      : 0;

    return {
      ...totals,
      overallPercent,
      subjectCount: subjects.length,
      subjects,
    };
  },

  /**
   * Resume the student's current learning session.
   * Does not send them back to a quiz they already finished answering.
   */
  async resolveQuickStart(studentId, { skipQuizIds = [] } = {}) {
    const skip = new Set(skipQuizIds.map(Number));

    // 1. Mid-quiz only: ignore stale open attempts if that quiz was already submitted.
    const openQuizzes = await query(
      `SELECT q.id, q.title, q.course_id, q.lesson_id, q.due_at, qa.started_at AS activity_at
       FROM quiz_attempts qa
       INNER JOIN quizzes q ON q.id = qa.quiz_id AND q.is_published = 1
       INNER JOIN courses c ON c.id = q.course_id
       INNER JOIN course_enrollments ce
         ON ce.course_id = q.course_id AND ce.student_id = :studentId
       INNER JOIN student_profiles sp ON sp.user_id = :studentId
       WHERE qa.student_id = :studentId
         ${GRADE_MATCH_SQL}
         AND qa.completed_at IS NULL
         AND (
           NOT EXISTS (
             SELECT 1 FROM quiz_attempts done
             WHERE done.student_id = :studentId
               AND done.quiz_id = qa.quiz_id
               AND done.completed_at IS NOT NULL
           )
           OR qa.started_at > (
             SELECT MAX(done.completed_at)
             FROM quiz_attempts done
             WHERE done.student_id = :studentId
               AND done.quiz_id = qa.quiz_id
               AND done.completed_at IS NOT NULL
           )
         )
       ORDER BY qa.started_at DESC
       LIMIT 10`,
      { studentId },
    );
    for (const openQuiz of openQuizzes) {
      if (skip.has(Number(openQuiz.id))) continue;
      const meta = await studentQuizAccessMeta(openQuiz, studentId);
      if (meta.isClosed || meta.outOfAttempts) continue;
      const state = await getContentUnlockState({
        courseId: openQuiz.course_id,
        lessonId: openQuiz.lesson_id,
        studentId,
      });
      if (state.locked) continue;
      return {
        type: "quiz",
        id: Number(openQuiz.id),
        title: openQuiz.title,
        path: `/student/quizzes/${openQuiz.id}`,
        label: "Continue quiz",
      };
    }

    // 2. In-progress lesson on a grade-matched enrolled course.
    const [inProgressLesson] = await query(
      `SELECT l.id, l.title, lp.updated_at AS activity_at
       FROM lesson_progress lp
       INNER JOIN lessons l ON l.id = lp.lesson_id AND l.is_published = 1
       INNER JOIN courses c ON c.id = l.course_id
       INNER JOIN course_enrollments ce
         ON ce.course_id = l.course_id AND ce.student_id = :studentId
       INNER JOIN student_profiles sp ON sp.user_id = :studentId
       WHERE lp.student_id = :studentId
         ${GRADE_MATCH_SQL}
         AND lp.status = 'in_progress'
       ORDER BY lp.updated_at DESC
       LIMIT 1`,
      { studentId },
    );
    if (inProgressLesson) {
      return {
        type: "lesson",
        id: Number(inProgressLesson.id),
        title: inProgressLesson.title,
        path: `/student/lessons/${inProgressLesson.id}`,
        label: "Continue lesson",
      };
    }

    // 3. After last completed lesson → next incomplete lesson in same course.
    const [lastCompletedLesson] = await query(
      `SELECT l.id, l.title, l.course_id, l.order_index,
              lp.completed_at AS activity_at
       FROM lesson_progress lp
       INNER JOIN lessons l ON l.id = lp.lesson_id AND l.is_published = 1
       INNER JOIN courses c ON c.id = l.course_id
       INNER JOIN course_enrollments ce
         ON ce.course_id = l.course_id AND ce.student_id = :studentId
       INNER JOIN student_profiles sp ON sp.user_id = :studentId
       WHERE lp.student_id = :studentId
         ${GRADE_MATCH_SQL}
         AND lp.status = 'completed'
       ORDER BY COALESCE(lp.completed_at, lp.updated_at) DESC
       LIMIT 1`,
      { studentId },
    );

    if (lastCompletedLesson) {
      const [nextLesson] = await query(
        `SELECT l.id, l.title
         FROM lessons l
         LEFT JOIN lesson_progress lp
           ON lp.lesson_id = l.id AND lp.student_id = :studentId
         WHERE l.course_id = :courseId
           AND l.is_published = 1
           AND l.order_index > :orderIndex
           AND (lp.status IS NULL OR lp.status <> 'completed')
         ORDER BY l.order_index ASC, l.id ASC
         LIMIT 1`,
        {
          studentId,
          courseId: lastCompletedLesson.course_id,
          orderIndex: lastCompletedLesson.order_index,
        },
      );
      if (nextLesson) {
        return {
          type: "lesson",
          id: Number(nextLesson.id),
          title: nextLesson.title,
          path: `/student/lessons/${nextLesson.id}`,
          label: "Next lesson",
        };
      }
    }

    // 4. Grade-matched published quizzes not yet passed — unlocked and still open.
    const candidates = await query(
      `SELECT q.id, q.title, q.course_id, q.lesson_id, q.due_at,
              (
                SELECT COUNT(*) FROM quiz_attempts qa
                WHERE qa.quiz_id = q.id
                  AND qa.student_id = :studentId
                  AND qa.completed_at IS NOT NULL
              ) AS attempts_used
       FROM quizzes q
       INNER JOIN courses c ON c.id = q.course_id
       INNER JOIN course_enrollments ce ON ce.course_id = c.id AND ce.student_id = :studentId
       INNER JOIN student_profiles sp ON sp.user_id = :studentId
       WHERE q.is_published = 1
         ${GRADE_MATCH_SQL}
         AND NOT EXISTS (
           SELECT 1 FROM quiz_attempts passed
           WHERE passed.student_id = :studentId
             AND passed.quiz_id = q.id
             AND passed.is_passed = 1
             AND passed.completed_at IS NOT NULL
         )
       ORDER BY q.created_at DESC
       LIMIT 20`,
      { studentId },
    );
    for (const upcoming of candidates) {
      if (skip.has(Number(upcoming.id))) continue;
      const meta = await studentQuizAccessMeta(
        upcoming,
        studentId,
        upcoming.attempts_used,
      );
      if (meta.isClosed || meta.outOfAttempts) continue;
      const state = await getContentUnlockState({
        courseId: upcoming.course_id,
        lessonId: upcoming.lesson_id,
        studentId,
      });
      if (state.locked) continue;
      return {
        type: "quiz",
        id: Number(upcoming.id),
        title: upcoming.title,
        path: `/student/quizzes/${upcoming.id}`,
        label: "Start quiz",
      };
    }

    // 5. Enrolled unfinished grade-matched course.
    const [course] = await query(
      `SELECT c.id, c.title, c.subject
       FROM course_enrollments ce
       INNER JOIN courses c ON c.id = ce.course_id
       INNER JOIN student_profiles sp ON sp.user_id = :studentId
       WHERE ce.student_id = :studentId
         ${GRADE_MATCH_SQL}
         AND ce.progress_percent < 100
       ORDER BY ce.updated_at DESC, ce.enrolled_at DESC
       LIMIT 1`,
      { studentId },
    );
    if (course) {
      return {
        type: "course",
        id: Number(course.id),
        title: course.subject || course.title,
        path: `/student/courses/${course.id}`,
        label: "Continue subject",
      };
    }

    // 6. Browse subjects.
    return {
      type: "browse",
      id: null,
      title: "My Subjects",
      path: "/student/courses",
      label: "Browse subjects",
    };
  },

  async sendQuizDueReminders(studentId) {
    const dueSoon = await query(
      `SELECT q.id, q.title, q.due_at, q.lesson_id, q.course_id, q.created_at,
              (
                SELECT COUNT(*) FROM quiz_attempts qa
                WHERE qa.quiz_id = q.id
                  AND qa.student_id = :studentId
                  AND qa.completed_at IS NOT NULL
              ) AS attempts_used
       FROM quizzes q
       INNER JOIN courses c ON c.id = q.course_id
       INNER JOIN course_enrollments ce
         ON ce.course_id = q.course_id AND ce.student_id = :studentId
       INNER JOIN student_profiles sp ON sp.user_id = :studentId
       WHERE q.is_published = 1
         ${GRADE_MATCH_SQL}
         AND NOT EXISTS (
           SELECT 1 FROM quiz_attempts passed
           WHERE passed.student_id = :studentId
             AND passed.quiz_id = q.id
             AND passed.is_passed = 1
             AND passed.completed_at IS NOT NULL
         )
         AND (
           SELECT COUNT(*) FROM quiz_attempts qa
           WHERE qa.quiz_id = q.id
             AND qa.student_id = :studentId
             AND qa.completed_at IS NOT NULL
         ) < :maxAttempts
       ORDER BY q.due_at IS NULL, q.due_at ASC
       LIMIT 40`,
      {
        studentId,
        maxAttempts: MAX_QUIZ_ATTEMPTS + MAX_EXTRA_ATTEMPTS_GRANT,
      },
    );

    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    for (const quiz of dueSoon) {
      const meta = await studentQuizAccessMeta(
        quiz,
        studentId,
        quiz.attempts_used,
      );
      if (meta.isClosed || meta.outOfAttempts || !meta.dueAt) continue;
      const dueMs = new Date(meta.dueAt).getTime();
      if (Number.isNaN(dueMs) || dueMs <= now || dueMs - now > threeDaysMs) {
        continue;
      }

      const state = await getContentUnlockState({
        courseId: quiz.course_id,
        lessonId: quiz.lesson_id,
        studentId,
      });
      if (state.locked) continue;

      const link = `/student/quizzes/${quiz.id}`;
      const already = await NotificationModel.hasRecentLink(studentId, link, {
        withinDays: 3,
      });
      if (already) continue;

      const dueLabel = new Date(meta.dueAt).toLocaleString();
      await NotificationModel.create({
        userId: studentId,
        title: "Quiz due soon",
        message: `Quiz due soon: ${quiz.title} — due ${dueLabel}`,
        type: "reminder",
        link,
      });
    }
  },
};

export default AnalyticsService;
