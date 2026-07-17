import { Router } from 'express';
import AiContentController from '../controllers/AiContentController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { documentUpload } from '../middleware/uploadMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  generateAiContentValidation,
  saveAiContentValidation,
} from '../validations/aiContentValidation.js';

const router = Router();

router.use(authenticate);
router.use(authorize('teacher', 'administrator'));

router.post(
  '/extract',
  documentUpload.single('file'),
  AiContentController.extract
);

router.post(
  '/generate',
  generateAiContentValidation,
  validate,
  AiContentController.generate
);

router.post(
  '/save',
  saveAiContentValidation,
  validate,
  AiContentController.save
);

export default router;
