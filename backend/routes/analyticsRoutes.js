import { Router } from 'express';
import AnalyticsController from '../controllers/AnalyticsController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/admin', authorize('administrator'), AnalyticsController.admin);
router.get('/teacher', authorize('teacher'), AnalyticsController.teacher);
router.get('/student', authorize('student'), AnalyticsController.student);

export default router;
