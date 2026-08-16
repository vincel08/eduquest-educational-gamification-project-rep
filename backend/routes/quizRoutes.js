import { Router } from 'express';
import QuizController from '../controllers/QuizController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import {
  createQuizValidation,
  updateQuizValidation,
  generateQuizValidation,
  submitQuizValidation,
  attachQuestionImageValidation,
  questionBodyValidation,
  replaceQuestionsValidation,
  reorderQuestionsValidation,
} from '../validations/quizValidation.js';
import { aiRateLimiter } from '../middleware/rateLimitMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/attempts/mine', authorize('student'), QuizController.myAttempts);
router.get('/mine', authorize('teacher', 'administrator'), QuizController.listMine);
router.post(
  '/',
  authorize('teacher', 'administrator'),
  createQuizValidation,
  validate,
  QuizController.create
);
router.post(
  '/generate',
  authorize('teacher', 'administrator'),
  aiRateLimiter,
  generateQuizValidation,
  validate,
  QuizController.generate
);
router.post('/hints', authorize('student'), aiRateLimiter, QuizController.hint);
router.post(
  '/questions/:questionId/image',
  authorize('teacher', 'administrator'),
  upload.single('image'),
  attachQuestionImageValidation,
  validate,
  QuizController.attachImage
);
router.get('/:id/preview', authorize('teacher', 'administrator'), QuizController.preview);
router.get(
  '/:id/attempts/:attemptId',
  authorize('teacher', 'administrator'),
  QuizController.attemptReview
);
router.get('/:id', QuizController.getById);
router.put(
  '/:id',
  authorize('teacher', 'administrator'),
  updateQuizValidation,
  validate,
  QuizController.update
);
router.post('/:id/publish', authorize('teacher', 'administrator'), QuizController.publish);
router.post('/:id/unpublish', authorize('teacher', 'administrator'), QuizController.unpublish);
router.delete('/:id', authorize('teacher', 'administrator'), QuizController.remove);
router.put(
  '/:id/questions',
  authorize('teacher', 'administrator'),
  replaceQuestionsValidation,
  validate,
  QuizController.replaceQuestions
);
router.put(
  '/:id/questions/reorder',
  authorize('teacher', 'administrator'),
  reorderQuestionsValidation,
  validate,
  QuizController.reorderQuestions
);
router.post(
  '/:id/questions',
  authorize('teacher', 'administrator'),
  questionBodyValidation,
  validate,
  QuizController.addQuestion
);
router.put(
  '/:id/questions/:questionId',
  authorize('teacher', 'administrator'),
  questionBodyValidation,
  validate,
  QuizController.updateQuestion
);
router.delete(
  '/:id/questions/:questionId',
  authorize('teacher', 'administrator'),
  QuizController.deleteQuestion
);
router.post('/:id/start', authorize('student'), QuizController.start);
router.post(
  '/attempts/:attemptId/submit',
  authorize('student'),
  submitQuizValidation,
  validate,
  QuizController.submit
);

export default router;
