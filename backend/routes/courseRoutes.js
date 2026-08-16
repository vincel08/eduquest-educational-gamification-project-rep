import { Router } from 'express';
import CourseController from '../controllers/CourseController.js';
import LessonController from '../controllers/LessonController.js';
import QuizController from '../controllers/QuizController.js';
import GameController from '../controllers/GameController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  createCourseValidation,
  updateCourseValidation,
  gradebookQuizScoreValidation,
  gradebookGameScoreValidation,
} from '../validations/courseValidation.js';

const router = Router();

router.use(authenticate);

router.get('/mine/enrolled', authorize('student'), CourseController.myCourses);
router.get('/', CourseController.list);
router.get('/:id', CourseController.getById);
router.post(
  '/',
  authorize('teacher', 'administrator'),
  createCourseValidation,
  validate,
  CourseController.create
);
router.put(
  '/:id',
  authorize('teacher', 'administrator'),
  updateCourseValidation,
  validate,
  CourseController.update
);
router.delete('/:id', authorize('teacher', 'administrator'), CourseController.remove);
router.post('/:id/enroll', authorize('student'), CourseController.enroll);
router.get(
  '/:id/enrollments',
  authorize('teacher', 'administrator'),
  CourseController.enrollments
);
router.get(
  '/:id/gradebook',
  authorize('teacher', 'administrator'),
  CourseController.gradebook
);
router.put(
  '/:id/gradebook/quizzes/:quizId/students/:studentId',
  authorize('teacher', 'administrator'),
  gradebookQuizScoreValidation,
  validate,
  CourseController.updateQuizGrade
);
router.put(
  '/:id/gradebook/games/:gameId/students/:studentId',
  authorize('teacher', 'administrator'),
  gradebookGameScoreValidation,
  validate,
  CourseController.updateGameGrade
);

router.get('/:courseId/lessons', LessonController.listByCourse);
router.post(
  '/:courseId/lessons',
  authorize('teacher', 'administrator'),
  LessonController.create
);

router.get('/:courseId/quizzes', QuizController.listByCourse);
router.get('/:courseId/games', GameController.listByCourse);

export default router;
