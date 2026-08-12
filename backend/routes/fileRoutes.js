import { Router } from 'express';
import FileController from '../controllers/FileController.js';
import { authenticateFileAccess } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateFileAccess);

router.get('/materials/:materialId', FileController.material);
router.get('/questions/:questionId/image', FileController.questionImage);
router.get('/avatars/:userId', FileController.avatar);
router.get('/ai-sources/:generationId', FileController.aiSource);

export default router;
