import { query } from '../config/db.js';
import CourseModel from '../models/CourseModel.js';
import AppError from '../utils/AppError.js';

const AnalyticsService = {
  async getAdminOverview() {
    const [users, courses, quizzes, attempts, avgXp] = await Promise.all([
      query(`SELECT role, COUNT(*) AS count FROM users GROUP BY role`),
      query(`SELECT COUNT(*) AS total FROM courses`),
      query(`SELECT COUNT(*) AS total FROM quizzes`),
      query(`SELECT COUNT(*) AS total, AVG(score) AS average_score FROM quiz_attempts WHERE completed_at IS NOT NULL`),
      query(`SELECT AVG(xp) AS average_xp, AVG(level) AS average_level FROM student_profiles`),
    ]);

    const engagement = await query(
      `SELECT DATE(created_at) AS day, COUNT(*) AS activity_count
       FROM xp_transactions
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
       GROUP BY DATE(created_at)
       ORDER BY day ASC`
    );

    const topStudents = await query(
      `SELECT u.first_name, u.last_name, sp.xp, sp.level
       FROM student_profiles sp
       INNER JOIN users u ON u.id = sp.user_id
       ORDER BY sp.xp DESC
       LIMIT 5`
    );

    return {
      usersByRole: users,
      totalCourses: courses[0].total,
      totalQuizzes: quizzes[0].total,
      quizAttempts: attempts[0].total,
      averageQuizScore: Number(Number(attempts[0].average_score || 0).toFixed(2)),
      averageXp: Number(Number(avgXp[0].average_xp || 0).toFixed(2)),
      averageLevel: Number(Number(avgXp[0].average_level || 0).toFixed(2)),
      engagement,
      topStudents,
    };
  },

  async getTeacherOverview(teacherId) {
    const courses = await CourseModel.findAll({ teacherId, limit: 100, page: 1 });
    const courseIds = courses.courses.map((course) => course.id);

    if (!courseIds.length) {
      return {
        totalCourses: 0,
        totalStudents: 0,
        averageProgress: 0,
        quizStats: [],
        courses: [],
      };
    }

    const placeholders = courseIds.map((_, index) => `:id${index}`).join(', ');
    const params = {};
    courseIds.forEach((id, index) => {
      params[`id${index}`] = id;
    });

    const [studentStats, quizStats, activeStudents, difficultQuestions] = await Promise.all([
      query(
        `SELECT COUNT(DISTINCT student_id) AS total_students,
                AVG(progress_percent) AS average_progress
         FROM course_enrollments
         WHERE course_id IN (${placeholders})`,
        params
      ),
      query(
        `SELECT q.id, q.title, COUNT(qa.id) AS attempts, AVG(qa.score) AS average_score,
                SUM(CASE WHEN qa.is_passed = 1 THEN 1 ELSE 0 END) AS passed_count
         FROM quizzes q
         LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.completed_at IS NOT NULL
         WHERE q.course_id IN (${placeholders})
         GROUP BY q.id, q.title
         ORDER BY attempts DESC`,
        params
      ),
      query(
        `SELECT u.id, u.first_name, u.last_name, COUNT(xt.id) AS activity_count, MAX(xt.created_at) AS last_active
         FROM xp_transactions xt
         INNER JOIN users u ON u.id = xt.student_id
         INNER JOIN course_enrollments ce ON ce.student_id = u.id AND ce.course_id IN (${placeholders})
         WHERE xt.created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
         GROUP BY u.id, u.first_name, u.last_name
         ORDER BY activity_count DESC
         LIMIT 8`,
        params
      ),
      query(
        `SELECT qq.id, qq.question_text, q.title AS quiz_title,
                COUNT(ans.id) AS answer_count,
                SUM(CASE WHEN ans.is_correct = 0 THEN 1 ELSE 0 END) AS incorrect_count,
                ROUND(100 * SUM(CASE WHEN ans.is_correct = 0 THEN 1 ELSE 0 END) / NULLIF(COUNT(ans.id), 0), 1) AS miss_rate
         FROM quiz_answers ans
         INNER JOIN quiz_questions qq ON qq.id = ans.question_id
         INNER JOIN quizzes q ON q.id = qq.quiz_id
         WHERE q.course_id IN (${placeholders})
         GROUP BY qq.id, qq.question_text, q.title
         HAVING answer_count >= 1
         ORDER BY miss_rate DESC, incorrect_count DESC
         LIMIT 8`,
        params
      ),
    ]);

    return {
      totalCourses: courses.total,
      totalStudents: studentStats[0].total_students,
      averageProgress: Number(Number(studentStats[0].average_progress || 0).toFixed(2)),
      quizStats,
      courses: courses.courses,
      activeStudents,
      difficultQuestions,
      completionRate: Number(Number(studentStats[0].average_progress || 0).toFixed(2)),
    };
  },

  async getStudentOverview(studentId) {
    const [profileRows, courseRows, quizRows, badgeRows, recentXp, upcomingQuizzes, completedRows] = await Promise.all([
      query(
        `SELECT * FROM student_profiles WHERE user_id = :studentId LIMIT 1`,
        { studentId }
      ),
      query(
        `SELECT COUNT(*) AS total, AVG(progress_percent) AS average_progress
         FROM course_enrollments WHERE student_id = :studentId`,
        { studentId }
      ),
      query(
        `SELECT COUNT(*) AS attempts,
                AVG(score) AS average_score,
                SUM(CASE WHEN is_passed = 1 THEN 1 ELSE 0 END) AS passed
         FROM quiz_attempts
         WHERE student_id = :studentId AND completed_at IS NOT NULL`,
        { studentId }
      ),
      query(
        `SELECT
           (SELECT COUNT(*) FROM student_badges WHERE student_id = :studentId) AS badges,
           (SELECT COUNT(*) FROM student_medals WHERE student_id = :studentId) AS medals,
           (SELECT COUNT(*) FROM student_certificates WHERE student_id = :studentId) AS certificates`,
        { studentId }
      ),
      query(
        `SELECT DATE(created_at) AS day, SUM(amount) AS xp
         FROM xp_transactions
         WHERE student_id = :studentId
           AND created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
         GROUP BY DATE(created_at)
         ORDER BY day ASC`,
        { studentId }
      ),
      query(
        `SELECT q.id, q.title, q.passing_score, c.title AS course_title
         FROM quizzes q
         INNER JOIN courses c ON c.id = q.course_id
         INNER JOIN course_enrollments ce ON ce.course_id = c.id AND ce.student_id = :studentId
         WHERE q.is_published = 1
           AND q.id NOT IN (
             SELECT quiz_id FROM quiz_attempts
             WHERE student_id = :studentId AND is_passed = 1
           )
         ORDER BY q.created_at DESC
         LIMIT 5`,
        { studentId }
      ),
      query(
        `SELECT COUNT(*) AS total FROM course_enrollments
         WHERE student_id = :studentId AND progress_percent >= 100`,
        { studentId }
      ),
    ]);

    if (!profileRows[0]) {
      throw new AppError('Student profile not found', 404);
    }

    return {
      profile: profileRows[0],
      enrolledCourses: courseRows[0].total,
      averageProgress: Number(Number(courseRows[0].average_progress || 0).toFixed(2)),
      quizAttempts: quizRows[0].attempts,
      averageQuizScore: Number(Number(quizRows[0].average_score || 0).toFixed(2)),
      quizzesPassed: quizRows[0].passed,
      badges: badgeRows[0].badges,
      medals: badgeRows[0].medals,
      certificates: badgeRows[0].certificates,
      xpTrend: recentXp,
      upcomingQuizzes,
      completedCourses: completedRows[0]?.total || 0,
    };
  },
};

export default AnalyticsService;
