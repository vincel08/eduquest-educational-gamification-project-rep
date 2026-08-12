import CourseModel from '../models/CourseModel.js';
import LessonModel from '../models/LessonModel.js';
import QuizModel from '../models/QuizModel.js';
import GamificationModel from '../models/GamificationModel.js';
import AppError from '../utils/AppError.js';

/**
 * Server-side certificate eligibility for a course-linked certificate template.
 * Games are intentionally excluded from requirements.
 */
const CertificateEligibilityService = {
  async getPublishedLessons(courseId) {
    const lessons = await LessonModel.findByCourse(courseId, { publishedOnly: true });
    return lessons || [];
  },

  async getPublishedQuizzes(courseId) {
    const quizzes = await QuizModel.findByCourse(courseId, { publishedOnly: true });
    return quizzes || [];
  },

  async evaluateCourseEligibility(courseId, studentId) {
    if (!courseId) {
      throw new AppError('Certificate is not linked to a course', 400);
    }

    const course = await CourseModel.findById(courseId);
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    const enrolled = await CourseModel.isEnrolled(courseId, studentId);
    const lessons = await this.getPublishedLessons(courseId);
    const quizzes = await this.getPublishedQuizzes(courseId);

    const lessonStatuses = [];
    let lessonsCompleted = 0;
    for (const lesson of lessons) {
      const progress = await LessonModel.getProgress(lesson.id, studentId);
      const completed = progress?.status === 'completed';
      if (completed) lessonsCompleted += 1;
      lessonStatuses.push({
        id: lesson.id,
        title: lesson.title,
        completed,
      });
    }

    const quizStatuses = [];
    let quizzesPassed = 0;
    for (const quiz of quizzes) {
      const passed = await QuizModel.hasPassedQuiz(studentId, quiz.id);
      if (passed) quizzesPassed += 1;
      quizStatuses.push({
        id: quiz.id,
        title: quiz.title,
        passingScore: quiz.passing_score,
        passed,
      });
    }

    // Empty courses (0 published lessons) are never certificate-eligible.
    const hasRequiredLessons = lessons.length > 0;
    const lessonsComplete = hasRequiredLessons && lessonsCompleted === lessons.length;
    const quizzesComplete = quizzes.length === 0 ? true : quizzesPassed === quizzes.length;

    const existing = await GamificationModel.findStudentCertificateByCourse(courseId, studentId);

    const missing = [];
    if (!enrolled) missing.push('enrollment');
    if (!hasRequiredLessons || !lessonsComplete) missing.push('lessons');
    if (!quizzesComplete) missing.push('quizzes');

    const eligible = enrolled
      && hasRequiredLessons
      && lessonsComplete
      && quizzesComplete
      && !existing;

    return {
      courseId: Number(courseId),
      courseTitle: course.title,
      enrolled,
      eligible,
      alreadyIssued: Boolean(existing),
      existingCertificate: existing || null,
      lessons: {
        required: lessons.length,
        completed: lessonsCompleted,
        complete: lessonsComplete,
        items: lessonStatuses,
      },
      quizzes: {
        required: quizzes.length,
        passed: quizzesPassed,
        complete: quizzesComplete,
        items: quizStatuses,
      },
      gamesRequired: false,
      missing,
    };
  },

  assertEligible(eligibility) {
    if (eligibility.alreadyIssued) {
      return;
    }
    if (!eligibility.enrolled) {
      throw new AppError('Student is not enrolled in this course', 403);
    }
    if (!eligibility.lessons.required || eligibility.lessons.required < 1) {
      throw new AppError(
        'Course must include at least one published lesson before a certificate can be earned',
        400
      );
    }
    if (!eligibility.lessons.complete) {
      throw new AppError(
        `Complete all required lessons (${eligibility.lessons.completed}/${eligibility.lessons.required}) before earning a certificate`,
        400
      );
    }
    if (!eligibility.quizzes.complete) {
      throw new AppError(
        `Pass all required quizzes (${eligibility.quizzes.passed}/${eligibility.quizzes.required}) before earning a certificate`,
        400
      );
    }
    if (!eligibility.eligible) {
      throw new AppError('Certificate requirements are not met', 400);
    }
  },
};

export default CertificateEligibilityService;
