import { Router } from 'express';
import QuizController from '../controllers/QuizController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import {
  createQuizValidation,
  generateQuizValidation,
  submitQuizValidation,
  attachQuestionImageValidation,
} from '../validations/quizValidation.js';

const router = Router();

router.use(authenticate);

router.get('/attempts/mine', authorize('student'), QuizController.myAttempts);
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
  generateQuizValidation,
  validate,
  QuizController.generate
);
router.post('/hints', authorize('student'), QuizController.hint);
router.post(
  '/questions/:questionId/image',
  authorize('teacher', 'administrator'),
  upload.single('image'),
  attachQuestionImageValidation,
  validate,
  QuizController.attachImage
);
router.get('/:id', QuizController.getById);
router.put('/:id', authorize('teacher', 'administrator'), QuizController.update);
router.delete('/:id', authorize('teacher', 'administrator'), QuizController.remove);
router.post('/:id/questions', authorize('teacher', 'administrator'), QuizController.addQuestion);
router.post('/:id/start', authorize('student'), QuizController.start);
router.post(
  '/attempts/:attemptId/submit',
  authorize('student'),
  submitQuizValidation,
  validate,
  QuizController.submit
);

export default router;
