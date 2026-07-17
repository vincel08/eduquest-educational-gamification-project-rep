import { Router } from 'express';
import LessonController from '../controllers/LessonController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/:id', LessonController.getById);
router.put('/:id', authorize('teacher', 'administrator'), LessonController.update);
router.delete('/:id', authorize('teacher', 'administrator'), LessonController.remove);
router.post('/:id/complete', authorize('student'), LessonController.complete);
router.post(
  '/:id/materials',
  authorize('teacher', 'administrator'),
  upload.single('file'),
  LessonController.uploadMaterial
);
router.delete(
  '/materials/:materialId',
  authorize('teacher', 'administrator'),
  LessonController.deleteMaterial
);

export default router;
