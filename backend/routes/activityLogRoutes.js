import { Router } from 'express';
import ActivityLogController from '../controllers/ActivityLogController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);
router.get('/', authorize('administrator'), ActivityLogController.list);

export default router;
