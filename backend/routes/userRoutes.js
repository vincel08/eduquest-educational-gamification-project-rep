import { Router } from 'express';
import UserController from '../controllers/UserController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { setStudentPasswordValidation } from '../validations/authValidation.js';

const router = Router();

router.use(authenticate, authorize('administrator'));

router.post(
  '/:id/set-password',
  setStudentPasswordValidation,
  validate,
  UserController.setPassword
);
router.get('/', UserController.list);
router.get('/:id', UserController.getById);
router.post('/', UserController.create);
router.put('/:id', UserController.update);
router.delete('/:id', UserController.remove);

export default router;
