import { Router } from 'express';
import AuthController from '../controllers/AuthController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { avatarUpload } from '../middleware/uploadMiddleware.js';
import { loginValidation, registerValidation } from '../validations/authValidation.js';

const router = Router();

router.post('/register', registerValidation, validate, AuthController.register);
router.post('/login', loginValidation, validate, AuthController.login);
router.get('/me', authenticate, AuthController.me);
router.put('/profile', authenticate, AuthController.updateProfile);
router.post(
  '/avatar',
  authenticate,
  avatarUpload.single('avatar'),
  AuthController.uploadAvatar
);
router.delete('/avatar', authenticate, AuthController.removeAvatar);

export default router;
