import { Router } from 'express';
import AiReviewController from '../controllers/AiReviewController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { aiRateLimiter } from '../middleware/rateLimitMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  createFromContentReviewValidation,
  createFromGameReviewValidation,
  createFromQuizReviewValidation,
  regenerateReviewValidation,
} from '../validations/aiReviewValidation.js';

const router = Router();

router.use(authenticate);
router.use(authorize('teacher', 'administrator'));
router.use(aiRateLimiter);

router.get('/drafts', AiReviewController.list);
router.get('/drafts/:id', AiReviewController.getById);
router.post(
  '/from-quiz',
  createFromQuizReviewValidation,
  validate,
  AiReviewController.createFromQuiz
);
router.post(
  '/from-game',
  createFromGameReviewValidation,
  validate,
  AiReviewController.createFromGame
);
router.post(
  '/from-content',
  createFromContentReviewValidation,
  validate,
  AiReviewController.createFromContent
);
router.put('/drafts/:id', AiReviewController.update);
router.post('/drafts/:id/save-draft', AiReviewController.saveDraft);
router.post('/drafts/:id/publish', AiReviewController.publish);
router.delete('/drafts/:id', AiReviewController.discard);
router.post(
  '/drafts/:id/regenerate',
  regenerateReviewValidation,
  validate,
  AiReviewController.regenerate
);
router.post('/drafts/:id/transform', AiReviewController.transform);

export default router;
