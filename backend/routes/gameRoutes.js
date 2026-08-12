import { Router } from 'express';
import GameController from '../controllers/GameController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  createGameValidation,
  generateGameValidation,
  submitGameScoreValidation,
} from '../validations/gameValidation.js';
import { aiRateLimiter } from '../middleware/rateLimitMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/scores/mine', authorize('student'), GameController.myScores);
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

export default router;
