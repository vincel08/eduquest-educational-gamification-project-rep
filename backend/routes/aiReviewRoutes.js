import { Router } from 'express';
import AiReviewController from '../controllers/AiReviewController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);
router.use(authorize('teacher', 'administrator'));

router.get('/drafts', AiReviewController.list);
router.get('/drafts/:id', AiReviewController.getById);
router.post('/from-quiz', AiReviewController.createFromQuiz);
router.post('/from-game', AiReviewController.createFromGame);
router.post('/from-content', AiReviewController.createFromContent);
router.put('/drafts/:id', AiReviewController.update);
router.post('/drafts/:id/save-draft', AiReviewController.saveDraft);
router.post('/drafts/:id/publish', AiReviewController.publish);
router.delete('/drafts/:id', AiReviewController.discard);
router.post('/drafts/:id/regenerate', AiReviewController.regenerate);
router.post('/drafts/:id/transform', AiReviewController.transform);

export default router;
