import { Router } from 'express';
import AuthController from '../controllers/AuthController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { avatarUpload } from '../middleware/uploadMiddleware.js';
import { authRateLimiter } from '../middleware/rateLimitMiddleware.js';
import {
  forgotPasswordValidation,
  loginValidation,
  registerValidation,
  resetPasswordValidation,
} from '../validations/authValidation.js';

const router = Router();

router.post(
  '/register',
  authRateLimiter,
  registerValidation,
  validate,
  AuthController.register
);
router.post(
  '/login',
  authRateLimiter,
  loginValidation,
  validate,
  AuthController.login
);
router.post(
  '/forgot-password',
  authRateLimiter,
  forgotPasswordValidation,
  validate,
  AuthController.forgotPassword
);
router.post(
  '/reset-password',
  authRateLimiter,
  resetPasswordValidation,
  validate,
  AuthController.resetPassword
);
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
