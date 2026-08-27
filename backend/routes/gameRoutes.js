import { Router } from 'express';
import GameController from '../controllers/GameController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  createGameValidation,
  generateGameValidation,
  grantGameOverrideValidation,
  submitGameScoreValidation,
  copyGameValidation,
} from '../validations/gameValidation.js';
import { aiRateLimiter } from '../middleware/rateLimitMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/scores/mine', authorize('student'), GameController.myScores);
router.get(
  '/mine',
  authorize('teacher', 'administrator'),
  GameController.listMine,
);
router.post(
  '/',
  authorize('teacher', 'administrator'),
  createGameValidation,
  validate,
  GameController.create
);
router.post(
  '/generate',
  authorize('teacher', 'administrator'),
  aiRateLimiter,
  generateGameValidation,
  validate,
  GameController.generate
);
router.post(
  '/:id/copy',
  authorize('teacher', 'administrator'),
  copyGameValidation,
  validate,
  GameController.copy,
);
router.get(
  '/:id/scores/:scoreId',
  authorize('teacher', 'administrator'),
  GameController.scoreReview,
);
router.get(
  '/:id/overrides',
  authorize('teacher', 'administrator'),
  GameController.listOverrides,
);
router.post(
  '/:id/overrides',
  authorize('teacher', 'administrator'),
  grantGameOverrideValidation,
  validate,
  GameController.grantOverride,
);
router.delete(
  '/:id/overrides/:studentId',
  authorize('teacher', 'administrator'),
  GameController.removeOverride,
);
router.get('/:id', GameController.getById);
router.put('/:id', authorize('teacher', 'administrator'), GameController.update);
router.delete('/:id', authorize('teacher', 'administrator'), GameController.remove);
router.post(
  '/:id/scores',
  authorize('student'),
  submitGameScoreValidation,
  validate,
  GameController.submitScore
);
router.post(
  '/:id/release-grade',
  authorize('student'),
  GameController.releaseGrade,
);

export default router;
